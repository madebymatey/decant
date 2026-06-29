ALTER TABLE "project" ADD COLUMN "deployUrl" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "vercelProjectId" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "deployStatus" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "lastDeployedAt" timestamp;