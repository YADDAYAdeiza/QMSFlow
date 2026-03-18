CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_number" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"company_id" integer,
	"foreign_factory_id" integer,
	"current_point" varchar(100) DEFAULT 'Director Review',
	"status" text DEFAULT 'PENDING',
	"details" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "applications_application_number_unique" UNIQUE("application_number")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"category" varchar(50) DEFAULT 'LOCAL' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "companies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "company_affiliations" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_company_id" integer,
	"foreign_factory_id" integer
);
--> statement-breakpoint
CREATE TABLE "product_line_risks" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_name" varchar(255) NOT NULL,
	"complexity_score" integer NOT NULL,
	"criticality_score" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "product_line_risks_line_name_unique" UNIQUE("line_name")
);
--> statement-breakpoint
CREATE TABLE "product_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qms_timelines" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer,
	"staff_id" text,
	"division" text,
	"point" text,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "risk_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer,
	"application_id" integer,
	"complexity_score" integer,
	"criticality_score" integer,
	"intrinsic_level" varchar(10),
	"sra_status" text DEFAULT 'FALSE',
	"major_deficiencies" integer DEFAULT 0,
	"critical_deficiencies" integer DEFAULT 0,
	"compliance_level" varchar(10),
	"overall_risk_rating" varchar(1),
	"next_inspection_date" timestamp,
	"status" varchar(20) DEFAULT 'PARTIAL',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'Staff',
	"division" varchar(100),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_foreign_factory_id_companies_id_fk" FOREIGN KEY ("foreign_factory_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_affiliations" ADD CONSTRAINT "company_affiliations_local_company_id_companies_id_fk" FOREIGN KEY ("local_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_affiliations" ADD CONSTRAINT "company_affiliations_foreign_factory_id_companies_id_fk" FOREIGN KEY ("foreign_factory_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_lines" ADD CONSTRAINT "product_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_line_id_product_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."product_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qms_timelines" ADD CONSTRAINT "qms_timelines_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_facility_id_companies_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_link" ON "company_affiliations" USING btree ("local_company_id","foreign_factory_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_line_per_factory" ON "product_lines" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_product_per_line" ON "products" USING btree ("line_id","name");