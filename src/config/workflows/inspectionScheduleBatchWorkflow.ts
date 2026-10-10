export interface ScheduleBatchStepConfig {
  key: string;
  title: string;
  division: string;
  role: string;
  currentPoint: string;
  statusLabel: string;
  nextStepKey: string | null;
  prevStepKey: string | null;
  description: string;
}

export const inspectionScheduleBatchWorkflow = {
  workflowType: "INSPECTION_SCHEDULE_BATCH",

  statuses: {
    INSPECTION_PENDING: "INSPECTION_PENDING",
    DRAFT: "DRAFT",
    PENDING_APPROVAL: "PENDING_APPROVAL",
    REWORK_REQUIRED: "REWORK_REQUIRED",
    APPROVED: "APPROVED",
    INSPECTION_SCHEDULED: "INSPECTION_SCHEDULED",
  },

  steps: {
    // 1. Entry Step: Triggered automatically when facility categorization is endorsed and completed
    INSPECTION_PENDING: {
      key: "INSPECTION_PENDING",
      title: "Facility Awaiting Inspection Scheduling",
      division: "IRSD",
      role: "Divisional Deputy Director",
      currentPoint: "Facility Awaiting Inspection Scheduling",
      statusLabel: "INSPECTION_PENDING",
      nextStepKey: "SCHEDULE_DRAFT",
      prevStepKey: "DDD_CATEGORIZATION_ENDORSEMENT",
      description: "Facility has been risk-categorized and logged, awaiting grouping into a schedule batch.",
    },

    // 2. Drafting & Submission Step: DDD bundles applications; picked up directly by the Director
    SCHEDULE_DRAFT: {
      key: "SCHEDULE_DRAFT",
      title: "Director Routing",
      division: "DIRECTORATE",
      role: "Director",
      currentPoint: "Director Routing",
      statusLabel: "DRAFT",
      nextStepKey: "INSPECTION_SCHEDULED",
      prevStepKey: "INSPECTION_PENDING",
      description: "Schedule batch submitted by DDD, awaiting Director review, sign-off, or rework.",
    },

    // 3. Rework Step: Returned by Director to DDD for modification
    REWORK_REQUIRED: {
      key: "REWORK_REQUIRED",
      title: "Schedule Rework & Modification",
      division: "IRSD",
      role: "Divisional Deputy Director",
      currentPoint: "Schedule Rework & Modification",
      statusLabel: "REWORK_REQUIRED",
      nextStepKey: "SCHEDULE_DRAFT",
      prevStepKey: "SCHEDULE_DRAFT",
      description: "Returned by Director to Head (IRSD) with remarks for revision.",
    },

    // 4. Final Dispatched State: Director approves, handing over execution to inspectionReportWorkflow
    INSPECTION_SCHEDULED: {
      key: "INSPECTION_SCHEDULED",
      title: "Staff Technical Field Review",
      division: "VMD",
      role: "Technical Staff Reviewer",
      currentPoint: "Staff Technical Field Review",
      statusLabel: "INSPECTION_SCHEDULED",
      nextStepKey: null, // Clean hand-off point to inspectionReportWorkflow
      prevStepKey: "SCHEDULE_DRAFT",
      description: "Schedule approved by the Director and dispatched to assigned inspectors across the Directorate for field execution.",
    },
  } as Record<string, ScheduleBatchStepConfig>,

  helpers: {
    getStepByCurrentPoint(currentPoint: string): ScheduleBatchStepConfig | undefined {
      return Object.values(inspectionScheduleBatchWorkflow.steps).find(
        (step) => step.currentPoint === currentPoint
      );
    },

    getStepByStatus(status: string): ScheduleBatchStepConfig | undefined {
      return Object.values(inspectionScheduleBatchWorkflow.steps).find(
        (step) => step.statusLabel === status
      );
    },
  },
};