import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { campaigns } from "./campaigns";
import { profiles } from "./profiles";
export const applications = pgTable("bd_applications", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  userId: text("user_id").notNull().references(() => profiles.id),
  answers: text("answers").array().notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deadline: timestamp("deadline", { withTimezone: true }),
}, t => [uniqueIndex("bd_application_unique").on(t.campaignId, t.userId)]);
