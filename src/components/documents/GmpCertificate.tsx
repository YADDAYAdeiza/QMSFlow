import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 60, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.5 },
  logo: { width: 70, height: 70, marginBottom: 10 },
  header: { marginBottom: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  nafdacTitle: { fontSize: 14, fontWeight: 'bold', color: '#004d00', textTransform: 'uppercase' },
  subTitle: { fontSize: 10, marginBottom: 10, fontWeight: 'bold' },
  subject: { fontWeight: 'bold', textDecoration: 'underline', marginVertical: 15, textAlign: 'center' },
  body: { marginBottom: 15, textAlign: 'justify' },
  signature: { marginTop: 40 },
  signatureName: { fontWeight: 'bold', fontSize: 12, marginTop: 5 },
  listItem: { marginBottom: 4, marginLeft: 10 },
  footer: { position: 'absolute', bottom: 30, left: 60, right: 60, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, fontSize: 8, textAlign: 'center', color: 'gray' }
});

export const GmpCertificate = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src="/nafdac_logo2-removebg-preview.png" style={styles.logo} />
        <Text style={styles.nafdacTitle}>NATIONAL AGENCY FOR FOOD AND DRUG</Text>
        <Text style={styles.nafdacTitle}>ADMINISTRATION AND CONTROL</Text>
        <Text style={styles.subTitle}>(NAFDAC)</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
        <Text>Ref: {data.appNumber || 'NAFDAC/DER/HQ/...'}</Text>
        <Text>Date: {data.date}</Text>
      </View>

      <Text style={styles.subject}>NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) AUDIT</Text>

      <Text style={styles.body}>
        This is to inform you that the Good Manufacturing Practice (GMP) audit of your factory, 
        {" "}<Text style={{ fontWeight: 'bold' }}>{data.facilityName}</Text> at {data.facilityAddress}, 
        complied with NAFDAC's current GMP for Medicinal Products Regulations.
      </Text>

      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
          Product lines inspected and approved were:
        </Text>
        {data.productLines?.map((line: any, i: number) => (
          <Text key={i} style={styles.listItem}>
            • {line.lineName} ({line.riskCategory})
          </Text>
        ))}
      </View>

      <Text style={[styles.body, { marginTop: 10 }]}>
        This notification is valid for three (3) years from the date of inspection.
      </Text>

      <View style={styles.signature}>
        <Text style={styles.signatureName}>Dr. Idayat Mudashir</Text>
        <Text>Divisional Deputy Director, Veterinary Medicine & Allied Products</Text>
        <Text>For: Director-General (NAFDAC)</Text>
      </View>

      <View style={styles.footer}>
        <Text>NAFDAC CORPORATE HQ: Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja.</Text>
        <Text>www.nafdac.gov.ng</Text>
      </View>
    </Page>
  </Document>
);