// src/components/LocalInspectionReports/GMPCertificateView.tsx
import React from "react";
import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { 
    padding: 50, 
    fontSize: 10, 
    fontFamily: "Helvetica", 
    lineHeight: 1.5,
    backgroundColor: "#F4E8C1" // Classic straw/parchment tone
  },
  logo: { width: 65, height: 65, marginBottom: 8 },
  header: { marginBottom: 15, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" },
  nafdacTitle: { fontSize: 13, fontWeight: "bold", color: "#004d00", textTransform: "uppercase" },
  subTitle: { fontSize: 9, marginBottom: 8, fontWeight: "bold" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, marginBottom: 12, fontSize: 9 },
  recipientAddress: { marginBottom: 12, fontSize: 10, lineHeight: 1.4 },
  recipientTitle: { fontWeight: "bold" },
  companyNameText: { fontWeight: "bold" },
  facilityAddressText: { color: "#1e293b" },
  subject: { fontWeight: "bold", textDecoration: "underline", marginVertical: 12, textAlign: "center", fontSize: 11 },
  body: { marginBottom: 12, textAlign: "justify" },
  signature: { marginTop: 35 },
  signatureName: { fontWeight: "bold", fontSize: 11, marginTop: 4 },
  lineBlock: { marginBottom: 6, marginLeft: 8 },
  lineTitle: { fontWeight: "bold", fontSize: 10, color: "#1e293b" },
  productItem: { marginLeft: 14, fontSize: 9, color: "#334155" },
  footer: { 
    position: "absolute", 
    bottom: 25, 
    left: 50, 
    right: 50, 
    borderTopWidth: 1, 
    borderTopColor: "#D8CBB0", 
    paddingTop: 6, 
    fontSize: 7, 
    textAlign: "center", 
    color: "#524836" 
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
  productLines?: ProductLine[];
  logoUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;
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
          {/* {productLines.length > 0 ? (
            productLines.map((line, i) => (
              <View key={i} style={styles.lineBlock}>
                <Text style={styles.lineTitle}>
                  • {line.lineName} {line.lineType ? `(${line.lineType})` : ""}
                </Text>
                {line.products && line.products.length > 0 ? (
                  line.products.map((prod, pIdx) => (
                    <Text key={pIdx} style={styles.productItem}>
                      - Product: {typeof prod === "string" ? prod : prod.name} {typeof prod === "object" && prod.classification ? `[${prod.classification}]` : ""}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.productItem}>- Standard formulations under scope</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={{ marginLeft: 8 }}>• General Finished Product Manufacturing Line</Text>
          )} */}
        </View>

        <Text style={[styles.body, { marginTop: 8 }]}>
          This notification of outcome is valid for three (3) years from the date of final audit sign-off.
        </Text>

        <View style={styles.signature}>
          <Text style={styles.signatureName}>
            {data?.signatoryName || "Divisional Deputy Director"}
          </Text>
          <Text>{data?.signatoryTitle || "Divisional Deputy Director, Veterinary Medicine & Allied Products"}</Text>
          <Text>For: Director-General (NAFDAC)</Text>
        </View>

        <View style={styles.footer}>
          <Text>NAFDAC CORPORATE HQ: Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja, Nigeria.</Text>
          <Text>www.nafdac.gov.ng</Text>
        </View>
      </Page>
    </Document>
  );
}

export default GMPCertificateView;