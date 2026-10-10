export interface IntakeStepConfig {
  key: string;
  title: string;
  division: string;
  role: string;
  currentPoint: string;
  nextStepKey: string | null;
  prevStepKey: string | null;
  statusLabel: string;
}

export const applicationIntakeWorkflow = {
  workflowType: "APPLICATION_INTAKE",

  steps: {
    LOD: {
      key: "LOD",
      title: "Requested Inspection",
      division: "LOD",
      role: "LOD_Officer",
      currentPoint: "Requested Inspection",
      nextStepKey: "DIRECTOR_INTAKE",
      prevStepKey: null,
      statusLabel: "LOD_INTAKE"
    },
    DIRECTOR_INTAKE: {
      key: "DIRECTOR_INTAKE",
      title: "Director Initial Allocation",
      division: "DIRECTORATE",
      role: "Director",
      currentPoint: "Director Initial Allocation",
      nextStepKey: "DDD_TECHNICAL_ASSIGNMENT",
      prevStepKey: "LOD",
      statusLabel: "PENDING_DIRECTOR_ALLOCATION"
    }
  } as Record<string, IntakeStepConfig>,

  helpers: {
    getStepByCurrentPoint(currentPoint: string): IntakeStepConfig | undefined {
      return Object.values(applicationIntakeWorkflow.steps).find(
        (step) => step.currentPoint === currentPoint
      );
    },

    getStepByStatus(status: string): IntakeStepConfig | undefined {
      return Object.values(applicationIntakeWorkflow.steps).find(
        (step) => step.statusLabel === status
      );
    },
  },
};