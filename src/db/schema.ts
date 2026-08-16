import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  date,
  timestamp,
  doublePrecision,
  jsonb,
  integer,
  uuid,
  index,
  customType,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. MASTER TABLES & SYSTEM CONFIGURATIONS
// ==========================================

// 1. Master Company List
export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    category: varchar("category", { length: 50 }).notNull().default("LOCAL"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    companySiteComboUnique: uniqueIndex("companies_name_address_unique").on(
      table.name,
      table.address
    ),
  })
);

export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "cascade",
  }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  company: one(companies, {
    fields: [facilities.companyId],
    references: [companies.id],
  }),
  productLines: many(productLinesLocal),
  applications: many(applications),
  riskAssessments: many(riskAssessments),
}));

// 2. Affiliation Bridge
export const companyAffiliations = pgTable(
  "company_affiliations",
  {
    id: serial("id").primaryKey(),
    localCompanyId: integer("local_company_id").references(() => companies.id),
    foreignFactoryId: integer("foreign_factory_id").references(() => companies.id),
  },
  (table) => ({
    uniqueAffiliation: uniqueIndex("unique_link").on(
      table.localCompanyId,
      table.foreignFactoryId
    ),
  })
);

// 3. Product Lines
export const productLines = pgTable(
  "product_lines",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").references(() => companies.id),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    uniqueLine: uniqueIndex("unique_line_per_factory").on(
      table.companyId,
      table.name
    ),
  })
);

export const productLinesLocal = pgTable(
  "product_lines_local",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id").references(() => facilities.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_line_per_facility").on(table.facilityId, table.name),
  ]
);

export const productLinesLocalRelations = relations(
  productLinesLocal,
  ({ one, many }) => ({
    facility: one(facilities, {
      fields: [productLinesLocal.facilityId],
      references: [facilities.id],
    }),
    products: many(productsLocal),
  })
);

// 4. Products
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    lineId: integer("line_id").references(() => productLines.id),
    name: text("name").notNull(),
  },
  (table) => ({
    uniqueProduct: uniqueIndex("unique_product_per_line").on(
      table.lineId,
      table.name
    ),
  })
);

// import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
// import { productLinesLocal } from "./schema"; // adjust path as needed

export const productsLocal = pgTable("products_local", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineId: uuid("line_id").references(() => productLinesLocal.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  classification: text("classification"),
  targetSpecies: text("target_species"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const productsLocalRelations = relations(productsLocal, ({ one }) => ({
  productLine: one(productLinesLocal, {
    fields: [productsLocal.lineId],
    references: [productLinesLocal.id],
  }),
}));

// 5. Applications (UPGRADED: Added facilityId FK)
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  applicationNumber: varchar("application_number", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 100 }).notNull(),
  companyId: integer("company_id").references(() => companies.id),
  foreignFactoryId: integer("foreign_factory_id").references(() => companies.id),
  facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "set null" }), // <--- ADDED THIS
  currentPoint: varchar("current_point", { length: 100 }).default("Divisional Deputy Director"),
  status: text("status").default("PENDING"),
  details: jsonb("details").$type<{
    assignedDivisions: string[];
    productLines: Array<{
      lineName: string;
      products: Array<{ name: string; classification?: string; targetSpecies?: string }>;
    }>;
    notificationEmail?: string;
    lodRemarks?: string;
    poaUrl?: string;
    inspectionReportUrl?: string;
    archived_path?: string;
    comments: Array<{
      from: string;
      role: string;
      text: string;
      timestamp: string;
      attachmentUrl?: string;
    }>;
    isComplianceReview?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. QMS Timelines
export const qmsTimelines = pgTable("qms_timelines", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, {
    onDelete: "cascade",
  }),
  staffId: text("staff_id"),
  division: text("division"),
  point: text("point"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  details: jsonb("details"),
});

// 7. Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).default("Staff"),
  division: varchar("division", { length: 100 }),
  linkedAt: timestamp("linked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 8. Product Line Risks
export const productLineRisks = pgTable("product_line_risks", {
  id: serial("id").primaryKey(),
  lineName: varchar("line_name", { length: 255 }).notNull().unique(),
  complexityScore: integer("complexity_score").notNull(),
  criticalityScore: integer("criticality_score").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 9. Risk Assessments (UPGRADED: Changed facilityId from integer to uuid)
export const riskAssessments = pgTable(
  "risk_assessments",
  {
    id: serial("id").primaryKey(),
    facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "cascade" }), // <--- UPDATED TO UUID
    applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).unique(),
    complexityScore: integer("complexity_score"),
    criticalityScore: integer("criticality_score"),
    intrinsicLevel: varchar("intrinsic_level", { length: 10 }),
    sraStatus: text("sra_status").default("FALSE"),
    majorDeficiencies: integer("major_deficiencies").default(0),
    criticalDeficiencies: integer("critical_deficiencies").default(0),
    otherDeficiencies: integer("other_deficiencies").default(0),
    complianceLevel: varchar("compliance_level", { length: 10 }),
    overallRiskRating: varchar("overall_risk_rating", { length: 10 }),
    nextInspectionDate: timestamp("next_inspection_date"),
    status: varchar("status", { length: 20 }).default("PARTIAL"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueAppRisk: uniqueIndex("unique_app_risk").on(table.applicationId),
  })
);

// 11. CAPA Submissions
export const capaSubmissions = pgTable("capa_submissions", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id),
  refNumber: varchar("ref_number", { length: 255 }),
  status: varchar("status", { length: 50 }).default("PENDING_VERIFICATION"),
  capaItems: jsonb("capa_items"),
  signatures: jsonb("signatures"),
  createdAt: text("created_at"),
  submittedAt: text("submitted_at"),
});

// 12. Inspection Schedules
export const inspectionSchedules = pgTable("inspection_schedules", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  applicationId: integer("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  batchId: uuid("batch_id").references(() => scheduleBatches.id, { onDelete: "cascade" }),
  scheduledDate: timestamp("scheduled_date", { mode: "string" }).notNull(),
  status: varchar("status", { length: 50 }).default("SCHEDULED"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 13. Inspection Team Assignments
export const inspectionTeamAssignments = pgTable("inspection_team_assignments", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  scheduleId: uuid("schedule_id")
    .references(() => inspectionSchedules.id, { onDelete: "cascade" })
    .notNull(),
  inspectorId: uuid("inspector_id").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scheduleBatches = pgTable("schedule_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchReference: varchar("batch_reference", { length: 100 })
    .notNull()
    .unique(),
  title: varchar("title", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 50 })
    .notNull()
    .default("PENDING_RECOMMENDATION"),
  currentPoint: varchar("current_point", { length: 100 })
    .notNull()
    .default("Divisional Deputy Director IRSD Routing"),
  endorsedBy: uuid("endorsed_by"),
  approvedBy: uuid("approved_by"),
  history: jsonb("history").$type<Array<{
    action: string;
    actorRole: string;
    actorId?: string;
    comments: string;
    fromStep?: string;
    toStep?: string;
    timestamp: string;
  }>>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

const generatedDays = customType<{ data: number }>({
  dataType() {
    return "int GENERATED ALWAYS AS (EXTRACT(DAY FROM (capa_closed_at - capa_issued_at))) STORED";
  },
});

export const localInspectionReports = pgTable(
  "local_inspection_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    reportDocNumber: varchar("report_doc_number", { length: 100 })
      .notNull()
      .unique(),
    typeOfInspection: varchar("type_of_inspection", { length: 20 }).notNull(),
    facilityState: varchar("facility_state", { length: 100 }),
    criticalCount: integer("critical_count").default(0).notNull(),
    majorCount: integer("major_count").default(0).notNull(),
    otherCount: integer("other_count").default(0).notNull(),
    totalObservations: integer("total_observations").default(0).notNull(),
    finalRecommendation: varchar("final_recommendation", { length: 50 })
      .default("PENDING")
      .notNull(),
    capaRequired: boolean("capa_required").default(false).notNull(),
    capaIssuedAt: timestamp("capa_issued_at", { mode: "date" }),
    capaSubmittedAt: timestamp("capa_submitted_at", { mode: "date" }),
    capaClosedAt: timestamp("capa_closed_at", { mode: "date" }),
    capaTurnaroundDays: generatedDays("capa_turnaround_days"),
    createdAt: timestamp("created_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    recommendationIdx: index("idx_reports_recommendation").on(table.finalRecommendation),
    criticalCountIdx: index("idx_reports_critical_count").on(table.criticalCount),
    capaDaysIdx: index("idx_reports_capa_days").on(table.capaTurnaroundDays),
  })
);

export const inspectionObservationsAnalytics = pgTable(
  "inspection_observations_analytics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => localInspectionReports.id, { onDelete: "cascade" }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    qualitySystem: varchar("quality_system", { length: 100 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    rootCauseCategory: varchar("root_cause_category", { length: 100 }),
    observationText: text("observation_text").notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    reportIdIdx: index("idx_obs_report_id").on(table.reportId),
    companyIdIdx: index("idx_obs_company_id").on(table.companyId),
    qualitySystemIdx: index("idx_obs_quality_system").on(table.qualitySystem),
    severityIdx: index("idx_obs_severity").on(table.severity),
    rootCauseIdx: index("idx_obs_root_cause").on(table.rootCauseCategory),
  })
);

// ==========================================
// --- RELATIONS ---
// ==========================================

export const companiesRelations = relations(companies, ({ many }) => ({
  productLines: many(productLines),
  applicationsAsLocal: many(applications, { relationName: "local_app_rel" }),
  applicationsAsForeign: many(applications, { relationName: "foreign_app_rel" }),
  facilities: many(facilities),
}));

export const productLinesRelations = relations(productLines, ({ one, many }) => ({
  company: one(companies, { fields: [productLines.companyId], references: [companies.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  line: one(productLines, { fields: [products.lineId], references: [productLines.id] }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  localApplicant: one(companies, {
    fields: [applications.companyId],
    references: [companies.id],
    relationName: "local_app_rel",
  }),
  foreignFactory: one(companies, {
    fields: [applications.foreignFactoryId],
    references: [companies.id],
    relationName: "foreign_app_rel",
  }),
  facility: one(facilities, {
    fields: [applications.facilityId],
    references: [facilities.id],
  }),
  timelines: many(qmsTimelines),
  riskAssessments: many(riskAssessments),
  schedules: many(inspectionSchedules),
}));

export const qmsTimelinesRelations = relations(qmsTimelines, ({ one }) => ({
  application: one(applications, {
    fields: [qmsTimelines.applicationId],
    references: [applications.id],
  }),
  staff: one(users, {
    fields: [qmsTimelines.staffId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  timelines: many(qmsTimelines),
  reportsInspected: many(localInspectionReports),
  assignments: many(inspectionTeamAssignments),
}));

export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
  facility: one(facilities, { fields: [riskAssessments.facilityId], references: [facilities.id] }),
  application: one(applications, { fields: [riskAssessments.applicationId], references: [applications.id] }),
}));

export const capaSubmissionsRelations = relations(capaSubmissions, ({ one }) => ({
  application: one(applications, { fields: [capaSubmissions.applicationId], references: [applications.id] }),
}));

export const inspectionSchedulesRelations = relations(inspectionSchedules, ({ one, many }) => ({
  application: one(applications, { fields: [inspectionSchedules.applicationId], references: [applications.id] }),
  teamAssignments: many(inspectionTeamAssignments),
}));

export const inspectionTeamAssignmentsRelations = relations(inspectionTeamAssignments, ({ one }) => ({
  schedule: one(inspectionSchedules, { fields: [inspectionTeamAssignments.scheduleId], references: [inspectionSchedules.id] }),
  inspectorProfile: one(users, { fields: [inspectionTeamAssignments.inspectorId], references: [users.id] }),
}));

export const localInspectionReportsRelations = relations(
  localInspectionReports,
  ({ one, many }) => ({
    application: one(applications, {
      fields: [localInspectionReports.applicationId],
      references: [applications.id],
    }),
    company: one(companies, {
      fields: [localInspectionReports.companyId],
      references: [companies.id],
    }),
    observations: many(inspectionObservationsAnalytics),
  })
);

export const inspectionObservationsAnalyticsRelations = relations(
  inspectionObservationsAnalytics,
  ({ one }) => ({
    report: one(localInspectionReports, {
      fields: [inspectionObservationsAnalytics.reportId],
      references: [localInspectionReports.id],
    }),
    company: one(companies, {
      fields: [inspectionObservationsAnalytics.companyId],
      references: [companies.id],
    }),
  })
);