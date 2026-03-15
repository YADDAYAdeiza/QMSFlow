import { pgTable, serial, text, varchar, timestamp, jsonb, integer, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Master Company List
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(), 
  address: text("address"),
  category: varchar("category", { length: 50 }).notNull().default('LOCAL'), 
  createdAt: timestamp("created_at").defaultNow(),
});

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

// 5. Applications (The Dossier)
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
    }>;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. QMS Timelines
export const qmsTimelines = pgTable("qms_timelines", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id),
  staffId: text("staff_id"),
  division: text("division"),
  point: text("point"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  details: jsonb("details"), 
});

// 7. Users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).default('Staff'), 
  division: varchar("division", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- RELATIONS ---

export const companiesRelations = relations(companies, ({ many }) => ({
  productLines: many(productLines),
  applicationsAsLocal: many(applications, { relationName: "local_app_rel" }),
  applicationsAsForeign: many(applications, { relationName: "foreign_app_rel" }),
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
}));

export const qmsTimelinesRelations = relations(qmsTimelines, ({ one }) => ({
  application: one(applications, {
    fields: [qmsTimelines.applicationId],
    references: [applications.id],
  }),
}));