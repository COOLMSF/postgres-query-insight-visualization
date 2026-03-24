import { pgTable, serial, text, integer, timestamp, jsonb, boolean, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Query optimization sessions
export const querySessions = pgTable("query_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  queryText: text("query_text").notNull(),
  databaseName: text("database_name").notNull().default("postgres"),
  userName: text("user_name").notNull().default("postgres"),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  totalDurationMs: real("total_duration_ms"),
  totalStages: integer("total_stages").notNull().default(0),
  status: text("status").notNull().default("running"), // running, completed, error
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Optimization stages (parse, analyze, rewrite, plan, execute)
export const optimizationStages = pgTable("optimization_stages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => querySessions.id, { onDelete: "cascade" }),
  stageSeq: integer("stage_seq").notNull(),
  stageName: text("stage_name").notNull(), // parse, analyze, rewrite, plan, explain, execute_start, execute_end
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  durationMs: real("duration_ms"),
  stageData: jsonb("stage_data"), // Stage-specific data (parsed tree, plan, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Execution plan paths
export const executionPaths = pgTable("execution_paths", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => querySessions.id, { onDelete: "cascade" }),
  stageId: integer("stage_id").notNull().references(() => optimizationStages.id, { onDelete: "cascade" }),
  pathType: text("path_type").notNull(), // e.g., "Nested Loop + Index Scan", "Hash Join + Seq Scan"
  pathDescription: text("path_description").notNull(),
  totalCost: real("total_cost").notNull(),
  startupCost: real("startup_cost").notNull(),
  rowsEstimate: integer("rows_estimate").notNull().default(0),
  isSelected: boolean("is_selected").notNull().default(false),
  parentRel: text("parent_rel"),
  pathData: jsonb("path_data"), // Full path details
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Query execution events (for real-time tracking)
export const executionEvents = pgTable("execution_events", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => querySessions.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // stage_start, stage_end, plan_generated
  eventData: jsonb("event_data"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Relations
export const querySessionsRelations = relations(querySessions, ({ many }) => ({
  stages: many(optimizationStages),
  paths: many(executionPaths),
  events: many(executionEvents),
}));

export const optimizationStagesRelations = relations(optimizationStages, ({ one, many }) => ({
  session: one(querySessions, {
    fields: [optimizationStages.sessionId],
    references: [querySessions.id],
  }),
  paths: many(executionPaths),
}));

export const executionPathsRelations = relations(executionPaths, ({ one }) => ({
  session: one(querySessions, {
    fields: [executionPaths.sessionId],
    references: [querySessions.id],
  }),
  stage: one(optimizationStages, {
    fields: [executionPaths.stageId],
    references: [optimizationStages.id],
  }),
}));

export const executionEventsRelations = relations(executionEvents, ({ one }) => ({
  session: one(querySessions, {
    fields: [executionEvents.sessionId],
    references: [querySessions.id],
  }),
}));

// Type exports
export type QuerySession = typeof querySessions.$inferSelect;
export type NewQuerySession = typeof querySessions.$inferInsert;
export type OptimizationStage = typeof optimizationStages.$inferSelect;
export type NewOptimizationStage = typeof optimizationStages.$inferInsert;
export type ExecutionPath = typeof executionPaths.$inferSelect;
export type NewExecutionPath = typeof executionPaths.$inferInsert;
export type ExecutionEvent = typeof executionEvents.$inferSelect;
export type NewExecutionEvent = typeof executionEvents.$inferInsert;
