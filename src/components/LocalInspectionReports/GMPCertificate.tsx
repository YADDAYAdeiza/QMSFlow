import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica', lineHeight: 1.5 },
  logo: { width: 65, height: 65, marginBottom: 8 },
  header: { marginBottom: 15, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  nafdacTitle: { fontSize: 13, fontWeight: 'bold', color: '#004d00', textTransform: 'uppercase' },
  subTitle: { fontSize: 9, marginBottom: 8, fontWeight: 'bold' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, marginBottom: 15, fontSize: 9 },
  subject: { fontWeight: 'bold', textDecoration: 'underline', marginVertical: 12, textAlign: 'center', fontSize: 11 },
  body: { marginBottom: 12, textAlign: 'justify' },
  signature: { marginTop: 35 },
  signatureName: { fontWeight: 'bold', fontSize: 11, marginTop: 4 },
  listItem: { marginBottom: 3, marginLeft: 12 },
  footer: { 
    position: 'absolute', 
    bottom: 25, 
    left: 50, 
    right: 50, 
    borderTopWidth: 1, 
    borderTopColor: '#e2e8f0', 
    paddingTop: 6, 
    fontSize: 7, 
    textAlign: 'center', 
    color: '#64748b' 
  }
});

interface GMPCertificateData {
  appNumber: string;
  date: string;
  facilityName: string;
  facilityAddress: string;
  productLines?: Array<{ lineName: string; riskCategory?: string }>;
  activities?: string[];
  signatoryName?: string;
  signatoryTitle?: string;
}

export const GMPCertificate = ({ data }: { data: GmpCertificateData }) => {
  const activities = data.productLines?.length 
    ? data.productLines.map(p => `${p.lineName} ${p.riskCategory ? `(${p.riskCategory})` : ''}`)
    : data.activities || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.header}>
          <Image src="/nafdac_logo2-removebg-preview.png" style={styles.logo} />
          <Text style={styles.nafdacTitle}>National Agency for Food and Drug</Text>
          <Text style={styles.nafdacTitle}>Administration and Control</Text>
          <Text style={styles.subTitle}>(NAFDAC)</Text>
        </View>

        {/* Document Metadata */}
        <View style={styles.metaRow}>
          <Text><Text style={{ fontWeight: 'bold' }}>Ref:</Text> {data.appNumber}</Text>
          <Text><Text style={{ fontWeight: 'bold' }}>Date:</Text> {data.date}</Text>
        </View>

        {/* Subject Header */}
        <Text style={styles.subject}>
          NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) AUDIT
        </Text>

        {/* Body Text */}
        <Text style={styles.body}>
          This is to inform you that the Good Manufacturing Practice (GMP) audit of your facility,{" "}
          <Text style={{ fontWeight: 'bold' }}>{data.facilityName}</Text> located at{" "}
          <Text style={{ fontWeight: 'bold' }}>{data.facilityAddress || 'N/A'}</Text>, 
          was evaluated and found compliant with NAFDAC's current GMP Regulations for Medicinal and Allied Products.
        </Text>

        {/* Activities / Product Lines */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>
            Scope of Approved Manufacturing Activities / Lines:
          </Text>
          {activities.length > 0 ? (
            activities.map((item, i) => (
              <Text key={i} style={styles.listItem}>
                • {item}
              </Text>
            ))
          ) : (
            <Text style={styles.listItem}>• General Finished Product Manufacturing</Text>
          )}
        </View>

        <Text style={[styles.body, { marginTop: 8 }]}>
          This notification of outcome is valid for three (3) years from the date of final audit sign-off.
        </Text>

        {/* Official Signatory */}
        <View style={styles.signature}>
          <Text style={styles.signatureName}>
            {data.signatoryName || "Divisional Deputy Director"}
          </Text>
          <Text>Divisional Deputy Director, Veterinary Medicine & Allied Products</Text>
          <Text>For: Director-General (NAFDAC)</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>NAFDAC CORPORATE HQ: Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja, Nigeria.</Text>
          <Text>www.nafdac.gov.ng</Text>
        </View>
      </Page>
    </Document>
  );
};