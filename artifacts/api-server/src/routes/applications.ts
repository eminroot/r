import { Router } from "express";
import { pool } from "@workspace/db";
import { ApplyCampaignBody, ApplyCampaignResponse, ListApplicationsQueryParams, ListApplicationsResponse, ReviewApplicationBody, ReviewApplicationParams } from "@workspace/api-zod";
import { applicationSelect, check, event, EXECUTION_WINDOW, identity, processDeadlines, transaction } from "../lib/betadrop";
import { deliver } from "../lib/webhooks";
const router = Router();
router.get("/applications", async (req, res) => {
  const user = await identity(req), q = ListApplicationsQueryParams.parse(req.query);
  await processDeadlines();
  const field = q.role === "founder" ? "c.owner_id" : "a.user_id";
  res.json(ListApplicationsResponse.parse((await pool.query(`${applicationSelect} WHERE ${field}=$1 ORDER BY a.created_at DESC`, [user])).rows));
});
router.post("/applications", async (req, res) => {
  const user = await identity(req), data = ApplyCampaignBody.parse(req.body);
  const result = await transaction(async client => {
    const { rows: [c] } = await client.query("SELECT * FROM bd_campaigns WHERE id=$1", [data.campaignId]);
    check(c, "Кампания не найдена", 404);
    check(!c.demo, "Это демонстрационная кампания. Заявки недоступны.");
    check(c.owner_id !== user, "Нельзя тестировать собственную кампанию");
    check(c.status === "active" && c.filled_slots < c.slots, "Набор закрыт", 409);
    check(data.answers.length === c.screening_questions.length, "Ответьте на все вопросы");
    const { rows: [p] } = await client.query("SELECT trust_score FROM bd_profiles WHERE id=$1", [user]);
    check(p.trust_score >= c.min_trust, "Недостаточный Trust Score", 403);
    const { rows: [prior] } = await client.query("SELECT id FROM bd_applications WHERE campaign_id=$1 AND user_id=$2", [c.id,user]);
    check(!prior, "Вы уже подали заявку", 409);
    // Auto-approve only testers who pass the campaign's Trust Score filter; the rest wait for manual review.
    const auto = c.auto_approve && p.trust_score >= c.auto_approve_trust;
    const { rows: [a] } = await client.query("INSERT INTO bd_applications(campaign_id,user_id,answers,status,deadline) VALUES($1,$2,$3,$4,$5) RETURNING id",
      [c.id,user,data.answers,auto ? "approved" : "pending",auto ? new Date(Date.now()+EXECUTION_WINDOW) : null]);
    if (auto) await client.query("UPDATE bd_campaigns SET filled_slots=filled_slots+1 WHERE id=$1", [c.id]);
    await event(client, user, "application_created", c.title);
    return { owner: c.owner_id as string, row: (await client.query(`${applicationSelect} WHERE a.id=$1`, [a.id])).rows[0] };
  });
  void deliver(result.owner, "application.created", { applicationId: result.row.id, campaignId: result.row.campaignId, betadropId: result.row.userId, username: result.row.username, status: result.row.status });
  res.status(201).json(ApplyCampaignResponse.parse(result.row));
});
router.post("/applications/:id/review", async (req, res) => {
  const user = await identity(req), { id } = ReviewApplicationParams.parse(req.params), data = ReviewApplicationBody.parse(req.body);
  const result = await transaction(async client => {
    const { rows: [a] } = await client.query("SELECT a.*,c.owner_id,c.status AS campaign_status,c.filled_slots,c.slots FROM bd_applications a JOIN bd_campaigns c ON c.id=a.campaign_id WHERE a.id=$1", [id]);
    check(a && a.owner_id === user, "Заявка не найдена", 404);
    check(a.status === "pending", "Заявка уже рассмотрена", 409);
    if (data.decision === "approved") {
      check(a.campaign_status === "active" && a.filled_slots < a.slots, "Набор закрыт или места закончились", 409);
      await client.query("UPDATE bd_campaigns SET filled_slots=filled_slots+1 WHERE id=$1", [a.campaign_id]);
    }
    await client.query("UPDATE bd_applications SET status=$2,deadline=$3 WHERE id=$1", [id,data.decision,data.decision === "approved" ? new Date(Date.now()+EXECUTION_WINDOW) : null]);
    return (await client.query(`${applicationSelect} WHERE a.id=$1`, [id])).rows[0];
  });
  res.json(ApplyCampaignResponse.parse(result));
});
export default router;
