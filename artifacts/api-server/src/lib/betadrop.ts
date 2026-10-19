import { pool, type PoolClient } from "@workspace/db";
import { createHash, randomUUID } from "node:crypto";
import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { logger } from "./logger";
import { deliver } from "./webhooks";

// Error messages are Russian source strings: the web client translates them
// through its locale dictionaries (see artifacts/betadrop/src/lib/locales).
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function check(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
export const hashCode = (value: string) => createHash("sha256").update(value).digest("hex");
export function httpUrl(value: string) {
  try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol); } catch { return false; }
}

export const DAY = 24 * 3600000;
export const EXECUTION_WINDOW = 2 * DAY; // 48h to submit a report after approval
export const REVIEW_WINDOW = 3 * DAY; // 72h for the founder, then the report is approved automatically
export const HIGH_VALUE_REWARD = 50; // rewards above $50 require Trust Score 80+
export const HIGH_VALUE_TRUST = 80;
export const TRUST = { start: 50, report: 2, videoReport: 5, rejected: -10, missedDeadline: -10 } as const;
export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7; // one streak freeze earned per 7 active days in a row

export type Client = PoolClient;
export async function transaction<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize slot and reward transitions across processes.
    await client.query("SELECT pg_advisory_xact_lock(791300)");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
export async function identity(req: Request) {
  const id = getAuth(req).userId;
  check(id, "Войдите в аккаунт", 401);
  await pool.query("INSERT INTO bd_profiles(id,username) VALUES($1,$2) ON CONFLICT(id) DO NOTHING", [id, `dev_${randomUUID().replaceAll("-", "").slice(0, 16)}`]);
  return id;
}
// Activity detail holds only the subject (campaign title); the event type carries the meaning.
export async function event(client: Client, userId: string | null, type: string, detail: string) {
  await client.query("INSERT INTO bd_activity(user_id,event,detail) VALUES($1,$2,$3)", [userId, type, detail]);
}
export const campaignSelect = `SELECT id,owner_id AS "ownerId",title,company,logo_url AS "logoUrl",description,category,tags,reward,reward_value AS "rewardValue",method,slots,filled_slots AS "filledSlots",status,instructions,product_url AS "productUrl",screening_questions AS "screeningQuestions",min_trust AS "minTrust",auto_approve AS "autoApprove",auto_approve_trust AS "autoApproveTrust",featured,demo,created_at::text AS "createdAt" FROM bd_campaigns`;
export const applicationSelect = `SELECT a.id,a.campaign_id AS "campaignId",c.title AS "campaignTitle",a.user_id AS "userId",p.username,p.trust_score AS "trustScore",a.answers,a.status,a.created_at::text AS "createdAt",a.deadline::text AS deadline,a.verified_at::text AS "verifiedAt",CASE WHEN a.status IN ('approved','submitted','completed') THEN c.product_url || CASE WHEN c.product_url LIKE '%?%' THEN '&' ELSE '?' END || 'betadrop_id=' || a.user_id ELSE '' END AS "productUrl",c.method,c.reward FROM bd_applications a JOIN bd_campaigns c ON a.campaign_id=c.id JOIN bd_profiles p ON a.user_id=p.id`;
export const submissionSelect = `SELECT s.id,s.application_id AS "applicationId",c.id AS "campaignId",c.title AS "campaignTitle",p.username,s.title,s.content,s.media_url AS "mediaUrl",s.account_email AS "accountEmail",s.severity,s.status,s.reason,s.created_at::text AS "createdAt",s.review_deadline::text AS "reviewDeadline" FROM bd_submissions s JOIN bd_applications a ON s.application_id=a.id JOIN bd_campaigns c ON c.id=a.campaign_id JOIN bd_profiles p ON p.id=a.user_id`;
export const rewardSelect = `SELECT id,campaign_title AS "campaignTitle",title,CASE WHEN claimed THEN code ELSE NULL END AS code,claimed,created_at::text AS "createdAt" FROM bd_rewards`;

export async function approveReport(client: Client, id: number) {
  const { rows: [s] } = await client.query(`SELECT s.status,s.media_url,a.user_id,a.id AS application_id,c.id AS campaign_id,c.owner_id,c.title,c.reward,c.reward_codes FROM bd_submissions s JOIN bd_applications a ON a.id=s.application_id JOIN bd_campaigns c ON c.id=a.campaign_id WHERE s.id=$1`, [id]);
  check(s, "Отчёт не найден", 404);
  check(s.status === "pending", "Отчёт уже рассмотрен", 409);
  check(s.reward_codes.length, "Пул наград исчерпан; обратитесь к владельцу кампании", 409);
  await client.query("INSERT INTO bd_rewards(submission_id,user_id,campaign_title,title,code) VALUES($1,$2,$3,$4,$5)", [id, s.user_id, s.title, s.reward, s.reward_codes[0]]);
  await client.query("UPDATE bd_campaigns SET reward_codes=$2 WHERE id=$1", [s.campaign_id, s.reward_codes.slice(1)]);
  await client.query("UPDATE bd_submissions SET status='approved' WHERE id=$1", [id]);
  await client.query("UPDATE bd_applications SET status='completed' WHERE id=$1", [s.application_id]);
  await client.query("UPDATE bd_profiles SET trust_score=LEAST(100,trust_score+$2),xp=xp+100 WHERE id=$1", [s.user_id, s.media_url ? TRUST.videoReport : TRUST.report]);
  await event(client, s.user_id, "submission_verified", `${s.title} → ${s.reward}`);
  return { ownerId: s.owner_id as string, campaignId: s.campaign_id as number, title: s.title as string };
}

let sweeping = false;
export async function processDeadlines() {
  if (sweeping) return;
  sweeping = true;
  const approved: { ownerId: string; campaignId: number; id: number }[] = [];
  try {
    await transaction(async client => {
      const expired = await client.query("UPDATE bd_applications SET status='expired' WHERE status='approved' AND deadline<NOW() RETURNING user_id,campaign_id");
      for (const row of expired.rows) {
        await client.query("UPDATE bd_profiles SET trust_score=GREATEST(0,trust_score+$2) WHERE id=$1", [row.user_id, TRUST.missedDeadline]);
        await client.query("UPDATE bd_campaigns SET filled_slots=GREATEST(0,filled_slots-1) WHERE id=$1", [row.campaign_id]);
      }
      const due = await client.query("SELECT id FROM bd_submissions WHERE status='pending' AND review_deadline<NOW() ORDER BY id");
      // A savepoint per report keeps one broken report from blocking every other deadline.
      for (const row of due.rows) {
        await client.query("SAVEPOINT auto_approve");
        try {
          const done = await approveReport(client, row.id);
          await client.query("RELEASE SAVEPOINT auto_approve");
          approved.push({ ...done, id: row.id });
        }
        catch (err) { await client.query("ROLLBACK TO SAVEPOINT auto_approve"); logger.warn({ err, submission: row.id }, "Auto-approve skipped"); }
      }
    });
    for (const a of approved) void deliver(a.ownerId, "submission.approved", { submissionId: a.id, campaignId: a.campaignId, automatic: true });
  } catch (err) { logger.error({ err }, "Deadline processing failed"); }
  finally { sweeping = false; }
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// Replays the last year of activity day by day (UTC). An active day extends the streak and
// every FREEZE_EVERY days in a row earns a freeze (max MAX_FREEZES). A missed day spends a
// freeze if one is available, otherwise the streak resets. Today never breaks a streak.
export function streakFrom(activeDays: Set<string>, today = new Date()) {
  const day = new Date(today); day.setUTCHours(0, 0, 0, 0);
  const cursor = new Date(day); cursor.setUTCDate(cursor.getUTCDate() - 364);
  let streak = 0, maxStreak = 0, freezes = 0, run = 0;
  for (; cursor <= day; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (activeDays.has(isoDay(cursor))) {
      streak++; run++;
      maxStreak = Math.max(maxStreak, streak);
      if (run % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    } else if (cursor.getTime() !== day.getTime()) {
      run = 0;
      if (streak > 0 && freezes > 0) freezes--;
      else { streak = 0; freezes = 0; }
    }
  }
  return { streak, maxStreak, freezes };
}

export function badgesFor(approved: number, video: number, maxStreak: number) {
  const badges: string[] = [];
  if (approved > 0) badges.push("FIRST_DROP");
  if (approved >= 5) badges.push(`BUG_HUNTER_L${approved >= 100 ? 3 : approved >= 25 ? 2 : 1}`);
  if (video >= 10) badges.push("DEEP_AUDITOR");
  if (maxStreak >= 30) badges.push("STREAK_30");
  if (maxStreak >= 100) badges.push("STREAK_100");
  return badges;
}

export async function profileFor(id: string) {
  const { rows: [profile] } = await pool.query(`SELECT p.id,p.username,p.bio,p.stack,p.os,p.trust_score AS "trustScore",p.xp,p.created_at::text AS "createdAt" FROM bd_profiles p WHERE p.id=$1`, [id]);
  check(profile, "Профиль не найден", 404);
  const { rows: contributions } = await pool.query(`SELECT (created_at AT TIME ZONE 'UTC')::date::text AS date,count(*)::int AS count FROM bd_activity WHERE user_id=$1 AND event IN ('application_created','report_submitted','submission_verified') AND created_at>NOW()-INTERVAL '365 days' GROUP BY 1 ORDER BY 1`, [id]);
  const { streak, maxStreak, freezes } = streakFrom(new Set(contributions.map(r => r.date)));
  const { rows: [counts] } = await pool.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE s.media_url<>'')::int AS video FROM bd_submissions s JOIN bd_applications a ON a.id=s.application_id WHERE a.user_id=$1 AND s.status='approved'`, [id]);
  return {
    ...profile, contributions, streak, maxStreak, freezes,
    approvedReports: counts.total, videoReports: counts.video,
    badges: badgesFor(counts.total, counts.video, maxStreak),
  };
}
