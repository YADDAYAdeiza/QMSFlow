ALTER TABLE "risk_assessments" ALTER COLUMN "overall_risk_rating" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "risk_assessments" DROP COLUMN "other_deficiencies";