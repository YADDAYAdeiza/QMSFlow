import { pgTable, unique, serial, varchar, integer, timestamp, uniqueIndex, foreignKey, text, pgPolicy, uuid, numeric, jsonb, index, check, bigint, date, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const entryType = pgEnum("entry_type", ['IMPORT', 'FG', 'LOCAL_USAGE', 'DESTRUCTION', 'EXPORT', 'INVENTORY_DELTA', 'CONSUMPTION'])


export const productLineRisks = pgTable("product_line_risks", {
	id: serial().primaryKey().notNull(),
	lineName: varchar("line_name", { length: 255 }).notNull(),
	complexityScore: integer("complexity_score").notNull(),
	criticalityScore: integer("criticality_score").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("product_line_risks_line_name_unique").on(table.lineName),
]);

export const riskAssessments = pgTable("risk_assessments", {
	id: serial().primaryKey().notNull(),
	facilityId: integer("facility_id"),
	applicationId: integer("application_id"),
	complexityScore: integer("complexity_score"),
	criticalityScore: integer("criticality_score"),
	intrinsicLevel: varchar("intrinsic_level", { length: 10 }),
	sraStatus: text("sra_status").default('FALSE'),
	majorDeficiencies: integer("major_deficiencies").default(0),
	criticalDeficiencies: integer("critical_deficiencies").default(0),
	complianceLevel: varchar("compliance_level", { length: 10 }),
	overallRiskRating: varchar("overall_risk_rating", { length: 10 }),
	nextInspectionDate: timestamp("next_inspection_date", { mode: 'string' }),
	status: varchar({ length: 20 }).default('PARTIAL'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	otherDeficiencies: integer("other_deficiencies").default(0),
}, (table) => [
	uniqueIndex("unique_app_risk").using("btree", table.applicationId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "risk_assessments_application_id_applications_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.facilityId],
			foreignColumns: [companies.id],
			name: "risk_assessments_facility_id_companies_id_fk"
		}).onDelete("cascade"),
	unique("risk_assessments_application_id_unique").on(table.applicationId),
]);

export const justificationReasons = pgTable("justification_reasons", {
	id: serial().primaryKey().notNull(),
	code: text().notNull(),
	description: text().notNull(),
}, (table) => [
	unique("justification_reasons_code_key").on(table.code),
	pgPolicy("Enable read access for authenticated users", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const withdrawalLogs = pgTable("withdrawal_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	permitSubstanceId: uuid("permit_substance_id"),
	quantityWithdrawnKg: numeric("quantity_withdrawn_kg", { precision: 12, scale:  4 }).notNull(),
	withdrawalDate: timestamp("withdrawal_date", { withTimezone: true, mode: 'string' }).defaultNow(),
	inspectorId: uuid("inspector_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.permitSubstanceId],
			foreignColumns: [permitSubstances.id],
			name: "withdrawal_logs_permit_substance_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Allow authenticated read access", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Public Select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Enable read access for authenticated users", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const qmsTimelines = pgTable("qms_timelines", {
	id: serial().primaryKey().notNull(),
	applicationId: integer("application_id"),
	staffId: text("staff_id"),
	point: text(),
	division: text(),
	startTime: timestamp("start_time", { mode: 'string' }).defaultNow(),
	endTime: timestamp("end_time", { mode: 'string' }),
	details: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "qms_timelines_application_id_applications_id_fk"
		}),
]);

export const importerLogisticsNodes = pgTable("importer_logistics_nodes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyName: text("company_name").notNull(),
	depotName: text("depot_name").notNull(),
	state: text().notNull(),
	physicalAddress: text("physical_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
	nodeType: text("node_type").default('DEPOT').notNull(),
	companyId: uuid("company_id"),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companiesAmr.id],
			name: "importer_logistics_nodes_company_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Allow authenticated access to depots", { as: "permissive", for: "all", to: ["authenticated"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("Enable read access for all users", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Enable insert for authenticated users only", { as: "permissive", for: "insert", to: ["authenticated"] }),
]);

export const permitLedgerLogs = pgTable("permit_ledger_logs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	permitId: uuid("permit_id"),
	substanceId: uuid("substance_id"),
	mode: text(),
	quantity: numeric(),
	performedBy: text("performed_by"),
	storagePath: text("storage_path"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.permitId],
			foreignColumns: [permits.id],
			name: "permit_ledger_logs_permit_id_fkey"
		}),
	foreignKey({
			columns: [table.substanceId],
			foreignColumns: [atcCodes.id],
			name: "permit_ledger_logs_substance_id_fkey"
		}),
	pgPolicy("Enable read access for all users", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const companiesAmr = pgTable("companies_amr", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyName: text("company_name").notNull(),
	countryOfOrigin: text("country_of_origin"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`),
}, (table) => [
	unique("companies_amr_company_name_key").on(table.companyName),
	pgPolicy("Allow authenticated users to read companies", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const companies = pgTable("companies", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	address: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	category: varchar({ length: 50 }).default('LOCAL').notNull(),
}, (table) => [
	unique("companies_name_address_category_unique").on(table.name, table.address, table.category),
]);

export const atcCodes = pgTable("atc_codes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	humanAtc: text("human_atc"),
	vetAtc: text("vet_atc"),
	class: text(),
	substance: text(),
	riskPriority: text("risk_priority"),
	dddMg: numeric("ddd_mg"),
	atcLevel3: text("atc_level_3"),
	iuToMgFactor: numeric("iu_to_mg_factor"),
}, (table) => [
	pgPolicy("Allow authenticated users to read atc_codes", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Allow authenticated read", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Allow read access for authenticated users", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Allow staff to view atc codes", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Enable read access for atc_codes", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
]);

export const napamsCache = pgTable("napams_cache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationNumber: varchar("application_number", { length: 255 }),
	productName: varchar("product_name", { length: 255 }).notNull(),
	nafdacNumber: varchar("nafdac_number", { length: 255 }).notNull(),
	activeSubstance: text("active_substance"),
	categoryName: varchar("category_name", { length: 150 }),
	rawPackSize: text("raw_pack_size"),
	applicantName: varchar("applicant_name", { length: 255 }),
	applicantPhone: varchar("applicant_phone", { length: 100 }),
	applicantEmail: varchar("applicant_email", { length: 255 }),
	applicantAddress: text("applicant_address"),
	manufacturerName: varchar("manufacturer_name", { length: 255 }),
	manufacturerCountry: varchar("manufacturer_country", { length: 100 }),
	manufacturerAddress: text("manufacturer_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
	manufacturerPhone: varchar("manufacturer_phone", { length: 255 }),
	manufacturerEmail: varchar("manufacturer_email", { length: 255 }),
	dosageForm: varchar("dosage_form", { length: 255 }),
	pharmacologicalClass: varchar("pharmacological_class", { length: 255 }),
}, (table) => [
	index("idx_napams_cache_nafdac_number").using("btree", sql`lower((nafdac_number)::text)`),
	pgPolicy("Allow authenticated staff to read NAPAMS reference data", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const permits2 = pgTable("permits_2", {
	id: uuid(),
	permitNumber: text("permit_number"),
	companyName: text("company_name"),
	status: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	validity: text(),
	productName: text("product_name"),
	shippingPackSize: text("shipping_pack_size"),
	dirType: text("dir_type"),
	activeSubstance: text("active_substance"),
	routeOfAdministration: text("route_of_administration"),
	countryOfOrigin: text("country_of_origin"),
	strength: text(),
	dosageForm: text("dosage_form"),
	therapeuticClass: text("therapeutic_class"),
	atcId: uuid("atc_id"),
});

export const ledgerEntries = pgTable("ledger_entries", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	entryType: entryType("entry_type").notNull(),
	apiMassMg: numeric("api_mass_mg").notNull(),
	purityFactor: numeric("purity_factor").default('1.0'),
	entityId: uuid("entity_id"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
	metadata: jsonb(),
	atcId: uuid("atc_id"),
	dddConsumed: numeric("ddd_consumed").default('0'),
	originWarehouse: text("origin_warehouse"),
	originState: text("origin_state"),
	destinationState: text("destination_state"),
	geopoliticalZone: text("geopolitical_zone"),
	targetSpecies: text("target_species"),
	packQuantity: numeric("pack_quantity"),
}, (table) => [
	index("idx_ledger_geo").using("btree", table.geopoliticalZone.asc().nullsLast().op("text_ops"), table.destinationState.asc().nullsLast().op("text_ops")),
	index("idx_ledger_metadata").using("gin", table.metadata.asc().nullsLast().op("jsonb_ops")),
	index("idx_ledger_species").using("btree", table.targetSpecies.asc().nullsLast().op("text_ops")),
	index("idx_ledger_type").using("btree", table.entryType.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [permits.id],
			name: "fk_ledger_permits"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.atcId],
			foreignColumns: [atcCodes.id],
			name: "ledger_entries_atc_id_fkey"
		}),
	pgPolicy("Allow authenticated users to insert entries", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`true`  }),
	pgPolicy("Allow authenticated users to view entries", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Allow authenticated users to insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Allow authenticated users to select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Allow authenticated read", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Allow authenticated insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Enable read access for all users", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 50 }).default('Staff'),
	division: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	linkedAt: timestamp("linked_at", { mode: 'string' }),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const permitSubstances = pgTable("permit_substances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	permitId: uuid("permit_id"),
	substanceId: uuid("substance_id").notNull(),
	quantityKg: numeric("quantity_kg", { precision: 12, scale:  4 }).notNull(),
	type: text(),
	authorizedDate: timestamp("authorized_date", { withTimezone: true, mode: 'string' }).defaultNow(),
	justificationId: integer("justification_id"),
}, (table) => [
	foreignKey({
			columns: [table.substanceId],
			foreignColumns: [atcCodes.id],
			name: "fk_atc_codes"
		}),
	foreignKey({
			columns: [table.justificationId],
			foreignColumns: [justificationReasons.id],
			name: "permit_substances_justification_id_fkey"
		}),
	foreignKey({
			columns: [table.permitId],
			foreignColumns: [permits.id],
			name: "permit_substances_permit_id_fkey"
		}),
	pgPolicy("Allow authenticated read access", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Public Select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Enable read access for authenticated users", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Allow authenticated insert access", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Enable update for users", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("Enable insert for users", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Enable delete for users", { as: "permissive", for: "delete", to: ["authenticated"] }),
	pgPolicy("Allow service_role full access", { as: "permissive", for: "all", to: ["service_role"] }),
	pgPolicy("Allow read access for authenticated users", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Allow staff to view permit substances", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("permit_substances_type_check", sql`type = ANY (ARRAY['ORIGINAL'::text, 'AMENDMENT'::text])`),
]);

export const permits = pgTable("permits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	permitNumber: text("permit_number").notNull(),
	status: text().default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	validity: text().default('Active'),
	productName: text("product_name"),
	shippingPackSize: text("shipping_pack_size"),
	dirType: text("dir_type").default('VMD'),
	activeSubstance: text("active_substance"),
	routeOfAdministration: text("route_of_administration"),
	strength: text(),
	dosageForm: text("dosage_form"),
	therapeuticClass: text("therapeutic_class"),
	atcId: uuid("atc_id"),
	companyId: uuid("company_id"),
}, (table) => [
	index("idx_permits_company_id").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.atcId],
			foreignColumns: [atcCodes.id],
			name: "permits_atc_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companiesAmr.id],
			name: "permits_company_id_fkey"
		}).onDelete("set null"),
	unique("permits_permit_number_key").on(table.permitNumber),
	pgPolicy("Allow authenticated read access", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Public Select", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Enable read access for authenticated users", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Allow authenticated insert access", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Allow service_role full access", { as: "permissive", for: "all", to: ["service_role"] }),
	pgPolicy("Allow read access for authenticated users", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Allow staff to view permits", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const importerInventories = pgTable("importer_inventories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	inventoryDistribution: jsonb("inventory_distribution").default({"depots":[],"central_warehouse":[]}).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
	index("idx_importer_inventories_distribution").using("gin", table.inventoryDistribution.asc().nullsLast().op("jsonb_ops")),
	unique("importer_inventories_company_name_key").on(table.companyName),
	pgPolicy("vmd_staff_read_all", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'VMD_STAFF'::text)` }),
	pgPolicy("mah_read_own_inventory", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const applications = pgTable("applications", {
	id: serial().primaryKey().notNull(),
	applicationNumber: varchar("application_number", { length: 255 }).notNull(),
	type: varchar({ length: 100 }).notNull(),
	companyId: integer("company_id"),
	currentPoint: varchar("current_point", { length: 100 }).default('Director Review'),
	details: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	status: text().default('PENDING'),
	foreignFactoryId: integer("foreign_factory_id"),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "applications_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.foreignFactoryId],
			foreignColumns: [companies.id],
			name: "applications_foreign_factory_id_companies_id_fk"
		}),
	unique("applications_application_number_unique").on(table.applicationNumber),
]);

export const companyAffiliations = pgTable("company_affiliations", {
	id: serial().primaryKey().notNull(),
	localCompanyId: integer("local_company_id"),
	foreignFactoryId: integer("foreign_factory_id"),
}, (table) => [
	uniqueIndex("unique_link").using("btree", table.localCompanyId.asc().nullsLast().op("int4_ops"), table.foreignFactoryId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.foreignFactoryId],
			foreignColumns: [companies.id],
			name: "company_affiliations_foreign_factory_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.localCompanyId],
			foreignColumns: [companies.id],
			name: "company_affiliations_local_company_id_companies_id_fk"
		}),
]);

export const localInspectionReports = pgTable("local_inspection_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: integer("application_id").notNull(),
	companyId: integer("company_id").notNull(),
	inspectorId: uuid("inspector_id"),
	reportDocNumber: varchar("report_doc_number", { length: 100 }).notNull(),
	typeOfInspection: varchar("type_of_inspection", { length: 10 }).notNull(),
	currentStatus: varchar("current_status", { length: 50 }).default('LOD_INTAKE').notNull(),
	checklistRaw: jsonb("checklist_raw").notNull(),
	reportHtml: text("report_html"),
	versionHistory: jsonb("version_history").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "local_inspection_reports_application_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "local_inspection_reports_company_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.inspectorId],
			foreignColumns: [users.id],
			name: "local_inspection_reports_inspector_id_fkey"
		}),
	unique("local_inspection_reports_report_doc_number_key").on(table.reportDocNumber),
]);

export const products = pgTable("products", {
	id: serial().primaryKey().notNull(),
	lineId: integer("line_id"),
	name: text().notNull(),
	facilityId: uuid("facility_id"),
}, (table) => [
	uniqueIndex("unique_product_per_line").using("btree", table.lineId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.facilityId],
			foreignColumns: [facilities.id],
			name: "products_facility_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.lineId],
			foreignColumns: [productLines.id],
			name: "products_line_id_product_lines_id_fk"
		}),
]);

export const productLines = pgTable("product_lines", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	name: varchar({ length: 255 }).notNull(),
	facilityId: uuid("facility_id"),
}, (table) => [
	uniqueIndex("unique_line_per_factory").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "product_lines_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.facilityId],
			foreignColumns: [facilities.id],
			name: "product_lines_facility_id_fkey"
		}).onDelete("set null"),
]);

export const capaSubmissions = pgTable("capa_submissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	applicationId: bigint("application_id", { mode: "number" }),
	refNumber: varchar("ref_number", { length: 100 }).notNull(),
	status: varchar({ length: 50 }).default('OPEN'),
	capaItems: jsonb("capa_items").default([]).notNull(),
	signatures: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "capa_submissions_application_id_fkey"
		}).onDelete("cascade"),
	unique("capa_submissions_application_id_key").on(table.applicationId),
	pgPolicy("Allow public select", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Allow public insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Allow public update", { as: "permissive", for: "update", to: ["public"] }),
]);

export const inspectionTeamAssignments = pgTable("inspection_team_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	scheduleId: uuid("schedule_id").notNull(),
	inspectorId: uuid("inspector_id").notNull(),
	role: varchar({ length: 50 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.inspectorId],
			foreignColumns: [users.id],
			name: "inspection_team_assignments_inspector_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.scheduleId],
			foreignColumns: [inspectionSchedules.id],
			name: "inspection_team_assignments_schedule_id_fkey"
		}).onDelete("cascade"),
	unique("unique_inspector_per_schedule").on(table.scheduleId, table.inspectorId),
	pgPolicy("Allow read access to inspection teams for authorized staff", { as: "permissive", for: "select", to: ["authenticated", "service_role"], using: sql`true` }),
	check("inspection_team_assignments_role_check", sql`(role)::text = ANY ((ARRAY['TEAM_LEADER'::character varying, 'CO_INSPECTOR'::character varying, 'TRAINEE_INSPECTOR'::character varying])::text[])`),
]);

export const inspectionSchedules = pgTable("inspection_schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationId: integer("application_id").notNull(),
	scheduledDate: date("scheduled_date").notNull(),
	status: varchar({ length: 50 }).default('SCHEDULED'),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.applicationId],
			foreignColumns: [applications.id],
			name: "inspection_schedules_application_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "inspection_schedules_created_by_fkey"
		}),
	unique("unique_active_application_inspection").on(table.applicationId),
	check("inspection_schedules_status_check", sql`(status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])`),
]);

export const facilities = pgTable("facilities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	address: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
export const amsRegionalSummary = pgView("ams_regional_summary", {	geopoliticalZone: text("geopolitical_zone"),
	totalDdd: numeric("total_ddd"),
	poultryDdd: numeric("poultry_ddd"),
}).as(sql`SELECT geopolitical_zone, sum(ddd_consumed) AS total_ddd, sum( CASE WHEN target_species ~~* '%Poultry%'::text THEN ddd_consumed ELSE 0::numeric END) AS poultry_ddd FROM ledger_entries WHERE entry_type = 'CONSUMPTION'::entry_type GROUP BY geopolitical_zone`);