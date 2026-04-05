CREATE TABLE "execution_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_paths" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"stage_id" integer NOT NULL,
	"path_type" text NOT NULL,
	"path_description" text NOT NULL,
	"total_cost" real NOT NULL,
	"startup_cost" real NOT NULL,
	"rows_estimate" integer DEFAULT 0 NOT NULL,
	"is_selected" boolean DEFAULT false NOT NULL,
	"parent_rel" text,
	"path_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "optimization_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"stage_seq" integer NOT NULL,
	"stage_name" text NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"duration_ms" real,
	"stage_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"query_text" text NOT NULL,
	"database_name" text DEFAULT 'postgres' NOT NULL,
	"user_name" text DEFAULT 'postgres' NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"total_duration_ms" real,
	"total_stages" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "query_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "execution_events" ADD CONSTRAINT "execution_events_session_id_query_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."query_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_paths" ADD CONSTRAINT "execution_paths_session_id_query_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."query_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_paths" ADD CONSTRAINT "execution_paths_stage_id_optimization_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."optimization_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_stages" ADD CONSTRAINT "optimization_stages_session_id_query_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."query_sessions"("id") ON DELETE cascade ON UPDATE no action;