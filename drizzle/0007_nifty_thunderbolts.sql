CREATE TABLE "inspection_observations_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"company_id" integer NOT NULL,
	"quality_system" varchar(100) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"root_cause_category" varchar(100),
	"observation_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_reference" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING_RECOMMENDATION' NOT NULL,
	"current_point" varchar(100) DEFAULT 'Divisional Deputy Director IRSD Routing' NOT NULL,
	"endorsed_by" uuid,
	"approved_by" uuid,
	"history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "schedule_batches_batch_reference_unique" UNIQUE("batch_reference")
);
--> statement-breakpoint
ALTER TABLE "local_inspection_reports" DROP CONSTRAINT "local_inspection_reports_inspector_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "risk_assessments" DROP CONSTRAINT "risk_assessments_facility_id_companies_id_fk";
--> statement-breakpoint
DROP INDEX "unique_product_per_local_line";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "current_point" SET DEFAULT 'Divisional Deputy Director';--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ALTER COLUMN "type_of_inspection" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "product_lines_local" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "product_lines_local" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "products_local" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "products_local" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "products_local" ALTER COLUMN "line_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "risk_assessments" ALTER COLUMN "facility_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "facility_id" uuid;--> statement-breakpoint
ALTER TABLE "inspection_schedules" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "facility_state" varchar(100);--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "critical_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "major_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "other_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "total_observations" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "final_recommendation" varchar(50) DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "capa_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "capa_issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "capa_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "capa_closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD COLUMN "capa_turnaround_days" "int GENERATED ALWAYS AS (EXTRACT(DAY FROM (capa_closed_at - capa_issued_at))) STORED";--> statement-breakpoint
ALTER TABLE "product_lines_local" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "product_lines_local" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "products_local" ADD COLUMN "classification" text;--> statement-breakpoint
ALTER TABLE "products_local" ADD COLUMN "target_species" text;--> statement-breakpoint
ALTER TABLE "products_local" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "products_local" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "inspection_observations_analytics" ADD CONSTRAINT "inspection_observations_analytics_report_id_local_inspection_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."local_inspection_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_observations_analytics" ADD CONSTRAINT "inspection_observations_analytics_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_obs_report_id" ON "inspection_observations_analytics" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_obs_company_id" ON "inspection_observations_analytics" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_obs_quality_system" ON "inspection_observations_analytics" USING btree ("quality_system");--> statement-breakpoint
CREATE INDEX "idx_obs_severity" ON "inspection_observations_analytics" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_obs_root_cause" ON "inspection_observations_analytics" USING btree ("root_cause_category");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_batch_id_schedule_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."schedule_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reports_recommendation" ON "local_inspection_reports" USING btree ("final_recommendation");--> statement-breakpoint
CREATE INDEX "idx_reports_critical_count" ON "local_inspection_reports" USING btree ("critical_count");--> statement-breakpoint
CREATE INDEX "idx_reports_capa_days" ON "local_inspection_reports" USING btree ("capa_turnaround_days");--> statement-breakpoint
ALTER TABLE "local_inspection_reports" DROP COLUMN "inspector_id";--> statement-breakpoint
ALTER TABLE "local_inspection_reports" DROP COLUMN "current_status";--> statement-breakpoint
ALTER TABLE "local_inspection_reports" DROP COLUMN "checklist_raw";--> statement-breakpoint
ALTER TABLE "local_inspection_reports" DROP COLUMN "report_html";--> statement-breakpoint
ALTER TABLE "local_inspection_reports" DROP COLUMN "version_history";