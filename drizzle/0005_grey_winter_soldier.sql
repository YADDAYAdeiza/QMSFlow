ALTER TABLE "qms_timelines" DROP CONSTRAINT "qms_timelines_application_id_applications_id_fk";
--> statement-breakpoint
ALTER TABLE "qms_timelines" ADD CONSTRAINT "qms_timelines_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;