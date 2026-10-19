import { Router } from "express";
import { pool } from "@workspace/db";
import { CreateCampaignBody, UpdateCampaignBody, GetCampaignParams, GetCampaignResponse, ListCampaignsResponse, ListCampaignsQueryParams } from "@workspace/api-zod";
import { campaignSelect, check, event, hashCode, HIGH_VALUE_REWARD, HIGH_VALUE_TRUST, httpUrl, identity, transaction } from "../lib/betadrop";
const router = Router();
router.get("/campaigns", async (req, res) => {
  const q = ListCampaignsQueryParams.parse({ ...req.query, mine: req.query.mine === "true" });
  const mine = q.mine ? await identity(req) : null;
  const result = await pool.query(`${campaignSelect} WHERE ($1::text IS NULL OR owner_id=$1) AND ($2::text IS NULL OR title ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%') AND ($3::text IS NULL OR category=$3) ORDER BY demo ASC,featured DESC,created_at DESC LIMIT 200`, [mine, q.search || null, q.category && q.category !== "all" ? q.category : null]);
  res.json(ListCampaignsResponse.parse(result.rows));
});
router.get("/campaigns/:id", async (req, res) => {
  const { id } = GetCampaignParams.parse(req.params);
  const { rows: [c] } = await pool.query(`${campaignSelect} WHERE id=$1`, [id]);
  check(c, "Кампания не найдена", 404);
  res.json(GetCampaignResponse.parse(c));
});
router.post("/campaigns", async (req, res) => {
  const user = await identity(req);
  const data = CreateCampaignBody.parse(req.body);
  check(httpUrl(data.productUrl), "Ссылка на продукт должна начинаться с http:// или https://");
  check(data.method !== "secret_code" || (data.secretCode?.trim().length ?? 0) >= 4, "Секретный код: от 4 символов");
  const codes = data.rewardCodes.map(c => c.trim());
  const rewardValue = data.rewardValue ?? 0;
  // Spec rule: rewards worth more than $50 are only open to Trust Score 80+.
  const minTrust = rewardValue > HIGH_VALUE_REWARD ? Math.max(data.minTrust, HIGH_VALUE_TRUST) : data.minTrust;
  check(codes.every(Boolean) && new Set(codes).size === codes.length && codes.length >= data.slots, "Нужен свой код награды на каждое место, без повторов");
  const c = await transaction(async client => {
    const { rows: [count] } = await client.query("SELECT count(*)::int AS n FROM bd_campaigns WHERE owner_id=$1 AND status='active'", [user]);
    check(count.n < 1, "На Starter набор открыт только в одной кампании. Поставьте текущую на паузу.", 409);
    const { rows: [row] } = await client.query(`INSERT INTO bd_campaigns(owner_id,title,company,description,category,tags,reward,reward_value,method,slots,instructions,product_url,screening_questions,min_trust,auto_approve,auto_approve_trust,secret_hash,reward_codes)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
    [user,data.title,data.company,data.description,data.category,data.tags,data.reward,rewardValue,data.method,data.slots,data.instructions,data.productUrl,data.screeningQuestions,minTrust,data.autoApprove,data.autoApproveTrust ?? 0,data.method === "secret_code" && data.secretCode ? hashCode(data.secretCode.trim()) : null,codes]);
    await event(client, user, "campaign_deployed", data.title);
    return (await client.query(`${campaignSelect} WHERE id=$1`, [row.id])).rows[0];
  });
  res.status(201).json(GetCampaignResponse.parse(c));
});
router.patch("/campaigns/:id", async (req, res) => {
  const user = await identity(req), { id } = GetCampaignParams.parse(req.params);
  const data = UpdateCampaignBody.parse(req.body);
  const c = await transaction(async client => {
    const { rows: [c] } = await client.query("SELECT * FROM bd_campaigns WHERE id=$1 AND owner_id=$2", [id, user]);
    check(c, "Кампания не найдена", 404);
    if (data.status === "active") {
      const { rows: [count] } = await client.query("SELECT count(*)::int AS n FROM bd_campaigns WHERE owner_id=$1 AND status='active' AND id<>$2", [user,id]);
      check(count.n < 1, "На Starter набор открыт только в одной кампании. Поставьте текущую на паузу.", 409);
    }
    await client.query("UPDATE bd_campaigns SET title=$2,description=$3,instructions=$4,status=$5 WHERE id=$1", [id,data.title ?? c.title,data.description ?? c.description,data.instructions ?? c.instructions,data.status ?? c.status]);
    return (await client.query(`${campaignSelect} WHERE id=$1`, [id])).rows[0];
  });
  res.json(GetCampaignResponse.parse(c));
});
router.delete("/campaigns/:id", async (req, res) => {
  const user = await identity(req), { id } = GetCampaignParams.parse(req.params);
  await transaction(async client => {
    const { rows: [c] } = await client.query("SELECT id FROM bd_campaigns WHERE id=$1 AND owner_id=$2", [id,user]);
    check(c, "Кампания не найдена", 404);
    const { rows } = await client.query("SELECT id FROM bd_applications WHERE campaign_id=$1 LIMIT 1", [id]);
    check(!rows.length, "В кампании уже есть заявки. Её можно завершить, но не удалить.", 409);
    await client.query("DELETE FROM bd_campaigns WHERE id=$1", [id]);
  });
  res.status(204).end();
});
export default router;
