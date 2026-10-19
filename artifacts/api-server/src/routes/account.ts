import { Router } from "express";
import { pool } from "@workspace/db";
import { ClaimRewardParams, ClaimRewardResponse, GetActivityResponse, GetDashboardResponse, GetProfileResponse, GetStatsResponse, ListRewardsResponse, UpdateProfileBody } from "@workspace/api-zod";
import { check, identity, processDeadlines, profileFor, rewardSelect } from "../lib/betadrop";
const router = Router();
router.get("/profile", async (req, res) => {
  res.json(GetProfileResponse.parse(await profileFor(await identity(req))));
});
router.patch("/profile", async (req, res) => {
  const user = await identity(req), data = UpdateProfileBody.parse(req.body);
  await pool.query("UPDATE bd_profiles SET username=$2,bio=$3,stack=$4,os=$5 WHERE id=$1", [user,data.username,data.bio,data.stack,data.os]);
  res.json(GetProfileResponse.parse(await profileFor(user)));
});
router.get("/rewards", async (req, res) => {
  const user = await identity(req);
  await processDeadlines();
  res.json(ListRewardsResponse.parse((await pool.query(`${rewardSelect} WHERE user_id=$1 ORDER BY created_at DESC`, [user])).rows));
});
router.post("/rewards/:id/claim", async (req, res) => {
  const user = await identity(req), { id } = ClaimRewardParams.parse(req.params);
  const { rowCount } = await pool.query("UPDATE bd_rewards SET claimed=true WHERE id=$1 AND user_id=$2", [id,user]);
  check(rowCount, "Награда не найдена", 404);
  res.json(ClaimRewardResponse.parse((await pool.query(`${rewardSelect} WHERE id=$1 AND user_id=$2`, [id,user])).rows[0]));
});
router.get("/dashboard", async (req, res) => {
  const user = await identity(req);
  await processDeadlines();
  const { rows: [counts] } = await pool.query(`SELECT
    (SELECT count(*)::int FROM bd_applications WHERE user_id=$1 AND status IN ('approved','submitted')) AS "activeTests",
    (SELECT count(*)::int FROM bd_applications WHERE user_id=$1 AND status='pending') AS "pendingApplications",
    (SELECT count(*)::int FROM bd_applications WHERE user_id=$1 AND status='completed') AS "completedTests",
    (SELECT count(*)::int FROM bd_rewards WHERE user_id=$1) AS rewards,
    (SELECT count(*)::int FROM bd_campaigns WHERE owner_id=$1) AS campaigns,
    (SELECT count(*)::int FROM bd_submissions s JOIN bd_applications a ON a.id=s.application_id JOIN bd_campaigns c ON c.id=a.campaign_id WHERE c.owner_id=$1 AND s.status='pending') AS "pendingReviews",
    (SELECT count(*)::int FROM bd_applications a JOIN bd_campaigns c ON c.id=a.campaign_id WHERE c.owner_id=$1) AS "totalApplications"`, [user]);
  res.json(GetDashboardResponse.parse({...counts,profile:await profileFor(user)}));
});
router.get("/activity", async (_req, res) => {
  const { rows } = await pool.query(`SELECT id,event,detail,created_at::text AS "createdAt" FROM bd_activity ORDER BY created_at DESC LIMIT 12`);
  res.json(GetActivityResponse.parse(rows));
});
router.get("/stats", async (_req, res) => {
  const { rows: [stats] } = await pool.query(`SELECT
    (SELECT count(*)::int FROM bd_campaigns WHERE status='active' AND NOT demo) AS campaigns,
    (SELECT count(*)::int FROM bd_profiles) AS testers,
    (SELECT count(*)::int FROM bd_submissions WHERE status='approved') AS "verifiedReports",
    (SELECT COALESCE(sum(slots-filled_slots),0)::int FROM bd_campaigns WHERE status='active' AND NOT demo) AS "availableSlots"`);
  res.json(GetStatsResponse.parse(stats));
});
export default router;
