import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

// Define PDF Styles using React-PDF StyleSheet
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#EFF1BD",
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(5, 46, 22, 0.4)",
    paddingBottom: 8,
    marginBottom: 10,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  headerTextContainer: {
    flex: 1,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#052e16",
    textAlign: "center",
  },
  headerSubTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginTop: 2,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  recipientBlock: {
    marginBottom: 10,
    lineHeight: 1.3,
  },
  boldText: {
    fontFamily: "Helvetica-Bold",
  },
  subject: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    paddingBottom: 4,
    marginBottom: 8,
  },
  bodyParagraph: {
    marginBottom: 6,
    lineHeight: 1.4,
    textAlign: "justify",
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#64748b",
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#052e16",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  tableRowSection: {
    flexDirection: "row",
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#94a3b8",
  },
  colSN: { width: "5%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#64748b" },
  colFinding: { width: "20%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#64748b" },
  colRoot: { width: "15%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#64748b" },
  colCorrection: { width: "12%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#64748b" },
  colPreventive: { width: "12%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#64748b" },
  colIndicator: { width: "12%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#64748b" },
  colTimeline: { width: "8%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#64748b" },
  colResp: { width: "8%", padding: 3, borderRightWidth: 0.5, borderRightColor: "#64748b" },
  colStatus: { width: "8%", padding: 3 },
  
  signatureGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  sigBlock: {
    width: "45%",
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    borderStyle: "dashed",
    marginVertical: 4,
    height: 25,
  },
  footerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    paddingTop: 6,
    marginTop: 10,
    fontSize: 7,
  },
});

interface CAPALetterProps {
  data: {
    applicationId?: string;
    effectiveCompanyName?: string;
    effectiveAddress?: string;
    inspectionTitle?: string;
    observations?: any[];
    [key: string]: any;
  };
}

export default function CAPALetterView({ data }: CAPALetterProps) {
  const companyName = data?.effectiveCompanyName || data?.companyName || "Company Name";
  const facilityAddress = data?.effectiveAddress || data?.facilityAddress || "Company Address";
  const refNo = data?.applicationId ? `NAFDAC/VMAP/${data.applicationId}` : "NAFDAC/VMAP/CAPA/2026";
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

  const renderTableRows = (items: any[]) => {
    if (items.length === 0) {
      return (
        <View style={styles.tableRow}>
          <Text style={{ width: "100%", padding: 3, textAlign: "center", fontStyle: "italic" }}>
            Nil
          </Text>
        </View>
      );
    }

    return items.map((item, idx) => (
      <View key={idx} style={styles.tableRow}>
        <Text style={styles.colSN}>{idx + 1}</Text>
        <Text style={styles.colFinding}>{item.text || item.description || item.deficiency || "N/A"}</Text>
        <Text style={styles.colRoot}>{item.rootCause || "Pending RCA"}</Text>
        <Text style={styles.colCorrection}>{item.proposedCorrection || "N/A"}</Text>
        <Text style={styles.colPreventive}>{item.preventiveAction || "N/A"}</Text>
        <Text style={styles.colIndicator}>{item.indicatorsForCompletion || "CAPA Report & SOPs"}</Text>
        <Text style={styles.colTimeline}>{item.timeline || "30 Days"}</Text>
        <Text style={styles.colResp}>{item.responsiblePerson || "QA Manager"}</Text>
        <Text style={styles.colStatus}>{item.status || "Pending"}</Text>
      </View>
    ));
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            NATIONAL AGENCY FOR FOOD AND DRUG ADMINISTRATION AND CONTROL
          </Text>
          <Text style={styles.headerSubTitle}>
            Veterinary Medicine and Allied Products Directorate (VMAP)
          </Text>
        </View>

        {/* Ref & Date */}
        <View style={styles.metaRow}>
          <Text><Text style={styles.boldText}>Ref. No.:</Text> {refNo}</Text>
          <Text><Text style={styles.boldText}>Date:</Text> {dateStr}</Text>
        </View>

        {/* Recipient */}
        <View style={styles.recipientBlock}>
          <Text style={styles.boldText}>The Managing Director,</Text>
          <Text>{companyName}</Text>
          <Text>{facilityAddress}</Text>
        </View>

        {/* Subject */}
        <Text style={styles.subject}>
          NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) INSPECTION
        </Text>

        <Text style={styles.bodyParagraph}>Dear Sir,</Text>

        <Text style={styles.bodyParagraph}>
          The above subject refers. Please recall that a team of NAFDAC inspectors conducted a Routine Inspection (RI) of your facility located at {facilityAddress}. During the inspection, a number of observations relating to various aspects of GMP were identified.
        </Text>

        <Text style={styles.bodyParagraph}>
          In view of the above, you are required to develop and submit a Corrective and Preventive Action (CAPA) plan addressing each observation raised in the report within thirty (30) days of receipt of this letter.
        </Text>

        {/* CAPA Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colSN}>S/N</Text>
            <Text style={styles.colFinding}>Audit Findings</Text>
            <Text style={styles.colRoot}>Root Cause</Text>
            <Text style={styles.colCorrection}>Correction</Text>
            <Text style={styles.colPreventive}>Corrective Action</Text>
            <Text style={styles.colIndicator}>Indicators</Text>
            <Text style={styles.colTimeline}>Timeline</Text>
            <Text style={styles.colResp}>Resp.</Text>
            <Text style={styles.colStatus}>Status</Text>
          </View>

          {/* Critical */}
          <View style={[styles.tableRowSection, { backgroundColor: "#fee2e2" }]}>
            <Text style={{ padding: 2, color: "#991b1b" }}>CRITICAL DEFICIENCIES</Text>
          </View>
          {renderTableRows(criticalItems)}

          {/* Major */}
          <View style={[styles.tableRowSection, { backgroundColor: "#fef3c7" }]}>
            <Text style={{ padding: 2, color: "#92400e" }}>MAJOR DEFICIENCIES</Text>
          </View>
          {renderTableRows(majorItems)}

          {/* Other */}
          <View style={[styles.tableRowSection, { backgroundColor: "#f1f5f9" }]}>
            <Text style={{ padding: 2, color: "#334155" }}>OTHERS (MINOR / RECOMMENDATIONS)</Text>
          </View>
          {renderTableRows(otherItems)}
        </View>

        {/* Signatures */}
        <View style={styles.signatureGrid}>
          <View style={styles.sigBlock}>
            <Text style={styles.boldText}>Responsible Person (Facility QA Lead):</Text>
            <Text style={{ fontSize: 8, marginTop: 4 }}>Name: ______________________</Text>
            <View style={styles.sigLine} />
            <Text>Signature & Date</Text>
          </View>

          <View style={styles.sigBlock}>
            <Text style={styles.boldText}>Reviewed By:</Text>
            <View style={styles.sigLine} />
            <Text style={styles.boldText}>Divisional Deputy Director</Text>
            <Text>For: Director-General (NAFDAC)</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerGrid}>
          <View>
            <Text style={styles.boldText}>NAFDAC CORPORATE HQ:</Text>
            <Text>Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={styles.boldText}>LAGOS LIAISON OFFICE:</Text>
            <Text>Plot 1, Industrial Estate, Oshodi Apapa Expressway, Isolo, Lagos</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}