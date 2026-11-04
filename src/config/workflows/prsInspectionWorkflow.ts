// @/config/workflows/prsInspectionWorkflow.ts

export interface PRSWorkflowStepConfig {
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

export const prsInspectionWorkflow = {
  workflowType: "PRS_INSPECTION_WORKFLOW",

  statuses: {
    PRS_SCHEDULED: "PRS_SCHEDULED",
    PRS_REVIEW: "PRS_REVIEW",
    DG_APPROVAL_PENDING: "DG_APPROVAL_PENDING",
    COMPLETED: "COMPLETED",
  },

  steps: {
    PRS_SCHEDULE: {
      key: "PRS_SCHEDULE",
      title: "PRS Scheduling & Documentation",
      division: "PRS",
      role: "PRS Desk Officer",
      currentPoint: "PRS Scheduling",
      statusLabel: "PRS_SCHEDULED",
      nextStepKey: "PRS_REVIEW",
      prevStepKey: null,
      description: "Foreign inspection batch received from VMAP Directorate, undergoing PRS processing.",
    },

    PRS_REVIEW: {
      key: "PRS_REVIEW",
      title: "PRS Director Review & Clearance",
      division: "PRS",
      role: "Director PRS",
      currentPoint: "PRS Director Review",
      statusLabel: "PRS_REVIEW",
      nextStepKey: "DG_SCHEDULE",
      prevStepKey: "PRS_SCHEDULE",
      description: "Review and administrative clearance by Director PRS.",
    },

    DG_SCHEDULE: {
      key: "DG_SCHEDULE",
      title: "Office of the DG Final Clearance",
      division: "ODG",
      role: "Director General",
      currentPoint: "DG Final Clearance",
      statusLabel: "DG_APPROVAL_PENDING",
      nextStepKey: null,
      prevStepKey: "PRS_REVIEW",
      description: "Final executive approval for foreign travel/inspection schedule.",
    },
  } as Record<string, PRSWorkflowStepConfig>,
};