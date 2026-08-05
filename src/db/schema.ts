import { pgTable, serial, text, varchar, timestamp, jsonb, integer, uuid, uniqueIndex } from "drizzle-orm/pg-core";
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

// 4. Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  lineId: integer("line_id").references(() => productLines.id),
  name: text("name").notNull(),
}, (table) => ({
  uniqueProduct: uniqueIndex("unique_product_per_line").on(table.lineId, table.name),
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

// 10. Local Inspection Reports
export const localInspectionReports = pgTable("local_inspection_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: integer("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  companyId: integer("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  inspectorId: uuid("inspector_id")
    .references(() => users.id),
  reportDocNumber: varchar("report_doc_number", { length: 100 }).unique().notNull(),
  typeOfInspection: varchar("type_of_inspection", { length: 10 }).notNull(),
  currentStatus: varchar("current_status", { length: 50 }).default("LOD_INTAKE").notNull(),
  checklistRaw: jsonb("checklist_raw").notNull(),
  reportHtml: text("report_html"),
  versionHistory: jsonb("version_history").$type<Array<{
    modifiedBy: string;
    updatedAt: string;
    changes: string;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

export const localInspectionReportsRelations = relations(localInspectionReports, ({ one }) => ({
  application: one(applications, { fields: [localInspectionReports.applicationId], references: [applications.id] }),
  company: one(companies, { fields: [localInspectionReports.companyId], references: [companies.id] }),
  inspector: one(users, { fields: [localInspectionReports.inspectorId], references: [users.id] }),
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