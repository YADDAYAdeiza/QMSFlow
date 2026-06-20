CREATE TABLE "local_inspection_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"company_id" uuid,
	"inspector_id" uuid,
	"report_doc_number" varchar(100) NOT NULL,
	"type_of_inspection" varchar(10) NOT NULL,
	"current_status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"checklist_raw" jsonb NOT NULL,
	"report_html" text,
	"version_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "local_inspection_reports_report_doc_number_unique" UNIQUE("report_doc_number")
);
--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD CONSTRAINT "local_inspection_reports_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD CONSTRAINT "local_inspection_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_inspection_reports" ADD CONSTRAINT "local_inspection_reports_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;