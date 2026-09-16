// @/config/workflows/facilityVerificationWorkflow.ts

export type Directorate = "VMAP" | "FSAN";

export interface WorkflowStep {
  key: string;
  title: string;
  directorate: Directorate;
  division?: string;
  role: string;
  nextStepKey: string | null;
  prevStepKey: string | null;
  statusLabel: string;
}

export interface DirectorateWorkflow {
  workflowType: string;
  directorate: Directorate;
  steps: Record<string, WorkflowStep>;
}

export const inspectionReportWorkflows: Record<Directorate, DirectorateWorkflow> = {
  VMAP: {
    workflowType: "INSPECTION_REVIEW_REPORT_VMAP",
    directorate: "VMAP",
    steps: {
      LOD: {
        key: "LOD",
        title: "Letter of Deliberation Intake",
        directorate: "VMAP",
        division: "LOD",
        role: "LOD_Officer",
        nextStepKey: "DIRECTOR_INTAKE", 
        prevStepKey: null,
        statusLabel: "LOD_INTAKE"
      },
      DIRECTOR_INTAKE: {
        key: "DIRECTOR_INTAKE",
        title: "Director Initial Assignment",
        directorate: "VMAP",
        division: "DIRECTORATE",
        role: "Director",
        nextStepKey: "DDD_TECHNICAL_ASSIGNMENT",
        prevStepKey: "LOD",
        statusLabel: "PENDING_DIRECTOR_ASSIGNMENT"
      },
      DDD_TECHNICAL_ASSIGNMENT: {
        key: "DDD_TECHNICAL_ASSIGNMENT",
        title: "Divisional Deputy Director Technical Assignment",
        directorate: "VMAP",
        role: "Divisional Deputy Director",
        nextStepKey: "STAFF_TECHNICAL_REVIEW",
        prevStepKey: "DIRECTOR_INTAKE",
        statusLabel: "PENDING_TECHNICAL_ASSIGNMENT"
      },
      STAFF_TECHNICAL_REVIEW: {
        key: "STAFF_TECHNICAL_REVIEW",
        title: "Staff Technical Field Review",
        directorate: "VMAP",
        division: "VMD",
        role: "Technical Staff Reviewer",
        nextStepKey: "DDD_TECHNICAL_REVIEW",
        prevStepKey: "DDD_TECHNICAL_ASSIGNMENT",
        statusLabel: "UNDER_TECHNICAL_REVIEW"
      },
      DDD_TECHNICAL_REVIEW: {
        key: "DDD_TECHNICAL_REVIEW",
        title: "Divisional Deputy Director Technical Endorsement",
        directorate: "VMAP",
        division: "VMD",
        role: "Divisional Deputy Director",
        nextStepKey: "DDD_IRSD_INTAKE",
        prevStepKey: "STAFF_TECHNICAL_REVIEW",
        statusLabel: "PENDING_TECHNICAL_ENDORSEMENT"
      },
      DDD_IRSD_INTAKE: {
        key: "DDD_IRSD_INTAKE",
        title: "Divisional Deputy Director IRSD Routing",
        directorate: "VMAP",
        division: "IRSD",
        role: "Divisional Deputy Director",
        nextStepKey: "IRSD_STAFF_VETTING",
        prevStepKey: "DDD_TECHNICAL_REVIEW",
        statusLabel: "PENDING_IRSD_ROUTING"
      },
      IRSD_STAFF_VETTING: {
        key: "IRSD_STAFF_VETTING",
        title: "IRSD Staff Compliance Vetting",
        directorate: "VMAP",
        division: "IRSD",
        role: "IRSD Staff Reviewer",
        nextStepKey: "DDD_IRSD_REVIEW",
        prevStepKey: "DDD_IRSD_INTAKE",
        statusLabel: "UNDER_IRSD_VETTING"
      },
      DDD_IRSD_REVIEW: {
        key: "DDD_IRSD_REVIEW",
        title: "Divisional Deputy Director IRSD Concurrence",
        directorate: "VMAP",
        division: "IRSD",
        role: "Divisional Deputy Director",
        nextStepKey: "DIRECTOR_FINAL_SIGN_OFF",
        prevStepKey: "IRSD_STAFF_VETTING",
        statusLabel: "PENDING_IRSD_CONCURRENCE"
      },
      DIRECTOR_FINAL_SIGN_OFF: {
        key: "DIRECTOR_FINAL_SIGN_OFF",
        title: "Director Final Approval & Sign-Off",
        directorate: "VMAP",
        division: "DIRECTORATE",
        role: "Director",
        nextStepKey: "FINALIZED",
        prevStepKey: "DDD_IRSD_REVIEW",
        statusLabel: "PENDING_FINAL_SIGN_OFF"
      },
      FINALIZED: {
        key: "FINALIZED",
        title: "Report Approved and Archived",
        directorate: "VMAP",
        division: "ARCHIVE",
        role: "System",
        nextStepKey: null,
        prevStepKey: null,
        statusLabel: "APPROVED_AND_ARCHIVED"
      }
    }
  },
  FSAN: {
    workflowType: "INSPECTION_REVIEW_REPORT_FSAN",
    directorate: "FSAN",
    steps: {}
  }
};

/**
 * Safely resolves the workflow object with fallback to VMAP
 */
export function getWorkflowByDirectorate(directorate?: string | null): DirectorateWorkflow {
  if (directorate === "FSAN") return inspectionReportWorkflows.FSAN;
  return inspectionReportWorkflows.VMAP;
}

/**
 * Resolves a specific step given a directorate and current step key
 */
export function getWorkflowStep(
  directorate: string | null | undefined,
  stepKey: string
): WorkflowStep | null {
  const workflow = getWorkflowByDirectorate(directorate);
  return workflow.steps[stepKey] ?? null;
}