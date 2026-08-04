ALTER TABLE "facilities" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "facilities" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;