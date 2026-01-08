import { pgTable, serial, text, varchar, timestamp, jsonb, integer, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- 1. TABLES ---

// COMPANY TABLE: Parent for search history
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(), 
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// APPLICATIONS TABLE: The Dossier
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  applicationNumber: varchar("application_number", { length: 255 }).notNull().unique(),
  // Replaced Enums with standard text/varchar
  type: varchar("type", { length: 100 }).notNull(), 
  companyId: integer("company_id").references(() => companies.id),
  
  currentPoint: varchar("current_point", { length: 100 }).default('LOD'),
  riskCategory: varchar("risk_category", { length: 50 }),
  
  // JSONB for flexible inputs & multi-division comments
  
  details: jsonb("details").$type<{
    inputs: Record<string, any>; 
    assignedDivisions: string[]; 
    comments: Array<{
      from: string;
      role: string;
      text: string;
      timestamp: string;
    }>;
  }>().default({
    inputs: {},
    assignedDivisions: [],
    comments: []
  }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: text("status").default("PENDING"), // ADD THIS LINE
});


export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).default('Staff'), // 'Staff', 'DDD', 'Director'
  division: varchar("division", { length: 100 }), // 'VMD', 'PAD', etc.
  createdAt: timestamp("created_at").defaultNow(),
});


// QMS TIMING TABLE
// export const qmsTimelines = pgTable("qms_timelines", {
//   id: serial("id").primaryKey(),
//   applicationId: integer("application_id").references(() => applications.id),
//   staffId: uuid("staff_id").references(() => users.id), // Linked to the specific person
//   point: varchar("point", { length: 100 }).notNull(),
//   division: varchar("division", { length: 255 }),
//   startTime: timestamp("start_time").defaultNow(),
//   endTime: timestamp("end_time"),
// });

export const qmsTimelines = pgTable("qms_timelines", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id),
  staffId: text("staff_id"),
  division: text("division"),
  point: text("point"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  details: jsonb("details"), // ENSURE THIS IS HERE SO IT ISN'T DELETED
});

// --- 2. RELATIONS ---
export const companiesRelations = relations(companies, ({ many }) => ({
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  company: one(companies, { fields: [applications.companyId], references: [companies.id] }),
  timelines: many(qmsTimelines),
}));