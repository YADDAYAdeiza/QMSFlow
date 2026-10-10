export interface FacilityCategorizationStepConfig {
  key: string;
  title: string;
  division: string;
  role: string;
  currentPoint: string;
  nextStepKey: string | null;
  prevStepKey: string | null;
  statusLabel: string;
}

export const facilityCategorizationWorkflow = {
  workflowType: "FACILITY_CATEGORIZATION_REVIEW",

  steps: {
    // 1. Entry Step: Sitting on the Divisional Deputy Director's desk waiting for assignment
    DDD_TECHNICAL_ASSIGNMENT: {
      key: "DDD_TECHNICAL_ASSIGNMENT",
      title: "Divisional Deputy Director Technical & Categorization Assignment",
      division: "VMD",
      role: "Divisional Deputy Director",
      currentPoint: "Divisional Deputy Director Technical & Categorization Assignment",
      nextStepKey: "UNDER_CATEGORIZATION",
      prevStepKey: "DIRECTOR_INTAKE",
      statusLabel: "PENDING_CATEGORIZATION_ASSIGNMENT"
    },

    // 2. Desk Review Step: Assigned Technical Officer filling PIC/S attributes from hard-copy file
    UNDER_CATEGORIZATION: {
      key: "UNDER_CATEGORIZATION",
      title: "Staff Facility Categorization Desk Review",
      division: "VMD",
      role: "Technical Staff Reviewer",
      currentPoint: "Staff Facility Categorization Desk Review",
      nextStepKey: "DDD_CATEGORIZATION_ENDORSEMENT",
      prevStepKey: "DDD_TECHNICAL_ASSIGNMENT",
      statusLabel: "UNDER_CATEGORIZATION"
    },

    // 3. Endorsement Step: Divisional Deputy Director verifies calculated risk tier & categorizations
    DDD_CATEGORIZATION_ENDORSEMENT: {
      key: "DDD_CATEGORIZATION_ENDORSEMENT",
      title: "Divisional Deputy Director Categorization Endorsement",
      division: "VMD",
      role: "Divisional Deputy Director",
      currentPoint: "Divisional Deputy Director Categorization Endorsement",
      nextStepKey: "CATEGORIZATION_COMPLETED",
      prevStepKey: "UNDER_CATEGORIZATION",
      statusLabel: "PENDING_CATEGORIZATION_ENDORSEMENT"
    },

    // 4. Final State: Facility is categorized, risk score logged, ready for inspection scheduling
    CATEGORIZATION_COMPLETED: {
      key: "CATEGORIZATION_COMPLETED",
      title: "Facility Risk Categorized and Logged",
      division: "VMD",
      role: "System",
      currentPoint: "Facility Risk Categorized and Logged",
      nextStepKey: null, // Hands off to the Inspection Scheduling module
      prevStepKey: "DDD_CATEGORIZATION_ENDORSEMENT",
      statusLabel: "INSPECTION_PENDING" // Triggers visibility in the scheduling/unassigned inbox tab
    }
  } as Record<string, FacilityCategorizationStepConfig>,

  helpers: {
    getStepByCurrentPoint(currentPoint: string): FacilityCategorizationStepConfig | undefined {
      return Object.values(facilityCategorizationWorkflow.steps).find(
        (step) => step.currentPoint === currentPoint
      );
    },

    getStepByStatus(status: string): FacilityCategorizationStepConfig | undefined {
      return Object.values(facilityCategorizationWorkflow.steps).find(
        (step) => step.statusLabel === status
      );
    },
  },
};