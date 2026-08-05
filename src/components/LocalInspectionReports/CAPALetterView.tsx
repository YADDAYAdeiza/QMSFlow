import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 25,
    paddingBottom: 50,
    paddingHorizontal: 58.5,
    backgroundColor: "#EFF1BD", // Straw / cream background
    fontFamily: "Times-Roman",
    fontSize: 9.0,
    color: "#0f172a",
  },
  // Header section
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    marginBottom: 12,
  },
  logo: {
    width: 70,
    height: 70,
    objectFit: "contain",
  },
  headerTextContainer: {
    flex: 1,
    paddingLeft: 8,
    alignItems: "center",
    // Border restricted to the text container width
    borderBottomWidth: 2.5,
    borderBottomColor: "#047857", // Dark green accent
    paddingBottom: 4,
  },
  // Broader Dark Green Agency Title
  headerTitle: {
    fontSize: 17.0,
    fontFamily: "Helvetica-Bold",
    // color: "#064e3b", // Deep dark green
    color: "#228B22", // Deep dark green
    textAlign: "center",
    letterSpacing: 0.4,
    lineHeight: 1.15,
  },
  // Subtitle
  headerSubTitle: {
    fontSize: 9.0,
    fontFamily: "Helvetica-Bold",
    color: "#065f46", // Dark green
    marginTop: 3,
    textAlign: "center",
  },
  // Meta Details
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 8.5,
    fontFamily: "Times-Roman",
  },
  recipientBlock: {
    marginTop:8,
    marginBottom: 8,
    lineHeight: 0.5,
    fontFamily: "Times-Roman",
  },
  boldText: {
    fontFamily: "Times-BoldItalic",
    // fontFamily: "Times-Bold",
    color: "#020617",
  },
  // Subject Header with BLACK bottom line
  subject: {
    fontFamily: "Times-Bold",
    fontSize: 9.5,
    textAlign: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000", // Black border
    paddingBottom: 3,
    marginBottom: 8,
    textTransform: "uppercase",
    lineHeight: 1.2,
  },
  // Body Paragraphs
  bodyParagraph: {
    fontFamily: "Times-Roman",
    marginBottom: 5,
    lineHeight: 1.25,
    textAlign: "justify",
    fontSize: 9.0,
  },
  // Table Styling
  table: {
    width: "100%",
    borderWidth: 0.8,
    borderColor: "#475569",
    marginTop: 6,
    marginBottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#064e3b", // Deep dark green table header
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.0,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#475569",
    borderBottomWidth: 0.5,
    borderBottomColor: "#475569",
    padding: 2,
  },
  sectionHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.0,
    textTransform: "uppercase",
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#94a3b8",
    fontSize: 7.0,
    fontFamily: "Times-Roman",
    minHeight: 14,
  },
  // Columns
  colSN: { width: "4%", padding: 2, borderRightWidth: 0.5, borderRightColor: "#475569", textAlign: "center" },
  colFinding: { width: "22%", padding: 2, borderRightWidth: 0.5, borderRightColor: "#475569" },
  colRoot: { width: "15%", padding: 2, borderRightWidth: 0.5, borderRightColor: "#475569" },
  colCorrection: { width: "12%", padding: 2, borderRightWidth: 0.5, borderRightColor: "#475569" },
  colPreventive: { width: "12%", padding: 2, borderRightWidth: 0.5, borderRightColor: "#475569" },
  colIndicator: { width: "13%", padding: 2, borderRightWidth: 0.5, borderRightColor: "#475569" },
  colTimeline: { width: "7%", padding: 2, borderRightWidth: 0.5, borderRightColor: "#475569" },
  colResp: { width: "8%", padding: 2, borderRightWidth: 0.5, borderRightColor: "#475569" },
  colStatus: { width: "7%", padding: 2 },

  // Standalone CAPA Sign-Off Container
  capaSignOffContainer: {
    borderWidth: 0.8,
    borderColor: "#475569",
    borderTopWidth: 0,
    padding: 5,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    marginBottom: 6,
  },
  capaSignOffHeader: {
    fontFamily: "Times-Bold",
    fontSize: 7.5,
    color: "#020617",
    marginBottom: 4,
  },
  capaRoleTitle: {
    fontFamily: "Times-Bold",
    fontSize: 7.0,
    color: "#0f172a",
    marginTop: 3,
    marginBottom: 2,
  },
  capaLineRow: {
    flexDirection: "row",
    alignItems: "center",
    fontSize: 7.0,
    fontFamily: "Times-Roman",
    marginBottom: 2,
  },
  capaSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 7.0,
    fontFamily: "Times-Roman",
    marginBottom: 3,
  },
  dottedLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#475569",
    borderStyle: "dotted",
    flex: 1,
    marginLeft: 4,
    height: 8,
  },
  capaFootnote: {
    fontFamily: "Times-Italic",
    fontSize: 6.0,
    color: "#334155",
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 2,
  },

  warningText: {
    fontSize: 7.0,
    fontFamily: "Times-BoldItalic",
    color: "#334155",
    marginBottom: 6,
  },

  // Signatures
  signatureGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sigBlock: {
    width: "45%",
    fontFamily: "Times-Roman",
  },
  sigImageContainer: {
    height: 28,
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  sigImage: {
    height: 26,
    width: 80,
    objectFit: "contain",
  },

  // Fixed Page Footer
  footerContainer: {
    position: "absolute",
    bottom: 12,
    left: 58.5,
    right: 58.5,
    borderTopWidth: 1.5,
    borderTopColor: "#047857", // Dark green footer accent
    paddingTop: 4,
  },
  footerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 6.5,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  footerCol: {
    width: "47%",
  },
  // Black vertical line separating addresses
  footerDivider: {
    borderRightWidth: 1,
    borderRightColor: "#000000",
    height: 24,
    marginHorizontal: 4,
  },
});

interface CAPALetterProps {
  data: {
    applicationId?: string;
    referenceNumber?: string;
    effectiveCompanyName?: string;
    companyName?: string;
    effectiveAddress?: string;
    facilityAddress?: string;
    inspectionTitle?: string;
    observations?: any[];
    [key: string]: any;
  };
}

export default function CAPALetterView({ data }: CAPALetterProps) {
  const companyName = data?.effectiveCompanyName || data?.companyName || "Global Organics Limited";
  const facilityAddress = data?.effectiveAddress || data?.facilityAddress || "Plot 868, Km. 34, Lagos-Abeokuta Express Way, Ajegunle Bus Stop, Lagos";
  const refNo = data?.referenceNumber || (data?.applicationId ? `NAFDAC/VMAP/${data.applicationId}` : "NAFDAC/VMAP/G-31/Vol. III/149");
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const obsList = data?.observations || [];
  const criticalItems = obsList.filter((o) => (o.severity || "").toUpperCase() === "CRITICAL");
  const majorItems = obsList.filter((o) => (o.severity || "").toUpperCase() === "MAJOR");
  const otherItems = obsList.filter(
    (o) => !["CRITICAL", "MAJOR"].includes((o.severity || "").toUpperCase())
  );

  const renderTableRows = (items: any[], defaultTimeline: string) => {
    if (items.length === 0) {
      return (
        <View style={styles.tableRow} wrap={false}>
          <Text style={{ width: "100%", padding: 2, textAlign: "center", fontStyle: "italic", color: "#64748b" }}>
            Nil
          </Text>
        </View>
      );
    }

    return items.map((item, idx) => (
      <View key={item.id || idx} style={styles.tableRow} wrap={false}>
        <Text style={[styles.colSN, styles.boldText]}>{idx + 1}</Text>
        <Text style={styles.colFinding}>{item.deficiency || item.text || item.description || "N/A"}</Text>
        <Text style={styles.colRoot}>{item.rootCause || "Pending RCA"}</Text>
        <Text style={styles.colCorrection}>{item.proposedCorrection || "N/A"}</Text>
        <Text style={styles.colPreventive}>{item.preventiveAction || "N/A"}</Text>
        <Text style={styles.colIndicator}>{item.indicatorsForCompletion || "CAPA Report & SOPs"}</Text>
        <Text style={styles.colTimeline}>{item.timeline || defaultTimeline}</Text>
        <Text style={styles.colResp}>{item.responsiblePerson || "QA Manager"}</Text>
        <Text style={[styles.colStatus, styles.boldText]}>{item.status || "Pending"}</Text>
      </View>
    ));
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.header}>
          <PdfImage src="/nafdac_logo2-removebg-preview.png" style={styles.logo} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              NATIONAL AGENCY FOR FOOD AND DRUG{"\n"}ADMINISTRATION AND CONTROL
            </Text>
            <Text style={styles.headerSubTitle}>
              Veterinary Medicine and Allied Products Directorate (VMAP)
            </Text>
          </View>
        </View>

        {/* Ref and Date */}
        <View style={styles.metaRow}>
          <Text><Text style={styles.boldText}>Ref. No.:</Text> {refNo}</Text>
          <Text><Text style={styles.boldText}>Date:</Text> {dateStr}</Text>
        </View>

        {/* Recipient */}
        <View style={styles.recipientBlock}>
          <Text style={styles.boldText}>The Managing Director,</Text>
          <Text>{companyName},</Text>
          <Text>{facilityAddress}</Text>
        </View>

        {/* Subject Header */}
        <Text style={styles.subject}>
          NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) INSPECTION {data?.inspectionTitle || ""}
        </Text>

        {/* Body Paragraphs */}
        <Text style={styles.bodyParagraph}>Dear Sir,</Text>

        <Text style={styles.bodyParagraph}>
          The above subject refers.
        </Text>

        <Text style={styles.bodyParagraph}>
          Please recall that a team of NAFDAC inspectors conducted a Routine Inspection (RI) of your facility located at{" "}
          <Text style={styles.boldText}>{facilityAddress}</Text>. During the inspection, a number of observations relating to various aspects of GMP were identified. These observations were discussed with your team during the inspection and at the exit meeting. Please find attached the detailed inspection report for your attention and necessary action.
        </Text>

        <Text style={styles.bodyParagraph}>
          In view of the above, you are required to develop and submit a Corrective and Preventive Action (CAPA) plan addressing each observation raised in the report. For observations classified as "major", please include supporting documentation as objective evidence of corrective actions implemented.
        </Text>

        <Text style={styles.bodyParagraph}>
          Kindly note that the adequacy of your CAPA Plan will be evaluated through a desk review and the implementation of the proposed actions will be verified during subsequent GMP inspections.
        </Text>

        <Text style={styles.bodyParagraph}>
          Please complete the CAPA template below and submit both the signed hard copy and an electronic copy to the undersigned within thirty (30) days of receipt of this letter. The electronic copy should be forwarded to <Text style={styles.boldText}>vmap@nafdac.gov.ng</Text>.
        </Text>

        {/* CAPA Table Structure */}
        <View style={styles.table}>
          {/* Table Column Titles */}
          <View style={styles.tableHeader}>
            <Text style={styles.colSN}>S/N</Text>
            <Text style={styles.colFinding}>Audit findings (observations)</Text>
            <Text style={styles.colRoot}>Root cause analysis</Text>
            <Text style={styles.colCorrection}>Correction</Text>
            <Text style={styles.colPreventive}>Corrective Action(s)</Text>
            <Text style={styles.colIndicator}>Indicators for Completion</Text>
            <Text style={styles.colTimeline}>Timeline</Text>
            <Text style={styles.colResp}>Responsibility</Text>
            <Text style={styles.colStatus}>CAPA Status</Text>
          </View>

          {/* Critical Section Banner */}
          <View style={[styles.sectionHeaderRow, { backgroundColor: "#fee2e2" }]} wrap={false}>
            <Text style={[styles.sectionHeaderText, { color: "#991b1b" }]}>
              Critical
            </Text>
          </View>
          {renderTableRows(criticalItems, "Immediate")}

          {/* Major Section Banner */}
          <View style={[styles.sectionHeaderRow, { backgroundColor: "#fef3c7" }]} wrap={false}>
            <Text style={[styles.sectionHeaderText, { color: "#92400e" }]}>
              Major
            </Text>
          </View>
          {renderTableRows(majorItems, "30 Days")}

          {/* Others Section Banner */}
          <View style={[styles.sectionHeaderRow, { backgroundColor: "#f1f5f9" }]} wrap={false}>
            <Text style={[styles.sectionHeaderText, { color: "#334155" }]}>
              Others
            </Text>
          </View>
          {renderTableRows(otherItems, "60 Days")}
        </View>

        {/* Standalone Sign-Off Block */}
        <View style={styles.capaSignOffContainer} wrap={false}>
          <Text style={styles.capaSignOffHeader}>
            For the Corrective Action Plan Signature of Responsible Person and Managing Director of Manufacturing company;
          </Text>

          {/* Responsible Person Block */}
          <Text style={styles.capaRoleTitle}>*Responsible Person:</Text>
          <View style={styles.capaLineRow}>
            <Text>Name: </Text>
            <View style={styles.dottedLine} />
          </View>
          <View style={styles.capaSubRow}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "65%" }}>
              <Text>Signature: </Text>
              <View style={styles.dottedLine} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", width: "30%" }}>
              <Text>Date: </Text>
              <View style={styles.dottedLine} />
            </View>
          </View>

          {/* Managing Director Block */}
          <Text style={styles.capaRoleTitle}>Managing Director</Text>
          <View style={styles.capaLineRow}>
            <Text>Name: </Text>
            <View style={styles.dottedLine} />
          </View>
          <View style={styles.capaSubRow}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "65%" }}>
              <Text>Signature: </Text>
              <View style={styles.dottedLine} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", width: "30%" }}>
              <Text>Date: </Text>
              <View style={styles.dottedLine} />
            </View>
          </View>

          {/* Footnote Explanation */}
          <Text style={styles.capaFootnote}>
            *The “Responsible Person” is the person responsible at the manufacturing facility for the implementation of the CAPA plan.
          </Text>
        </View>

        {/* Legal Disclaimer */}
        <Text style={styles.warningText}>
          Please note that altering the audit findings (observations) and failure to submit the CAPA plan on or before the above stated timeline may attract regulatory actions.
        </Text>

        {/* Concluding Paragraphs */}
        <Text style={styles.bodyParagraph}>
          Kindly acknowledge receipt.
        </Text>
        
        <Text style={styles.bodyParagraph}>
          Thank you.
        </Text>

        {/* Signatures Grid */}
        <View style={styles.signatureGrid} wrap={false}>
          <View style={styles.sigBlock}>
            <View style={styles.sigImageContainer}>
              <PdfImage src="/MudSig-removebg-preview.png" style={styles.sigImage} />
            </View>
            <Text style={styles.boldText}>Mudashir I. A</Text>
            <Text style={styles.boldText}>Divisional Deputy Director</Text>
            <Text style={{ fontSize: 7.0 }}>For: Director-General (NAFDAC)</Text>
          </View>
        </View>

        {/* Fixed Page Footer */}
        <View style={styles.footerContainer} fixed>
          <View style={styles.footerGrid}>
            <View style={styles.footerCol}>
              <Text style={styles.boldText}>NAFDAC CORPORATE HQ:</Text>
              <Text>Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja</Text>
              <Text>Tel: +234-9-2905701 | E-mail: nafdac@nafdac.gov.ng</Text>
            </View>
            
            {/* Black Vertical Line Separator */}
            <View style={styles.footerDivider} />

            <View style={[styles.footerCol, { textAlign: "right" }]}>
              <Text style={styles.boldText}>LAGOS LIAISON OFFICE:</Text>
              <Text>Plot 1, Industrial Estate, Oshodi Apapa Expressway, Isolo, Lagos</Text>
              <Text>Website: www.nafdac.gov.ng</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}