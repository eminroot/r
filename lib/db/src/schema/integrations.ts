import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
// API keys let a founder's backend call POST /api/v1/verifications. Only the hash is stored.
export const apiKeys = pgTable("bd_api_keys", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  hash: text("hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
// One row per founder: outgoing webhook and GitHub export target.
export const integrations = pgTable("bd_integrations", {
  ownerId: text("owner_id").primaryKey(),
  webhookUrl: text("webhook_url").notNull().default(""),
  webhookSecret: text("webhook_secret").notNull(),
  githubRepo: text("github_repo").notNull().default(""),
  lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
  lastDeliveryStatus: integer("last_delivery_status"),
  lastDeliveryEvent: text("last_delivery_event"),
});
