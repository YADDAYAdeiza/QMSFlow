CREATE TABLE "capa_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer,
	"ref_number" varchar(255),
	"status" varchar(50) DEFAULT 'PENDING_VERIFICATION',
	"capa_items" jsonb,
	"signatures" jsonb,
	"created_at" text,
	"submitted_at" text
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inspection_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" integer NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'SCHEDULED',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_team_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"inspector_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_line_id_product_lines_id_fk";
--> statement-breakpoint
ALTER TABLE "risk_assessments" DROP CONSTRAINT "risk_assessments_facility_id_companies_id_fk";
--> statement-breakpoint
DROP INDEX "unique_line_per_factory";--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ALTER COLUMN "application_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ALTER COLUMN "application_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ALTER COLUMN "company_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ALTER COLUMN "current_status" SET DEFAULT 'LOD_INTAKE';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "facility_id" integer;--> statement-breakpoint
ALTER TABLE "product_lines" ADD COLUMN "facility_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "classification" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "target_species" varchar(100);--> statement-breakpoint
ALTER TABLE "capa_submissions" ADD CONSTRAINT "capa_submissions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_schedules" ADD CONSTRAINT "inspection_schedules_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_team_assignments" ADD CONSTRAINT "inspection_team_assignments_schedule_id_inspection_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."inspection_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_facility_per_company" ON "facilities" USING btree ("company_id","name","address");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_lines" ADD CONSTRAINT "product_lines_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_line_id_product_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."product_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_line_per_facility" ON "product_lines" USING btree ("facility_id","name");