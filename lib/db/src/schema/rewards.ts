import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { submissions } from "./submissions";
import { profiles } from "./profiles";
export const rewards = pgTable("bd_rewards", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().unique().references(() => submissions.id),
  userId: text("user_id").notNull().references(() => profiles.id),
  campaignTitle: text("campaign_title").notNull(),
  title: text("title").notNull(),
  code: text("code").notNull(),
  claimed: boolean("claimed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
