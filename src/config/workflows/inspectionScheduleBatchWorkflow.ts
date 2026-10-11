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
      nextStepKey: "DDD_SCHEDULE_ROUTING",
      prevStepKey: "DDD_CATEGORIZATION_ENDORSEMENT",
      description: "Facility has been risk-categorized and logged, awaiting grouping into a schedule batch.",
    },

    // 2. Intermediate Step: DDD drafts the schedule and routes to IRSD / Annexure preparation
    DDD_SCHEDULE_ROUTING: {
      key: "DDD_SCHEDULE_ROUTING",
      title: "Divisional Deputy Director IRSD Routing",
      division: "IRSD",
      role: "Divisional Deputy Director",
      currentPoint: "Divisional Deputy Director IRSD Routing",
      statusLabel: "DRAFT",
      nextStepKey: "SCHEDULE_DRAFT",
      prevStepKey: "INSPECTION_PENDING",
      description: "Inspection scheduled by DDD, preparing Annexure batch for Director review.",
    },

    // 3. Director Review Step: Picked up directly by the Director
    SCHEDULE_DRAFT: {
      key: "SCHEDULE_DRAFT",
      title: "Director Routing",
      division: "DIRECTORATE",
      role: "Director",
      currentPoint: "Director Routing",
      statusLabel: "DRAFT",
      nextStepKey: "INSPECTION_SCHEDULED",
      prevStepKey: "DDD_SCHEDULE_ROUTING",
      description: "Schedule batch submitted by DDD, awaiting Director review, sign-off, or rework.",
    },

    // 4. Rework Step: Returned by Director to DDD for modification
    REWORK_REQUIRED: {
      key: "REWORK_REQUIRED",
      title: "Schedule Rework & Modification",
      division: "IRSD",
      role: "Divisional Deputy Director",
      currentPoint: "Schedule Rework & Modification",
      statusLabel: "REWORK_REQUIRED",
      nextStepKey: "DDD_SCHEDULE_ROUTING",
      prevStepKey: "SCHEDULE_DRAFT",
      description: "Returned by Director to Head (IRSD) with remarks for revision.",
    },

    // 5. Final Dispatched State: Director approves, handing over execution to inspectionReportWorkflow
    INSPECTION_SCHEDULED: {
      key: "INSPECTION_SCHEDULED",
      title: "Staff Technical Field Review",
      division: "VMD",
      role: "Technical Staff Reviewer",
      currentPoint: "Staff Technical Field Review",
      statusLabel: "INSPECTION_SCHEDULED",
      nextStepKey: null,
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