// src/components/LocalInspectionReports/GMPReportPDFView.tsx
import React from "react";
import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";
import parse, { Element, DOMNode, Text as HTMLText } from "html-react-parser";

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontSize: 9, 
    fontFamily: "Helvetica", 
    lineHeight: 1.4,
    backgroundColor: "#FFFFFF" 
  },
  logo: { width: 60, height: 60, alignSelf: "center", marginBottom: 6 },
  header: { marginBottom: 12, textAlign: "center" },
  nafdacTitle: { fontSize: 11, fontWeight: "bold", color: "#004d00", textTransform: "uppercase", textAlign: "center" },
  subTitle: { fontSize: 8, marginBottom: 8, fontWeight: "bold", textAlign: "center" },
  
  // HTML Element Mappings
  h1: { fontSize: 13, fontWeight: "bold", color: "#004d00", marginTop: 12, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: "#CBD5E1", paddingBottom: 2 },
  h2: { fontSize: 12, fontWeight: "bold", color: "#004d00", marginTop: 10, marginBottom: 4 },
  h3: { fontSize: 11, fontWeight: "bold", color: "#004d00", marginTop: 8, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: "#CBD5E1", paddingBottom: 2 },
  p: { marginBottom: 6, textAlign: "justify" },
  bold: { fontWeight: "bold" },
  ul: { marginLeft: 10, marginBottom: 6 },
  li: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 10, fontSize: 9 },
  liText: { flex: 1 },
  
  footer: { 
    position: "absolute", 
    bottom: 20, 
    left: 40, 
    right: 40, 
    borderTopWidth: 1, 
    borderTopColor: "#E2E8F0", 
    paddingTop: 4, 
    fontSize: 7, 
    textAlign: "center", 
    color: "#64748B" 
  }
});

interface GMPReportPDFProps {
  reportHtml: string;
  logoUrl?: string;
  docNumber?: string;
}

export function GMPReportPDFView({ reportHtml, logoUrl, docNumber }: GMPReportPDFProps) {
  // Convert HTML DOM nodes recursively into @react-pdf primitive nodes
  const renderNode = (node: DOMNode, index: number): React.ReactNode => {
    // 1. Plain Text Nodes
    if (node.type === "text") {
      return (node as HTMLText).data;
    }

    // 2. Tag Elements
    if (node.type === "tag") {
      const elem = node as Element;
      const children = elem.children ? elem.children.map((child, i) => renderNode(child, i)) : null;

      switch (elem.name) {
        case "h1":
          return <Text key={index} style={styles.h1}>{children}</Text>;
        case "h2":
          return <Text key={index} style={styles.h2}>{children}</Text>;
        case "h3":
        case "h4":
          return <Text key={index} style={styles.h3}>{children}</Text>;
        case "p":
          return <View key={index} style={styles.p}><Text>{children}</Text></View>;
        case "strong":
        case "b":
          return <Text key={index} style={styles.bold}>{children}</Text>;
        case "ul":
        case "ol":
          return <View key={index} style={styles.ul}>{children}</View>;
        case "li":
          return (
            <View key={index} style={styles.li}>
              <Text style={styles.bullet}>• </Text>
              <Text style={styles.liText}>{children}</Text>
            </View>
          );
        case "br":
          return "\n";
        default:
          return <Text key={index}>{children}</Text>;
      }
    }
    return null;
  };

  const parsedContent = parse(reportHtml, {
    replace: (domNode) => {
      // Intercept root parsing with recursive converter
      return <>{renderNode(domNode, 0)}</>;
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.header}>
          <Image 
            src={logoUrl || "/nafdac_logo2-removebg-preview.png"} 
            style={styles.logo} 
          />
          <Text style={styles.nafdacTitle}>National Agency for Food and Drug Administration and Control (NAFDAC)</Text>
          <Text style={styles.subTitle}>Veterinary Medicine & Allied Products Directorate</Text>
        </View>

        {/* Dynamic Content Body */}
        <View style={{ marginTop: 10 }}>
          {parsedContent}
        </View>

        {/* Standard Footer */}
        <View style={styles.footer} fixed>
          <Text>NAFDAC CORPORATE HQ: Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja, Nigeria. | www.nafdac.gov.ng</Text>
          {docNumber ? <Text style={{ marginTop: 2 }}>Document Reference: {docNumber}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}

export default GMPReportPDFView;