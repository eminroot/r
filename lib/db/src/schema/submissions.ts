import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { applications } from "./applications";
export const submissions = pgTable("bd_submissions", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().unique().references(() => applications.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  mediaUrl: text("media_url").notNull().default(""),
  accountEmail: text("account_email").notNull().default(""),
  severity: text("severity").notNull().default("low"),
  status: text("status").notNull().default("pending"),
  reason: text("reason").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewDeadline: timestamp("review_deadline", { withTimezone: true }).notNull(),
});
