CREATE TABLE "product_lines_local" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" uuid,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products_local" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_facility_id_facilities_id_fk";
--> statement-breakpoint
ALTER TABLE "facilities" DROP CONSTRAINT "facilities_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "product_lines" DROP CONSTRAINT "product_lines_facility_id_facilities_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_line_id_product_lines_id_fk";
--> statement-breakpoint
ALTER TABLE "risk_assessments" DROP CONSTRAINT "risk_assessments_facility_id_facilities_id_fk";
--> statement-breakpoint
DROP INDEX "unique_facility_per_company";--> statement-breakpoint
DROP INDEX "unique_line_per_facility";--> statement-breakpoint
ALTER TABLE "facilities" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "facilities" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "facilities" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "facilities" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "facilities" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "facilities" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "facilities" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_lines_local" ADD CONSTRAINT "product_lines_local_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_local" ADD CONSTRAINT "products_local_line_id_product_lines_local_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."product_lines_local"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_line_per_facility" ON "product_lines_local" USING btree ("facility_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_product_per_local_line" ON "products_local" USING btree ("line_id","name");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_line_id_product_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."product_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_facility_id_companies_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_line_per_factory" ON "product_lines" USING btree ("company_id","name");--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "facility_id";--> statement-breakpoint
ALTER TABLE "facilities" DROP COLUMN "company_id";--> statement-breakpoint
ALTER TABLE "facilities" DROP COLUMN "latitude";--> statement-breakpoint
ALTER TABLE "facilities" DROP COLUMN "longitude";--> statement-breakpoint
ALTER TABLE "product_lines" DROP COLUMN "facility_id";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "classification";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "target_species";