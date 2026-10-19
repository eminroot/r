import { pgTable, text, integer } from "drizzle-orm/pg-core";
export const profiles = pgTable("bd_profiles", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  bio: text("bio").notNull().default(""),
  stack: text("stack").array().notNull().default([]),
  os: text("os").notNull().default(""),
  trustScore: integer("trust_score").notNull().default(50),
  xp: integer("xp").notNull().default(0),
});
