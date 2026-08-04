import { relations } from "drizzle-orm/relations";
import { applications, riskAssessments, companies, permitSubstances, withdrawalLogs, qmsTimelines, companiesAmr, importerLogisticsNodes, permits, permitLedgerLogs, atcCodes, ledgerEntries, justificationReasons, companyAffiliations, localInspectionReports, users, facilities, products, productLines, capaSubmissions, usersInAuth, inspectionTeamAssignments, inspectionSchedules } from "./schema";

export const riskAssessmentsRelations = relations(riskAssessments, ({one}) => ({
	application: one(applications, {
		fields: [riskAssessments.applicationId],
		references: [applications.id]
	}),
	company: one(companies, {
		fields: [riskAssessments.facilityId],
		references: [companies.id]
	}),
}));

export const applicationsRelations = relations(applications, ({one, many}) => ({
	riskAssessments: many(riskAssessments),
	qmsTimelines: many(qmsTimelines),
	company_companyId: one(companies, {
		fields: [applications.companyId],
		references: [companies.id],
		relationName: "applications_companyId_companies_id"
	}),
	company_foreignFactoryId: one(companies, {
		fields: [applications.foreignFactoryId],
		references: [companies.id],
		relationName: "applications_foreignFactoryId_companies_id"
	}),
	localInspectionReports: many(localInspectionReports),
	capaSubmissions: many(capaSubmissions),
	inspectionSchedules: many(inspectionSchedules),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	riskAssessments: many(riskAssessments),
	applications_companyId: many(applications, {
		relationName: "applications_companyId_companies_id"
	}),
	applications_foreignFactoryId: many(applications, {
		relationName: "applications_foreignFactoryId_companies_id"
	}),
	companyAffiliations_foreignFactoryId: many(companyAffiliations, {
		relationName: "companyAffiliations_foreignFactoryId_companies_id"
	}),
	companyAffiliations_localCompanyId: many(companyAffiliations, {
		relationName: "companyAffiliations_localCompanyId_companies_id"
	}),
	localInspectionReports: many(localInspectionReports),
	productLines: many(productLines),
}));

export const withdrawalLogsRelations = relations(withdrawalLogs, ({one}) => ({
	permitSubstance: one(permitSubstances, {
		fields: [withdrawalLogs.permitSubstanceId],
		references: [permitSubstances.id]
	}),
}));

export const permitSubstancesRelations = relations(permitSubstances, ({one, many}) => ({
	withdrawalLogs: many(withdrawalLogs),
	atcCode: one(atcCodes, {
		fields: [permitSubstances.substanceId],
		references: [atcCodes.id]
	}),
	justificationReason: one(justificationReasons, {
		fields: [permitSubstances.justificationId],
		references: [justificationReasons.id]
	}),
	permit: one(permits, {
		fields: [permitSubstances.permitId],
		references: [permits.id]
	}),
}));

export const qmsTimelinesRelations = relations(qmsTimelines, ({one}) => ({
	application: one(applications, {
		fields: [qmsTimelines.applicationId],
		references: [applications.id]
	}),
}));

export const importerLogisticsNodesRelations = relations(importerLogisticsNodes, ({one}) => ({
	companiesAmr: one(companiesAmr, {
		fields: [importerLogisticsNodes.companyId],
		references: [companiesAmr.id]
	}),
}));

export const companiesAmrRelations = relations(companiesAmr, ({many}) => ({
	importerLogisticsNodes: many(importerLogisticsNodes),
	permits: many(permits),
}));

export const permitLedgerLogsRelations = relations(permitLedgerLogs, ({one}) => ({
	permit: one(permits, {
		fields: [permitLedgerLogs.permitId],
		references: [permits.id]
	}),
	atcCode: one(atcCodes, {
		fields: [permitLedgerLogs.substanceId],
		references: [atcCodes.id]
	}),
}));

export const permitsRelations = relations(permits, ({one, many}) => ({
	permitLedgerLogs: many(permitLedgerLogs),
	ledgerEntries: many(ledgerEntries),
	permitSubstances: many(permitSubstances),
	atcCode: one(atcCodes, {
		fields: [permits.atcId],
		references: [atcCodes.id]
	}),
	companiesAmr: one(companiesAmr, {
		fields: [permits.companyId],
		references: [companiesAmr.id]
	}),
}));

export const atcCodesRelations = relations(atcCodes, ({many}) => ({
	permitLedgerLogs: many(permitLedgerLogs),
	ledgerEntries: many(ledgerEntries),
	permitSubstances: many(permitSubstances),
	permits: many(permits),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({one}) => ({
	permit: one(permits, {
		fields: [ledgerEntries.entityId],
		references: [permits.id]
	}),
	atcCode: one(atcCodes, {
		fields: [ledgerEntries.atcId],
		references: [atcCodes.id]
	}),
}));

export const justificationReasonsRelations = relations(justificationReasons, ({many}) => ({
	permitSubstances: many(permitSubstances),
}));

export const companyAffiliationsRelations = relations(companyAffiliations, ({one}) => ({
	company_foreignFactoryId: one(companies, {
		fields: [companyAffiliations.foreignFactoryId],
		references: [companies.id],
		relationName: "companyAffiliations_foreignFactoryId_companies_id"
	}),
	company_localCompanyId: one(companies, {
		fields: [companyAffiliations.localCompanyId],
		references: [companies.id],
		relationName: "companyAffiliations_localCompanyId_companies_id"
	}),
}));

export const localInspectionReportsRelations = relations(localInspectionReports, ({one}) => ({
	application: one(applications, {
		fields: [localInspectionReports.applicationId],
		references: [applications.id]
	}),
	company: one(companies, {
		fields: [localInspectionReports.companyId],
		references: [companies.id]
	}),
	user: one(users, {
		fields: [localInspectionReports.inspectorId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	localInspectionReports: many(localInspectionReports),
}));

export const productsRelations = relations(products, ({one}) => ({
	facility: one(facilities, {
		fields: [products.facilityId],
		references: [facilities.id]
	}),
	productLine: one(productLines, {
		fields: [products.lineId],
		references: [productLines.id]
	}),
}));

export const facilitiesRelations = relations(facilities, ({many}) => ({
	products: many(products),
	productLines: many(productLines),
}));

export const productLinesRelations = relations(productLines, ({one, many}) => ({
	products: many(products),
	company: one(companies, {
		fields: [productLines.companyId],
		references: [companies.id]
	}),
	facility: one(facilities, {
		fields: [productLines.facilityId],
		references: [facilities.id]
	}),
}));

export const capaSubmissionsRelations = relations(capaSubmissions, ({one}) => ({
	application: one(applications, {
		fields: [capaSubmissions.applicationId],
		references: [applications.id]
	}),
}));

export const inspectionTeamAssignmentsRelations = relations(inspectionTeamAssignments, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [inspectionTeamAssignments.inspectorId],
		references: [usersInAuth.id]
	}),
	inspectionSchedule: one(inspectionSchedules, {
		fields: [inspectionTeamAssignments.scheduleId],
		references: [inspectionSchedules.id]
	}),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	inspectionTeamAssignments: many(inspectionTeamAssignments),
	inspectionSchedules: many(inspectionSchedules),
}));

export const inspectionSchedulesRelations = relations(inspectionSchedules, ({one, many}) => ({
	inspectionTeamAssignments: many(inspectionTeamAssignments),
	application: one(applications, {
		fields: [inspectionSchedules.applicationId],
		references: [applications.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [inspectionSchedules.createdBy],
		references: [usersInAuth.id]
	}),
}));