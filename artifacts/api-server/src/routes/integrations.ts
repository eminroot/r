import { Router, type Request } from "express";
import { randomBytes } from "node:crypto";
import { pool } from "@workspace/db";
import { CreateApiKeyBody, CreateVerificationBody, RevokeApiKeyParams, UpdateIntegrationsBody } from "@workspace/api-zod";
import { check, event, hashCode, HttpError, identity, transaction } from "../lib/betadrop";
import { deliver, newSecret, publicHttpsUrl } from "../lib/webhooks";

const router = Router();
const MAX_KEYS = 5;
const integrationSelect = `SELECT webhook_url AS "webhookUrl",webhook_secret AS "webhookSecret",github_repo AS "githubRepo",last_delivery_at::text AS "lastDeliveryAt",last_delivery_status AS "lastDeliveryStatus",last_delivery_event AS "lastDeliveryEvent" FROM bd_integrations WHERE owner_id=$1`;
const keySelect = `SELECT id,name,prefix,created_at::text AS "createdAt",last_used_at::text AS "lastUsedAt" FROM bd_api_keys`;

async function settings(owner: string) {
  await pool.query("INSERT INTO bd_integrations(owner_id,webhook_secret) VALUES($1,$2) ON CONFLICT(owner_id) DO NOTHING", [owner, newSecret()]);
  return (await pool.query(integrationSelect, [owner])).rows[0];
}

router.get("/integrations", async (req, res) => {
  res.json(await settings(await identity(req)));
});
router.put("/integrations", async (req, res) => {
  const owner = await identity(req), data = UpdateIntegrationsBody.parse(req.body);
  const webhookUrl = data.webhookUrl.trim(), githubRepo = data.githubRepo.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, "");
  check(!webhookUrl || await publicHttpsUrl(webhookUrl), "Webhook должен быть публичным HTTPS-адресом");
  check(!githubRepo || /^[\w.-]+\/[\w.-]+$/.test(githubRepo), "Репозиторий GitHub в формате owner/repo");
  await settings(owner);
  await pool.query("UPDATE bd_integrations SET webhook_url=$2,github_repo=$3 WHERE owner_id=$1", [owner, webhookUrl, githubRepo]);
  res.json(await settings(owner));
});
router.post("/integrations/webhook/rotate", async (req, res) => {
  const owner = await identity(req);
  await settings(owner);
  await pool.query("UPDATE bd_integrations SET webhook_secret=$2 WHERE owner_id=$1", [owner, newSecret()]);
  res.json(await settings(owner));
});
router.post("/integrations/webhook/test", async (req, res) => {
  const owner = await identity(req);
  const current = await settings(owner);
  check(current.webhookUrl, "Сначала сохраните адрес webhook");
  await deliver(owner, "ping", { message: "Test event from BETADROP" });
  res.json(await settings(owner));
});

router.get("/api-keys", async (req, res) => {
  const owner = await identity(req);
  res.json((await pool.query(`${keySelect} WHERE owner_id=$1 AND revoked_at IS NULL ORDER BY id DESC`, [owner])).rows);
});
router.post("/api-keys", async (req, res) => {
  const owner = await identity(req), { name } = CreateApiKeyBody.parse(req.body);
  const token = `bd_live_${randomBytes(24).toString("hex")}`;
  const row = await transaction(async client => {
    const { rows: [count] } = await client.query("SELECT count(*)::int AS n FROM bd_api_keys WHERE owner_id=$1 AND revoked_at IS NULL", [owner]);
    check(count.n < MAX_KEYS, "Не больше 5 активных ключей. Отзовите старый.", 409);
    const { rows: [k] } = await client.query(`INSERT INTO bd_api_keys(owner_id,name,prefix,hash) VALUES($1,$2,$3,$4) RETURNING id`, [owner, name.trim(), token.slice(0, 14), hashCode(token)]);
    return (await client.query(`${keySelect} WHERE id=$1`, [k.id])).rows[0];
  });
  res.status(201).json({ ...row, token });
});
router.delete("/api-keys/:id", async (req, res) => {
  const owner = await identity(req), { id } = RevokeApiKeyParams.parse(req.params);
  const { rowCount } = await pool.query("UPDATE bd_api_keys SET revoked_at=NOW() WHERE id=$1 AND owner_id=$2 AND revoked_at IS NULL", [id, owner]);
  check(rowCount, "Ключ не найден", 404);
  res.status(204).end();
});

// Public server-to-server endpoint. Errors are plain English because callers are not the web app.
async function keyOwner(req: Request) {
  const token = /^Bearer\s+(bd_live_[a-f0-9]{48})$/.exec(req.get("authorization") ?? "")?.[1];
  if (!token) throw new HttpError(401, "Missing or malformed API key. Send Authorization: Bearer bd_live_...");
  const { rows: [key] } = await pool.query("UPDATE bd_api_keys SET last_used_at=NOW() WHERE hash=$1 AND revoked_at IS NULL RETURNING owner_id", [hashCode(token)]);
  if (!key) throw new HttpError(401, "API key is invalid or revoked");
  return key.owner_id as string;
}
router.post("/v1/verifications", async (req, res) => {
  const owner = await keyOwner(req);
  const parsed = CreateVerificationBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Body must be JSON: { \"campaignId\": number, \"betadropId\": string }");
  const { campaignId, betadropId } = parsed.data;
  const result = await transaction(async client => {
    const { rows: [a] } = await client.query(`SELECT a.id,a.status,a.verified_at,c.owner_id,c.method,c.title FROM bd_applications a JOIN bd_campaigns c ON c.id=a.campaign_id WHERE a.campaign_id=$1 AND a.user_id=$2`, [campaignId, betadropId]);
    if (!a || a.owner_id !== owner) throw new HttpError(404, "No application for this tester in your campaign");
    if (a.method !== "webhook") throw new HttpError(409, "This campaign does not use webhook verification");
    if (a.verified_at) return { applicationId: a.id, status: "already_verified", verifiedAt: new Date(a.verified_at).toISOString() };
    if (!["approved", "submitted"].includes(a.status)) throw new HttpError(409, `Application is ${a.status}; only approved testers can be verified`);
    const { rows: [row] } = await client.query("UPDATE bd_applications SET verified_at=NOW() WHERE id=$1 RETURNING verified_at", [a.id]);
    await event(client, betadropId, "action_verified", a.title);
    return { applicationId: a.id, status: "verified", verifiedAt: new Date(row.verified_at).toISOString() };
  });
  res.json(result);
});

export default router;
