ALTER TABLE "companies" DROP CONSTRAINT "companies_name_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linked_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_name_address_unique" ON "companies" USING btree ("name","address");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_app_risk" ON "risk_assessments" USING btree ("application_id");--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_application_id_unique" UNIQUE("application_id");