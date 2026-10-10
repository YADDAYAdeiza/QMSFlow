export interface ReportStepConfig {
  key: string;
  title: string;
  division: string;
  role: string;
  currentPoint: string;
  nextStepKey: string | null;
  prevStepKey: string | null;
  statusLabel: string;
}

export const inspectionReportWorkflow = {
  workflowType: "INSPECTION_REVIEW_REPORT",

  steps: {
    // 1. Entry Step: Picks up immediately after Director approves the inspection schedule batch
    STAFF_TECHNICAL_REVIEW: {
      key: "STAFF_TECHNICAL_REVIEW",
      title: "Staff Technical Field Review",
      division: "VMD",
      role: "Technical Staff Reviewer",
      currentPoint: "Staff Technical Field Review",
      nextStepKey: "DDD_TECHNICAL_REVIEW",
      prevStepKey: "INSPECTION_SCHEDULED",
      statusLabel: "UNDER_TECHNICAL_REVIEW"
    },
    
    DDD_TECHNICAL_REVIEW: {
      key: "DDD_TECHNICAL_REVIEW",
      title: "Divisional Deputy Director Technical Endorsement",
      division: "VMD",
      role: "Divisional Deputy Director",
      currentPoint: "Divisional Deputy Director Technical Endorsement",
      nextStepKey: "DDD_IRSD_INTAKE",
      prevStepKey: "STAFF_TECHNICAL_REVIEW",
      statusLabel: "PENDING_TECHNICAL_ENDORSEMENT"
    },
    DDD_IRSD_INTAKE: {
      key: "DDD_IRSD_INTAKE",
      title: "Divisional Deputy Director IRSD Routing",
      division: "IRSD",
      role: "Divisional Deputy Director",
      currentPoint: "Divisional Deputy Director IRSD Routing",
      nextStepKey: "IRSD_STAFF_VETTING",
      prevStepKey: "DDD_TECHNICAL_REVIEW",
      statusLabel: "PENDING_IRSD_ROUTING"
    },
    IRSD_STAFF_VETTING: {
      key: "IRSD_STAFF_VETTING",
      title: "IRSD Staff Compliance Vetting",
      division: "IRSD",
      role: "IRSD Staff Reviewer",
      currentPoint: "IRSD Staff Compliance Vetting",
      nextStepKey: "DDD_IRSD_REVIEW",
      prevStepKey: "DDD_IRSD_INTAKE",
      statusLabel: "UNDER_IRSD_VETTING"
    },
    DDD_IRSD_REVIEW: {
      key: "DDD_IRSD_REVIEW",
      title: "Divisional Deputy Director IRSD Concurrence",
      division: "IRSD",
      role: "Divisional Deputy Director",
      currentPoint: "Divisional Deputy Director IRSD Concurrence",
      nextStepKey: "DIRECTOR_FINAL_SIGN_OFF",
      prevStepKey: "IRSD_STAFF_VETTING",
      statusLabel: "PENDING_IRSD_CONCURRENCE"
    },
    DIRECTOR_FINAL_SIGN_OFF: {
      key: "DIRECTOR_FINAL_SIGN_OFF",
      title: "Director Final Approval & Sign-Off",
      division: "DIRECTORATE",
      role: "Director",
      currentPoint: "Director Final Approval & Sign-Off",
      nextStepKey: "FINALIZED",
      prevStepKey: "DDD_IRSD_REVIEW",
      statusLabel: "PENDING_FINAL_SIGN_OFF"
    },
    FINALIZED: {
      key: "FINALIZED",
      title: "Report Approved and Archived",
      division: "ARCHIVE",
      role: "System",
      currentPoint: "Report Approved and Archived",
      nextStepKey: null,
      prevStepKey: null,
      statusLabel: "APPROVED_AND_ARCHIVED"
    }
  } as Record<string, ReportStepConfig>,

  helpers: {
    getStepByCurrentPoint(currentPoint: string): ReportStepConfig | undefined {
      return Object.values(inspectionReportWorkflow.steps).find(
        (step) => step.currentPoint === currentPoint
      );
    },

    getStepByStatus(status: string): ReportStepConfig | undefined {
      return Object.values(inspectionReportWorkflow.steps).find(
        (step) => step.statusLabel === status
      );
    },
  },
};