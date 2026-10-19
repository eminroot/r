import { Router } from "express";
import { pool } from "@workspace/db";
import { CreateSubmissionBody, CreateSubmissionResponse, ListSubmissionsResponse, ListSubmissionsQueryParams, ReviewSubmissionBody, ReviewSubmissionParams } from "@workspace/api-zod";
import { approveReport, check, event, hashCode, httpUrl, identity, processDeadlines, REVIEW_WINDOW, submissionSelect, transaction, TRUST } from "../lib/betadrop";
import { deliver } from "../lib/webhooks";
const router = Router();
const attempts = new Map<string,{count:number,until:number}>();
router.get("/submissions", async (req, res) => {
  const user = await identity(req), q = ListSubmissionsQueryParams.parse(req.query);
  await processDeadlines();
  const field = q.role === "founder" ? "c.owner_id" : "a.user_id";
  res.json(ListSubmissionsResponse.parse((await pool.query(`${submissionSelect} WHERE ${field}=$1 ORDER BY s.created_at DESC`, [user])).rows));
});
router.post("/submissions", async (req, res) => {
  const user = await identity(req), data = CreateSubmissionBody.parse(req.body);
  const current = attempts.get(user);
  if (current && current.until > Date.now()) { check(current.count < 10, "Слишком много попыток. Подождите 15 минут.", 429); current.count++; }
  else attempts.set(user, {count:1,until:Date.now()+900000});
  if (attempts.size > 10000) for (const [key,v] of attempts) if (v.until < Date.now()) attempts.delete(key);
  check(!data.mediaUrl || httpUrl(data.mediaUrl), "Ссылка на запись должна начинаться с http:// или https://");
  const result = await transaction(async client => {
    const { rows: [a] } = await client.query("SELECT a.*,c.method,c.secret_hash,c.owner_id,c.title AS campaign_title FROM bd_applications a JOIN bd_campaigns c ON c.id=a.campaign_id WHERE a.id=$1", [data.applicationId]);
    check(a && a.user_id === user, "Заявка не найдена", 404);
    check(a.status === "approved", "Отчёт можно отправить только по одобренной заявке", 409);
    check(a.deadline && new Date(a.deadline).getTime() > Date.now(), "48 часов на отчёт прошли", 409);
    if (a.method === "secret_code") check(data.secretCode && hashCode(data.secretCode.trim()) === a.secret_hash, "Неверный секретный код");
    if (a.method === "email_match") check(data.accountEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.accountEmail), "Укажите email, с которым вы зарегистрировались в продукте");
    check(a.method !== "webhook" || a.verified_at, "Продукт ещё не подтвердил выполнение. Завершите сценарий и попробуйте снова.", 409);
    const { rows: [s] } = await client.query("INSERT INTO bd_submissions(application_id,title,content,media_url,account_email,severity,review_deadline) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [a.id,data.title,data.content,data.mediaUrl || "",data.accountEmail || "",data.severity || "low",new Date(Date.now()+REVIEW_WINDOW)]);
    await client.query("UPDATE bd_applications SET status='submitted' WHERE id=$1", [a.id]);
    await event(client,user,"report_submitted",a.campaign_title);
    return { owner: a.owner_id as string, row: (await client.query(`${submissionSelect} WHERE s.id=$1`, [s.id])).rows[0] };
  });
  const r = result.row;
  void deliver(result.owner, "submission.created", { submissionId: r.id, campaignId: r.campaignId, username: r.username, title: r.title, severity: r.severity, mediaUrl: r.mediaUrl });
  res.status(201).json(CreateSubmissionResponse.parse(r));
});
router.post("/submissions/:id/review", async (req, res) => {
  const user = await identity(req), { id } = ReviewSubmissionParams.parse(req.params), data = ReviewSubmissionBody.parse(req.body);
  check(data.decision !== "rejected" || (data.reason?.trim().length ?? 0) >= 10, "Причина отказа: от 10 символов");
  const result = await transaction(async client => {
    const { rows: [s] } = await client.query("SELECT s.*,c.owner_id,a.user_id FROM bd_submissions s JOIN bd_applications a ON a.id=s.application_id JOIN bd_campaigns c ON c.id=a.campaign_id WHERE s.id=$1", [id]);
    check(s && s.owner_id === user, "Отчёт не найден", 404);
    check(s.status === "pending", "Отчёт уже рассмотрен", 409);
    if (data.decision === "approved") await approveReport(client,id);
    else {
      check(new Date(s.review_deadline).getTime() > Date.now(), "72 часа на проверку прошли, отчёт будет принят автоматически", 409);
      await client.query("UPDATE bd_submissions SET status='rejected',reason=$2 WHERE id=$1", [id,data.reason]);
      await client.query("UPDATE bd_applications SET status='rejected' WHERE id=$1", [s.application_id]);
      await client.query("UPDATE bd_profiles SET trust_score=GREATEST(0,trust_score+$2) WHERE id=$1", [s.user_id, TRUST.rejected]);
    }
    return (await client.query(`${submissionSelect} WHERE s.id=$1`, [id])).rows[0];
  });
  void deliver(user, data.decision === "approved" ? "submission.approved" : "submission.rejected", { submissionId: result.id, campaignId: result.campaignId, username: result.username });
  res.json(CreateSubmissionResponse.parse(result));
});
export default router;
