import { pgTable, serial, text, varchar, boolean, date, timestamp, doublePrecision, jsonb, integer, uuid, index, customType, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. MASTER TABLES & SYSTEM CONFIGURATIONS
// ==========================================

// 1. Master Company List
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // FIX: Removed .unique() from here
  address: text("address"),
  category: varchar("category", { length: 50 }).notNull().default('LOCAL'), 
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // FIX: This composite index enforces uniqueness across the name + address combination
  companySiteComboUnique: uniqueIndex("companies_name_address_unique").on(table.name, table.address),
}));

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

// Optional: Drizzle Relations setup (if you query facilities with companies)
export const facilitiesRelations = relations(facilities, ({ one }) => ({
  company: one(companies, {
    fields: [facilities.companyId],
    references: [companies.id],
  }),
}));

// 2. Affiliation Bridge
export const companyAffiliations = pgTable("company_affiliations", {
  id: serial("id").primaryKey(),
  localCompanyId: integer("local_company_id").references(() => companies.id),
  foreignFactoryId: integer("foreign_factory_id").references(() => companies.id),
}, (table) => ({
  uniqueAffiliation: uniqueIndex("unique_link").on(table.localCompanyId, table.foreignFactoryId),
}));

// 3. Product Lines
export const productLines = pgTable("product_lines", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: varchar("name", { length: 255 }).notNull(), 
}, (table) => ({
  uniqueLine: uniqueIndex("unique_line_per_factory").on(table.companyId, table.name),
}));

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

// Drizzle Relations setup
export const productLinesLocalRelations = relations(productLinesLocal, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [productLinesLocal.facilityId],
    references: [facilities.id],
  }),
  products: many(productsLocal),
}));

// 4. Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  lineId: integer("line_id").references(() => productLines.id),
  name: text("name").notNull(),
}, (table) => ({
  uniqueProduct: uniqueIndex("unique_product_per_line").on(table.lineId, table.name),
}));

export const productsLocal = pgTable("products_local", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineId: uuid("line_id").references(() => productLinesLocal.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  classification: text("classification"),
  targetSpecies: text("target_species"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

// Drizzle Relations setup for queries with product lines
export const productsLocalRelations = relations(productsLocal, ({ one }) => ({
  productLine: one(productLinesLocal, {
    fields: [productsLocal.lineId],
    references: [productLinesLocal.id],
  }),
}));

// 5. Applications
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  applicationNumber: varchar("application_number", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 100 }).notNull(), 
  companyId: integer("company_id").references(() => companies.id),
  foreignFactoryId: integer("foreign_factory_id").references(() => companies.id),
  currentPoint: varchar("current_point", { length: 100 }).default('Director Review'),
  status: text("status").default("PENDING"),
  details: jsonb("details").$type<{
    assignedDivisions: string[]; 
    productLines: Array<{
      lineName: string;
      products: Array<{ name: string }>;
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

// 6. QMS Timelines (Updated for automatic cascade delete support)
export const qmsTimelines = pgTable("qms_timelines", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: 'cascade' }),
  staffId: text("staff_id"), // Maps to users.id (UUID text string representation)
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
  role: varchar("role", { length: 50 }).default('Staff'), 
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

// 9. Risk Assessments
export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  facilityId: integer("facility_id").references(() => companies.id, { onDelete: 'cascade' }),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: 'cascade' }).unique(), 
  complexityScore: integer("complexity_score"),
  criticalityScore: integer("criticality_score"),
  intrinsicLevel: varchar("intrinsic_level", { length: 10 }), 
  sraStatus: text("sra_status").default('FALSE'), 
  majorDeficiencies: integer("major_deficiencies").default(0),
  criticalDeficiencies: integer("critical_deficiencies").default(0),
  otherDeficiencies: integer("other_deficiencies").default(0),
  complianceLevel: varchar("compliance_level", { length: 10 }),
  overallRiskRating: varchar("overall_risk_rating", { length: 10 }), 
  nextInspectionDate: timestamp("next_inspection_date"),
  status: varchar("status", { length: 20 }).default('PARTIAL'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueAppRisk: uniqueIndex("unique_app_risk").on(table.applicationId),
}));

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

// 12. Inspection Schedules (Direct SQL sync)
export const inspectionSchedules = pgTable("inspection_schedules", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  applicationId: integer("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  batchId: uuid("batch_id").references(() => scheduleBatches.id, { onDelete: "cascade" }), // <--- ADD THIS
  scheduledDate: timestamp("scheduled_date", { mode: "string" }).notNull(), // using string mode to easily parse date formats without zone shifting
  status: varchar("status", { length: 50 }).default("SCHEDULED"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 13. Inspection Team Assignments (Direct SQL sync)
export const inspectionTeamAssignments = pgTable("inspection_team_assignments", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  scheduleId: uuid("schedule_id")
    .references(() => inspectionSchedules.id, { onDelete: "cascade" })
    .notNull(),
  inspectorId: uuid("inspector_id").notNull(), // Links directly to auth.users in DB
  role: varchar("role", { length: 50 }).notNull(), // 'TEAM_LEADER' | 'CO_INSPECTOR' | 'TRAINEE_INSPECTOR'
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

// Custom type helper for Postgres GENERATED ALWAYS AS STORED columns in Drizzle
const generatedDays = customType<{ data: number }>({
  dataType() {
    return "int GENERATED ALWAYS AS (EXTRACT(DAY FROM (capa_closed_at - capa_issued_at))) STORED";
  },
});

// ============================================================================
// 1. PARENT TABLE: Local Inspection Reports (Header & High-Level Metrics)
// ============================================================================
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
    typeOfInspection: varchar("type_of_inspection", { length: 20 }).notNull(), // PRI, RI, Re-Inspection
    facilityState: varchar("facility_state", { length: 100 }), // Geographic indexing

    // Objective Deficit Counts
    criticalCount: integer("critical_count").default(0).notNull(),
    majorCount: integer("major_count").default(0).notNull(),
    otherCount: integer("other_count").default(0).notNull(),
    totalObservations: integer("total_observations").default(0).notNull(),

    // Final Adjudication & Regulatory Status
    finalRecommendation: varchar("final_recommendation", { length: 50 })
      .default("PENDING")
      .notNull(), // APPROVED, CAPA_PENDING, REJECTED

    // CAPA Metrics & Turnaround Velocity
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
    recommendationIdx: index("idx_reports_recommendation").on(
      table.finalRecommendation
    ),
    criticalCountIdx: index("idx_reports_critical_count").on(
      table.criticalCount
    ),
    capaDaysIdx: index("idx_reports_capa_days").on(table.capaTurnaroundDays),
  })
);

// ============================================================================
// 2. CHILD TABLE: Inspection Observations Analytics (Granular Findings)
// ============================================================================
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

    // Quality System Domain & Severity Mapping
    qualitySystem: varchar("quality_system", { length: 100 }).notNull(), // e.g. 'Premises and Equipment', 'Personnel'
    severity: varchar("severity", { length: 20 }).notNull(), // 'CRITICAL', 'MAJOR', 'OTHER'

    // Analytical & Policy Categorization
    rootCauseCategory: varchar("root_cause_category", { length: 100 }), // e.g. 'SOP Deficit', 'Training Failure'
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
  riskAssessments: many(riskAssessments),
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
    relationName: "local_app_rel"
  }),
  foreignFactory: one(companies, { 
    fields: [applications.foreignFactoryId], 
    references: [companies.id],
    relationName: "foreign_app_rel"
  }),
  timelines: many(qmsTimelines),
  riskAssessments: many(riskAssessments), 
  schedules: many(inspectionSchedules), // Relational mapping to inspection system
}));

// UPDATED: Linked qmsTimelines to both Applications and Users
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

// ADDED: Backwards relation definition so users can load their historical/active timelines
export const usersRelations = relations(users, ({ many }) => ({
  timelines: many(qmsTimelines),
  reportsInspected: many(localInspectionReports),
  assignments: many(inspectionTeamAssignments), // Tracks actual field assignments linked to user records
}));

export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
  facility: one(companies, { fields: [riskAssessments.facilityId], references: [companies.id] }),
  application: one(applications, { fields: [riskAssessments.applicationId], references: [applications.id] }),
}));

export const capaSubmissionsRelations = relations(capaSubmissions, ({ one }) => ({
  application: one(applications, { fields: [capaSubmissions.applicationId], references: [applications.id] }),
}));

// NEW RELATIONS FOR FIELD DESK WORKFLOWS
export const inspectionSchedulesRelations = relations(inspectionSchedules, ({ one, many }) => ({
  application: one(applications, { fields: [inspectionSchedules.applicationId], references: [applications.id] }),
  teamAssignments: many(inspectionTeamAssignments),
}));

export const inspectionTeamAssignmentsRelations = relations(inspectionTeamAssignments, ({ one }) => ({
  schedule: one(inspectionSchedules, { fields: [inspectionTeamAssignments.scheduleId], references: [inspectionSchedules.id] }),
  inspectorProfile: one(users, { fields: [inspectionTeamAssignments.inspectorId], references: [users.id] }),
}));


// ============================================================================
// 3. DRIZZLE RELATIONS DEFINITIONS
// ============================================================================
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

