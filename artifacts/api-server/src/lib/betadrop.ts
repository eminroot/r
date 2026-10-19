import { pool, type PoolClient } from "@workspace/db";
import { createHash, randomUUID } from "node:crypto";
import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { logger } from "./logger";

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
export type Client = PoolClient;
export async function transaction<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize the small MVP's financial/slot transitions across processes.
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
export async function event(client: Client, userId: string | null, type: string, detail: string) {
  await client.query("INSERT INTO bd_activity(user_id,event,detail) VALUES($1,$2,$3)", [userId, type, detail]);
}
export const campaignSelect = `SELECT id,owner_id AS "ownerId",title,company,description,category,tags,reward,method,slots,filled_slots AS "filledSlots",status,instructions,product_url AS "productUrl",screening_questions AS "screeningQuestions",min_trust AS "minTrust",auto_approve AS "autoApprove",featured,demo,created_at::text AS "createdAt" FROM bd_campaigns`;
export const applicationSelect = `SELECT a.id,a.campaign_id AS "campaignId",c.title AS "campaignTitle",a.user_id AS "userId",p.username,a.answers,a.status,a.created_at::text AS "createdAt",a.deadline::text AS deadline,CASE WHEN a.status IN ('approved','submitted','completed') THEN c.product_url || CASE WHEN c.product_url LIKE '%?%' THEN '&' ELSE '?' END || 'betadrop_id=' || a.user_id ELSE '' END AS "productUrl",c.method,c.reward FROM bd_applications a JOIN bd_campaigns c ON a.campaign_id=c.id JOIN bd_profiles p ON a.user_id=p.id`;
export const submissionSelect = `SELECT s.id,s.application_id AS "applicationId",c.title AS "campaignTitle",p.username,s.title,s.content,s.media_url AS "mediaUrl",s.account_email AS "accountEmail",s.severity,s.status,s.reason,s.created_at::text AS "createdAt",s.review_deadline::text AS "reviewDeadline" FROM bd_submissions s JOIN bd_applications a ON s.application_id=a.id JOIN bd_campaigns c ON c.id=a.campaign_id JOIN bd_profiles p ON p.id=a.user_id`;
export const rewardSelect = `SELECT id,campaign_title AS "campaignTitle",title,CASE WHEN claimed THEN code ELSE NULL END AS code,claimed,created_at::text AS "createdAt" FROM bd_rewards`;

export async function approveReport(client: Client, id: number) {
  const { rows: [s] } = await client.query(`SELECT s.status,s.media_url,a.user_id,a.id AS application_id,c.id AS campaign_id,c.title,c.reward,c.reward_codes FROM bd_submissions s JOIN bd_applications a ON a.id=s.application_id JOIN bd_campaigns c ON c.id=a.campaign_id WHERE s.id=$1`, [id]);
  check(s, "Отчёт не найден", 404);
  check(s.status === "pending", "Отчёт уже рассмотрен", 409);
  check(s.reward_codes.length, "Пул наград исчерпан; обратитесь к владельцу кампании", 409);
  await client.query("INSERT INTO bd_rewards(submission_id,user_id,campaign_title,title,code) VALUES($1,$2,$3,$4,$5)", [id, s.user_id, s.title, s.reward, s.reward_codes[0]]);
  await client.query("UPDATE bd_campaigns SET reward_codes=$2 WHERE id=$1", [s.campaign_id, s.reward_codes.slice(1)]);
  await client.query("UPDATE bd_submissions SET status='approved' WHERE id=$1", [id]);
  await client.query("UPDATE bd_applications SET status='completed' WHERE id=$1", [s.application_id]);
  await client.query("UPDATE bd_profiles SET trust_score=LEAST(100,trust_score+$2),xp=xp+100 WHERE id=$1", [s.user_id, s.media_url ? 5 : 2]);
  await event(client, s.user_id, "submission_verified", `${s.title} → ${s.reward}`);
}

let sweeping = false;
export async function processDeadlines() {
  if (sweeping) return;
  sweeping = true;
  try {
    await transaction(async client => {
      const expired = await client.query("UPDATE bd_applications SET status='expired' WHERE status='approved' AND deadline<NOW() RETURNING user_id,campaign_id");
      for (const row of expired.rows) {
        await client.query("UPDATE bd_profiles SET trust_score=GREATEST(0,trust_score-10) WHERE id=$1", [row.user_id]);
        await client.query("UPDATE bd_campaigns SET filled_slots=GREATEST(0,filled_slots-1) WHERE id=$1", [row.campaign_id]);
      }
      const due = await client.query("SELECT id FROM bd_submissions WHERE status='pending' AND review_deadline<NOW() ORDER BY id");
      for (const row of due.rows) await approveReport(client, row.id);
    });
  } catch (err) { logger.error({ err }, "Deadline processing failed"); }
  finally { sweeping = false; }
}

export async function profileFor(id: string) {
  const { rows: [profile] } = await pool.query(`SELECT id,username,bio,stack,os,trust_score AS "trustScore",xp FROM bd_profiles WHERE id=$1`, [id]);
  const { rows: contributions } = await pool.query(`SELECT (created_at AT TIME ZONE 'UTC')::date::text AS date,count(*)::int AS count FROM bd_activity WHERE user_id=$1 AND event IN ('application_created','report_submitted','submission_verified') AND created_at>NOW()-INTERVAL '364 days' GROUP BY 1 ORDER BY 1`, [id]);
  const dates = new Set(contributions.map(r => r.date));
  const day = new Date(); day.setUTCHours(0, 0, 0, 0);
  if (!dates.has(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() - 1);
  let streak = 0;
  while (dates.has(day.toISOString().slice(0, 10))) { streak++; day.setUTCDate(day.getUTCDate() - 1); }
  const { rows: [counts] } = await pool.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE s.media_url<>'')::int AS video FROM bd_submissions s JOIN bd_applications a ON a.id=s.application_id WHERE a.user_id=$1 AND s.status='approved'`, [id]);
  const badges = [];
  if (counts.total > 0) badges.push("FIRST_DROP");
  if (counts.total >= 5) badges.push(`BUG_HUNTER_L${counts.total >= 100 ? 3 : counts.total >= 25 ? 2 : 1}`);
  if (counts.video >= 10) badges.push("DEEP_AUDITOR");
  if (streak >= 30) badges.push(streak >= 100 ? "STREAK_100" : "STREAK_30");
  return { ...profile, contributions, streak, freezes: 0, badges };
}
