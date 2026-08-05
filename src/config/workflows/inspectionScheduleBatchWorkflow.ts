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
    DRAFT: "DRAFT",
    PENDING_APPROVAL: "PENDING_APPROVAL",
    REWORK_REQUIRED: "REWORK_REQUIRED",
    APPROVED: "APPROVED",
  },

  steps: {
    SCHEDULE_DRAFT: {
      key: "SCHEDULE_DRAFT",
      title: "Inspection Schedule Drafting",
      division: "IRSD",
      role: "Divisional Deputy Director",
      currentPoint: "Divisional Deputy Director IRSD Routing",
      statusLabel: "DRAFT",
      nextStepKey: "DIRECTOR_APPROVAL_REVIEW",
      prevStepKey: null,
      description: "Head (IRSD) prepares and reviews schedule entries.",
    },

    DIRECTOR_APPROVAL_REVIEW: {
      key: "DIRECTOR_APPROVAL_REVIEW",
      title: "Director Review & Approval",
      division: "DIRECTORATE",
      role: "Director",
      currentPoint: "Director Review & Approval",
      statusLabel: "PENDING_APPROVAL",
      nextStepKey: "STAFF_TECHNICAL_REVIEW",
      prevStepKey: "SCHEDULE_DRAFT",
      description: "Schedule submitted to Director for technical approval or rework.",
    },

    REWORK_REQUIRED: {
      key: "REWORK_REQUIRED",
      title: "Schedule Rework & Modification",
      division: "IRSD",
      role: "Divisional Deputy Director",
      currentPoint: "Divisional Deputy Director IRSD Routing",
      statusLabel: "REWORK_REQUIRED",
      nextStepKey: "DIRECTOR_APPROVAL_REVIEW",
      prevStepKey: "DIRECTOR_APPROVAL_REVIEW",
      description: "Returned by Director to Head (IRSD) with remarks for revision.",
    },

    // 💡 Added step mapping for active execution
    STAFF_TECHNICAL_REVIEW: {
      key: "STAFF_TECHNICAL_REVIEW",
      title: "Staff Technical Field Review",
      division: "VMD",
      role: "Technical Staff Reviewer",
      currentPoint: "Staff Technical Field Review",
      statusLabel: "UNDER_TECHNICAL_REVIEW",
      nextStepKey: "DDD_TECHNICAL_REVIEW",
      prevStepKey: "DIRECTOR_APPROVAL_REVIEW",
      description: "Approved schedule dispatched to assigned inspectors for field execution.",
    },

    FINAL_APPROVED: {
      key: "FINAL_APPROVED",
      title: "Approved for Publication & Execution",
      division: "DIRECTORATE",
      role: "System",
      currentPoint: "Applicant Notification Hub / Final Approved",
      statusLabel: "APPROVED",
      nextStepKey: null,
      prevStepKey: "STAFF_TECHNICAL_REVIEW",
      description: "Schedule approved and published for Notice Board printing and inspection teams.",
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