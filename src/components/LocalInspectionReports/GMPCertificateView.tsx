// src/components/LocalInspectionReports/GMPCertificateView.tsx
import React from "react";
import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { 
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50, 
    fontSize: 10, 
    fontFamily: "Helvetica", 
    lineHeight: 1.5,
    backgroundColor: "#F4E8C1", // Classic straw/parchment tone
    position: "relative"
  },
  logo: { width: 65, height: 65, marginBottom: 8 },
  header: { marginBottom: 15, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" },
  nafdacTitle: { fontSize: 16, fontWeight: "bold", color: "#004d00", textTransform: "uppercase" },
  subTitle: { fontSize: 14, marginBottom: 8, fontWeight: "bold" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, marginBottom: 12, fontSize: 9 },
  recipientAddress: { marginBottom: 12, fontSize: 10, lineHeight: 1.4 },
  recipientTitle: { fontWeight: "bold" },
  companyNameText: { fontWeight: "bold" },
  facilityAddressText: { color: "#1e293b" },
  subject: { fontWeight: "bold", textDecoration: "underline", marginVertical: 12, textAlign: "center", fontSize: 11 },
  body: { marginBottom: 12, textAlign: "justify" },
  signatureBlock: { marginTop: 25, position: "relative" },
  signatureImage: { width: 120, height: 45, marginBottom: -10, marginLeft: -10 },
  signatureName: { fontWeight: "bold", fontSize: 11, marginTop: 4 },
  lineBlock: { marginBottom: 6, marginLeft: 8 },
  lineTitle: { fontWeight: "bold", fontSize: 10, color: "#1e293b" },
  productItem: { marginLeft: 14, fontSize: 9, color: "#334155" },

  // ==================== TWO-COLUMN FOOTER SYSTEM ====================
  footerWrapper: {
    position: "absolute",
    bottom: 25, 
    left: 50,   
    right: 50, 
    display: "flex",
    flexDirection: "column"
  },
  footerLine: {
    width: "100%",
    borderBottomWidth: 2,
    borderBottomColor: "#006600",
    marginBottom: 6
  },
  footerContainer: {
    display: "flex",
    flexDirection: "row",
    justify: "space-between",
    alignItems: "stretch"
  },
  footerColumn: {
    width: "46%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center", 
    justifyContent: "center"
  },
  footerPartition: {
    borderRightWidth: 1,
    borderRightColor: "#333333",
    marginHorizontal: 5
  },
  hqTextContainer: {
    lineHeight: 0.45, 
    textAlign: "left" 
  },
  officeTextContainer: {
    lineHeight: 0.45, 
    textAlign: "left" 
  },
  hqLabel: {
    color: "#CC0000", 
    fontWeight: "bold",
    fontSize: 8
  },
  officeLabel: {
    color: "#CC0000", 
    fontWeight: "bold",
    fontSize: 8
  },
  standardFooterText: {
    fontSize: 7.5,
    color: "#111111"
  },
  smallFooterText: {
    fontSize: 6.5, 
    color: "#333333"
  }
});

export interface ProductItem {
  name: string;
  classification?: string;
}

export interface ProductLine {
  lineName: string;
  lineType?: string;
  riskCategory?: string;
  products?: ProductItem[];
}

export interface GMPCertificateData {
  appNumber?: string;
  date?: string;
  facilityName?: string;
  facilityAddress?: string;
  effectiveCompanyName?: string;
  productLines?: (string | ProductLine)[];
  logoUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  signatureUrl?: string;
}

export function GMPCertificateView({ data }: { data: GMPCertificateData }) {
  const productLines = data?.productLines || [];
  const targetCompanyName = data?.effectiveCompanyName || data?.facilityName || "The Company";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image 
            src={data?.logoUrl || "/nafdac_logo2-removebg-preview.png"} 
            style={styles.logo} 
          />
          <Text style={styles.nafdacTitle}>National Agency for Food and Drug</Text>
          <Text style={styles.nafdacTitle}>Administration and Control</Text>
          <Text style={styles.subTitle}>(NAFDAC)</Text>
        </View>

        <View style={styles.metaRow}>
          <Text><Text style={{ fontWeight: "bold" }}>Ref:</Text> {data?.appNumber || "N/A"}</Text>
          <Text><Text style={{ fontWeight: "bold" }}>Date:</Text> {data?.date || "N/A"}</Text>
        </View>

        {/* 🏢 Recipient Address Block */}
        <View style={styles.recipientAddress}>
          <Text style={styles.recipientTitle}>The Managing Director,</Text>
          <Text style={styles.companyNameText}>{targetCompanyName},</Text>
          {data?.facilityAddress ? (
            <Text style={styles.facilityAddressText}>{data.facilityAddress}</Text>
          ) : null}
        </View>

        <Text style={styles.subject}>
          NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) AUDIT
        </Text>

        <Text style={styles.body}>
          This is to inform you that the Good Manufacturing Practice (GMP) audit of your facility,{" "}
          <Text style={{ fontWeight: "bold" }}>{data?.facilityName || "N/A"}</Text> located at{" "}
          <Text style={{ fontWeight: "bold" }}>{data?.facilityAddress || "N/A"}</Text>, 
          was evaluated and found compliant with NAFDAC's current GMP Regulations for Medicinal and Allied Products.
        </Text>

        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
            Scope of Approved Manufacturing Lines & Approved Products:
          </Text>
          {productLines.length > 0 ? (
            productLines.map((line, i) => (
              <View key={i} style={styles.lineBlock}>
                <Text style={styles.lineTitle}>
                  • {typeof line === "string" ? line : line.lineName}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ marginLeft: 8 }}>• General Finished Product Manufacturing Line</Text>
          )}
        </View>

        <Text style={[styles.body, { marginTop: 8 }]}>
          This notification of outcome is valid for three (3) years from the date of final audit sign-off.
        </Text>

        {/* ✍️ Signature Block */}
        <View style={styles.signatureBlock}>
          <Image 
            src={data?.signatureUrl || "/MudSig-removebg-preview.png"} 
            style={styles.signatureImage} 
          />
          <Text style={styles.signatureName}>
            {"Mudashir, I. A"}
          </Text>
          <Text>{"Deputy Director i/c, Veterinary Medicine & Allied Products"}</Text>
          <Text>For: Director-General (NAFDAC)</Text>
        </View>

        {/* 🏛️ Two-Column Footer */}
        <View style={styles.footerWrapper}>
          <View style={styles.footerLine} />
          
          <View style={styles.footerContainer}>
            {/* Column Left: Corporate HQ */}
            <View style={styles.footerColumn}>
              <Text style={styles.hqTextContainer}>
                <Text style={styles.hqLabel}>NAFDAC CORPORATE HQ:{"\n"}</Text>
                <Text style={styles.standardFooterText}>Plot 2932 Olusegun Obasanjo Way,{"\n"}</Text>
                <Text style={styles.standardFooterText}>Wuse Zone 7, Abuja{"\n"}</Text>
                <Text style={styles.smallFooterText}>Tel: +234-9-2905701, E-mail: nafdac@nafdac.gov.ng{"\n"}</Text>
                <Text style={styles.smallFooterText}>Website: www.nafdac.gov.ng</Text>
              </Text>
            </View>

            {/* Separator Line */}
            <View style={styles.footerPartition} />

            {/* Column Right: Lagos Liaison Office */}
            <View style={styles.footerColumn}>
              <Text style={styles.officeTextContainer}>
                <Text style={styles.officeLabel}>LAGOS LIAISON OFFICE:{"\n"}</Text>
                <Text style={styles.standardFooterText}>Plot 1, Industrial Estate{"\n"}</Text>
                <Text style={styles.standardFooterText}>Oshodi - Apapa Expressway, Isolo, Lagos{"\n"}</Text>
                <Text style={styles.smallFooterText}>Tel: +234-9-2905701</Text>
              </Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}

export default GMPCertificateView;