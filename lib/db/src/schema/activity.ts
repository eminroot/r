import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
export const activity = pgTable("bd_activity", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  event: text("event").notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
