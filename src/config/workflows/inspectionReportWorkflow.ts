// @/config/workflows/inspectionReportWorkflow.ts

export const inspectionReportWorkflow = {
  workflowType: "INSPECTION_REVIEW_REPORT",
  steps: {
    LOD: {
      key: "LOD",
      title: "Letter of Deliberation Intake",
      division: "REGISTRATION",
      role: "LOD_Officer",
      nextStepKey: "DIRECTOR_INTAKE",
      prevStepKey: null,
      statusLabel: "LOD_INTAKE"
    },
    DIRECTOR_INTAKE: {
      key: "DIRECTOR_INTAKE",
      title: "Director Initial Allocation",
      division: "DIRECTORATE",
      role: "Director",
      nextStepKey: "DDD_TECHNICAL_ASSIGNMENT",
      prevStepKey: "LOD",
      statusLabel: "PENDING_DIRECTOR_ALLOCATION"
    },
    DDD_TECHNICAL_ASSIGNMENT: {
      key: "DDD_TECHNICAL_ASSIGNMENT",
      title: "Divisional Deputy Director Technical Assignment",
      division: "VMD",
      role: "Divisional Deputy Director",
      nextStepKey: "STAFF_TECHNICAL_REVIEW",
      prevStepKey: "DIRECTOR_INTAKE",
      statusLabel: "PENDING_TECHNICAL_ASSIGNMENT"
    },
    STAFF_TECHNICAL_REVIEW: {
      key: "STAFF_TECHNICAL_REVIEW",
      title: "Staff Technical Field Review",
      division: "VMD",
      role: "Technical Staff Reviewer",
      nextStepKey: "DDD_TECHNICAL_REVIEW",
      prevStepKey: "DDD_TECHNICAL_ASSIGNMENT",
      statusLabel: "UNDER_TECHNICAL_REVIEW"
    },
    DDD_TECHNICAL_REVIEW: {
      key: "DDD_TECHNICAL_REVIEW",
      title: "Divisional Deputy Director Technical Endorsement",
      division: "VMD",
      role: "Divisional Deputy Director",
      nextStepKey: "DDD_IRSD_INTAKE",
      prevStepKey: "STAFF_TECHNICAL_REVIEW",
      statusLabel: "PENDING_TECHNICAL_ENDORSEMENT"
    },
    DDD_IRSD_INTAKE: {
      key: "DDD_IRSD_INTAKE",
      title: "Divisional Deputy Director IRSD Routing",
      division: "IRSD",
      role: "Divisional Deputy Director",
      nextStepKey: "IRSD_STAFF_VETTING",
      prevStepKey: "DDD_TECHNICAL_REVIEW",
      statusLabel: "PENDING_IRSD_ROUTING"
    },
    IRSD_STAFF_VETTING: {
      key: "IRSD_STAFF_VETTING",
      title: "IRSD Staff Compliance Vetting",
      division: "IRSD",
      role: "IRSD Staff Reviewer",
      nextStepKey: "DDD_IRSD_REVIEW",
      prevStepKey: "DDD_IRSD_INTAKE",
      statusLabel: "UNDER_IRSD_VETTING"
    },
    DDD_IRSD_REVIEW: {
      key: "DDD_IRSD_REVIEW",
      title: "Divisional Deputy Director IRSD Concurrence",
      division: "IRSD",
      role: "Divisional Deputy Director",
      nextStepKey: "DIRECTOR_FINAL_SIGN_OFF",
      prevStepKey: "IRSD_STAFF_VETTING",
      statusLabel: "PENDING_IRSD_CONCURRENCE"
    },
    DIRECTOR_FINAL_SIGN_OFF: {
      key: "DIRECTOR_FINAL_SIGN_OFF",
      title: "Director Final Approval & Sign-Off",
      division: "DIRECTORATE",
      role: "Director",
      nextStepKey: "FINALIZED",
      prevStepKey: "DDD_IRSD_REVIEW",
      statusLabel: "PENDING_FINAL_SIGN_OFF"
    },
    FINALIZED: {
      key: "FINALIZED",
      title: "Report Approved and Archived",
      division: "ARCHIVE",
      role: "System",
      nextStepKey: null,
      prevStepKey: null,
      statusLabel: "APPROVED_AND_ARCHIVED"
    }
  }
};

/**
 * Dedicated Sub-Workflow for Facility PIC/S Risk Categorization Desk Review
 */// @/config/workflows/inspectionReportWorkflow.ts

export const facilityCategorizationWorkflow = {
  workflowType: "FACILITY_CATEGORIZATION_REVIEW",
  steps: {
    // 1. Entry Step: Sitting on the Divisional Deputy Director's desk waiting for assignment
    DDD_TECHNICAL_ASSIGNMENT: {
      key: "DDD_TECHNICAL_ASSIGNMENT",
      title: "Divisional Deputy Director Technical & Categorization Assignment",
      division: "VMD",
      role: "Divisional Deputy Director",
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
      nextStepKey: "CATEGORIZATION_COMPLETED",
      prevStepKey: "UNDER_CATEGORIZATION",
      statusLabel: "PENDING_CATEGORIZATION_ENDORSEMENT"
    },

    // 4. Final State: Facility is categorized, risk score logged, ready for future inspection scheduling
    CATEGORIZATION_COMPLETED: {
      key: "CATEGORIZATION_COMPLETED",
      title: "Facility Risk Categorized and Logged",
      division: "VMD",
      role: "System",
      nextStepKey: null,
      prevStepKey: "DDD_CATEGORIZATION_ENDORSEMENT",
      statusLabel: "CATEGORIZED_AND_LOGGED"
    }
  }
};