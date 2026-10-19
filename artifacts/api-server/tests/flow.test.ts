// End-to-end check of the campaign lifecycle against a real Postgres.
// Needs DATABASE_URL pointing at a throwaway database with the schema pushed.
// Auth is injected per request through Clerk's request brand, the same shape
// clerkMiddleware installs; the app itself has no auth bypass.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import express from "express";
import { pool } from "@workspace/db";
import router from "../src/routes";
import { errorHandler } from "../src/lib/errors";
import { processDeadlines, streakFrom } from "../src/lib/betadrop";
import { publicHttpsUrl } from "../src/lib/webhooks";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const userId = req.get("x-test-user") ?? null;
  const auth = Object.assign(() => ({ tokenType: "session_token", userId }), { [Symbol.for("@clerk/express.auth")]: true });
  (req as unknown as { auth: unknown }).auth = auth;
  next();
});
app.use("/api", router);
app.use(errorHandler);
const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
after(async () => { server.close(); await pool.end(); });

const run = randomUUID().slice(0, 8);
const user = (name: string) => `test_${run}_${name}`;
async function call(method: string, path: string, as: string | null, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(as ? { "x-test-user": as } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const campaign = (over: Record<string, unknown> = {}) => ({
  title: `Test ${run}`, company: "Acme", description: "A product that needs careful testing.", category: "DevTools",
  tags: ["cli"], reward: "1 year Pro", method: "secret_code", slots: 2, instructions: "Do the thing and report.",
  productUrl: "https://example.com/app", screeningQuestions: ["Which OS?"], minTrust: 0, autoApprove: false,
  secretCode: "EGG-42", rewardCodes: [`CODE-${run}-1`, `CODE-${run}-2`], ...over,
});

test("streak replay earns and spends freezes", () => {
  const today = new Date("2026-03-20T12:00:00Z");
  const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => {
    const d = new Date(`${from}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10);
  });
  // 7 active days earn a freeze, one missed day spends it, the streak continues.
  const kept = streakFrom(new Set([...days("2026-03-08", 7), ...days("2026-03-16", 5)]), today);
  assert.equal(kept.streak, 12);
  assert.equal(kept.freezes, 0);
  // Without a freeze a missed day resets the streak.
  const reset = streakFrom(new Set([...days("2026-03-12", 3), ...days("2026-03-16", 5)]), today);
  assert.equal(reset.streak, 5);
  assert.equal(reset.maxStreak, 5);
  // Today does not break a streak before the day is over.
  assert.equal(streakFrom(new Set(days("2026-03-17", 3)), today).streak, 3);
});

test("webhook URLs must be public https", async () => {
  assert.equal(await publicHttpsUrl("http://93.184.215.14/hook"), false);
  assert.equal(await publicHttpsUrl("https://10.0.0.5/hook"), false);
  assert.equal(await publicHttpsUrl("https://127.0.0.1/hook"), false);
  assert.equal(await publicHttpsUrl("https://[::1]/hook"), false);
  assert.equal(await publicHttpsUrl("https://93.184.215.14/hook"), true);
});

test("secret code campaign: apply, approve, report, reward", async () => {
  const founder = user("f1"), tester = user("t1");
  assert.equal((await call("POST", "/campaigns", null, campaign())).status, 401);
  const created = await call("POST", "/campaigns", founder, campaign());
  assert.equal(created.status, 201);
  const c = created.body;
  const pub = await call("GET", `/campaigns/${c.id}`, null);
  assert.equal(pub.body.rewardCodes, undefined, "reward codes must stay private");
  assert.equal(pub.body.secretHash, undefined, "secret hash must stay private");
  assert.equal((await call("POST", "/campaigns", founder, campaign())).status, 409, "Starter allows one active campaign");

  assert.equal((await call("POST", "/applications", founder, { campaignId: c.id, answers: ["Linux"] })).status, 400, "no testing your own campaign");
  const applied = await call("POST", "/applications", tester, { campaignId: c.id, answers: ["Arch Linux"] });
  assert.equal(applied.status, 201);
  assert.equal(applied.body.status, "pending");
  assert.equal(applied.body.productUrl, "", "personal link only after approval");
  assert.equal((await call("POST", `/applications/${applied.body.id}/review`, tester, { decision: "approved" })).status, 404, "only the owner reviews");
  const approved = await call("POST", `/applications/${applied.body.id}/review`, founder, { decision: "approved" });
  assert.equal(approved.body.status, "approved");
  assert.match(approved.body.productUrl, new RegExp(`betadrop_id=${tester}$`));
  const hours = (new Date(approved.body.deadline).getTime() - Date.now()) / 3600000;
  assert.ok(hours > 47.9 && hours <= 48, "48h execution window");

  const report = { applicationId: applied.body.id, title: "Crash on empty config", content: "Steps: run with an empty config file. Expected a message.", severity: "high" };
  assert.equal((await call("POST", "/submissions", tester, { ...report, secretCode: "nope" })).status, 400);
  const sub = await call("POST", "/submissions", tester, { ...report, secretCode: " EGG-42 " });
  assert.equal(sub.status, 201);
  const reviewHours = (new Date(sub.body.reviewDeadline).getTime() - Date.now()) / 3600000;
  assert.ok(reviewHours > 71.9 && reviewHours <= 72, "72h review window");
  assert.equal((await call("POST", `/submissions/${sub.body.id}/review`, founder, { decision: "rejected", reason: "short" })).status, 400, "reason needs 10 chars");
  assert.equal((await call("POST", `/submissions/${sub.body.id}/review`, founder, { decision: "approved" })).body.status, "approved");

  const vault = await call("GET", "/rewards", tester);
  assert.equal(vault.body.length, 1);
  assert.equal(vault.body[0].code, null, "code hidden until claimed");
  const claimed = await call("POST", `/rewards/${vault.body[0].id}/claim`, tester);
  assert.equal(claimed.body.code, `CODE-${run}-1`);

  const me = await call("GET", "/profile", tester);
  assert.equal(me.body.trustScore, 52);
  assert.equal(me.body.xp, 100);
  assert.deepEqual(me.body.badges, ["FIRST_DROP"]);
  assert.ok(me.body.streak >= 1);
  const profile = await call("GET", `/profiles/${me.body.username}`, null);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.id, undefined, "public profile hides the account id");
  assert.equal(profile.body.approvedReports, 1);
  assert.equal((await call("GET", "/profiles/nobody_here_404", null)).status, 404);

  const activity = await call("GET", "/activity", null);
  assert.ok(activity.body.every((e: { detail: string }) => !e.detail.includes(run) || !/^(Новая заявка|Отчёт отправлен):/.test(e.detail)));
});

test("webhook campaign: trust filter, API key verification, deadlines", async () => {
  const founder = user("f2"), low = user("t2"), high = user("t3");
  const created = await call("POST", "/campaigns", founder, campaign({ method: "webhook", secretCode: undefined, autoApprove: true, autoApproveTrust: 60, rewardValue: 70, minTrust: 10 }));
  assert.equal(created.status, 201);
  const c = created.body;
  assert.equal(c.minTrust, 80, "rewards above $50 require Trust Score 80+");
  await call("GET", "/profile", low);
  await call("GET", "/profile", high);
  await pool.query("UPDATE bd_profiles SET trust_score=$2 WHERE id=$1", [low, 81]);
  await pool.query("UPDATE bd_profiles SET trust_score=$2 WHERE id=$1", [high, 90]);
  await pool.query("UPDATE bd_campaigns SET auto_approve_trust=85 WHERE id=$1", [c.id]);

  const a1 = await call("POST", "/applications", low, { campaignId: c.id, answers: ["yes"] });
  assert.equal(a1.body.status, "pending", "below the auto-approve filter");
  const a2 = await call("POST", "/applications", high, { campaignId: c.id, answers: ["yes"] });
  assert.equal(a2.body.status, "approved", "passes the auto-approve filter");

  const report = { applicationId: a2.body.id, title: "Import works", content: "Imported 1000 docs, all queries returned results." };
  assert.equal((await call("POST", "/submissions", high, report)).status, 409, "needs verification from the product first");

  const key = await call("POST", "/api-keys", founder, { name: "prod" });
  assert.equal(key.status, 201);
  assert.match(key.body.token, /^bd_live_[a-f0-9]{48}$/);
  const keys = await call("GET", "/api-keys", founder);
  assert.equal(keys.body[0].token, undefined, "token is shown only once");
  const auth = { authorization: `Bearer ${key.body.token}` };
  assert.equal((await call("POST", "/v1/verifications", null, { campaignId: c.id, betadropId: high })).status, 401);
  assert.equal((await call("POST", "/v1/verifications", null, { campaignId: c.id, betadropId: low }, auth)).status, 409, "pending testers cannot be verified");
  const verified = await call("POST", "/v1/verifications", null, { campaignId: c.id, betadropId: high }, auth);
  assert.equal(verified.status, 200);
  assert.equal(verified.body.status, "verified");
  assert.equal((await call("POST", "/v1/verifications", null, { campaignId: c.id, betadropId: high }, auth)).body.status, "already_verified");

  const sub = await call("POST", "/submissions", high, report);
  assert.equal(sub.status, 201);

  // Review deadline passes: the report is approved automatically.
  await pool.query("UPDATE bd_submissions SET review_deadline=NOW()-INTERVAL '1 minute' WHERE id=$1", [sub.body.id]);
  // Execution deadline passes for an approved tester: application expires, trust drops, slot frees.
  await call("POST", `/applications/${a1.body.id}/review`, founder, { decision: "approved" });
  await pool.query("UPDATE bd_applications SET deadline=NOW()-INTERVAL '1 minute' WHERE id=$1", [a1.body.id]);
  await processDeadlines();
  const subs = await call("GET", "/submissions?role=founder", founder);
  assert.equal(subs.body.find((s: { id: number }) => s.id === sub.body.id).status, "approved");
  const apps = await call("GET", "/applications?role=founder", founder);
  assert.equal(apps.body.find((a: { id: number }) => a.id === a1.body.id).status, "expired");
  assert.equal((await call("GET", "/profile", low)).body.trustScore, 71);
  assert.equal((await call("GET", `/campaigns/${c.id}`, null)).body.filledSlots, 1);

  assert.equal((await call("DELETE", `/api-keys/${key.body.id}`, founder)).status, 204);
  assert.equal((await call("POST", "/v1/verifications", null, { campaignId: c.id, betadropId: high }, auth)).status, 401, "revoked key");
});

test("integration settings validate input", async () => {
  const founder = user("f3");
  const initial = await call("GET", "/integrations", founder);
  assert.match(initial.body.webhookSecret, /^whsec_/);
  assert.equal((await call("PUT", "/integrations", founder, { webhookUrl: "https://127.0.0.1/hook", githubRepo: "" })).status, 400);
  assert.equal((await call("PUT", "/integrations", founder, { webhookUrl: "", githubRepo: "not a repo" })).status, 400);
  const saved = await call("PUT", "/integrations", founder, { webhookUrl: "", githubRepo: "https://github.com/acme/app" });
  assert.equal(saved.body.githubRepo, "acme/app");
  const rotated = await call("POST", "/integrations/webhook/rotate", founder);
  assert.notEqual(rotated.body.webhookSecret, initial.body.webhookSecret);
});
