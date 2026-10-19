import { pool } from "@workspace/db";
import { createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { logger } from "./logger";

export const newSecret = () => `whsec_${randomBytes(24).toString("hex")}`;

function privateAddress(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return privateAddress(v.slice(7));
    return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

// Outgoing webhooks must be public HTTPS endpoints, so a founder cannot point the server at
// its own network. The address is checked again on every delivery.
export async function publicHttpsUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every(a => !privateAddress(a.address));
  } catch { return false; }
}

export function sign(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** Sends one signed event to the founder's endpoint and records the result. Never throws. */
export async function deliver(ownerId: string, type: string, data: Record<string, unknown>) {
  try {
    const { rows: [cfg] } = await pool.query("SELECT webhook_url,webhook_secret FROM bd_integrations WHERE owner_id=$1", [ownerId]);
    if (!cfg?.webhook_url) return;
    let status = 0;
    if (await publicHttpsUrl(cfg.webhook_url)) {
      const body = JSON.stringify({ type, createdAt: new Date().toISOString(), data });
      const timestamp = String(Math.floor(Date.now() / 1000));
      try {
        const res = await fetch(cfg.webhook_url, {
          method: "POST",
          redirect: "manual",
          signal: AbortSignal.timeout(5000),
          headers: {
            "content-type": "application/json",
            "user-agent": "BETADROP-Webhooks/1",
            "x-betadrop-event": type,
            "x-betadrop-timestamp": timestamp,
            "x-betadrop-signature": `sha256=${sign(cfg.webhook_secret, timestamp, body)}`,
          },
          body,
        });
        status = res.status;
      } catch (err) { logger.warn({ err, type }, "Webhook delivery failed"); }
    }
    await pool.query("UPDATE bd_integrations SET last_delivery_at=NOW(),last_delivery_status=$2,last_delivery_event=$3 WHERE owner_id=$1", [ownerId, status, type]);
  } catch (err) { logger.error({ err }, "Webhook bookkeeping failed"); }
}
