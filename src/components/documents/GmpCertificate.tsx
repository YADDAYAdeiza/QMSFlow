import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 60, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.5 },
  header: { marginBottom: 20, textAlign: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: 'bold', color: '#004d00', textAlign: 'center' },
  subject: { fontWeight: 'bold', textDecoration: 'underline', marginVertical: 15, textAlign: 'center' },
  body: { marginBottom: 15, textAlign: 'justify' },
  signature: { marginTop: 40, fontWeight: 'bold' },
});

export const GmpCertificate = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>NATIONAL AGENCY FOR FOOD AND DRUG ADMINISTRATION AND CONTROL</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>Ref: {data.refNumber || 'NAFDAC/DER/HQ/...'}</Text>
        <Text>Date: {new Date().toLocaleDateString('en-GB')}</Text>
      </View>

      <Text style={styles.subject}>NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) AUDIT</Text>

      <Text style={styles.body}>
        This is to inform you that the Good Manufacturing Practice (GMP) audit of your factory, {data.factoryName} at {data.factoryAddress}, complied with NAFDAC's current GMP for Medicinal Products Regulations[cite: 36, 37].
      </Text>

      <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Product lines inspected and approved were:</Text>
      {data.productLines?.map((line: string, i: number) => (
        <Text key={i}>• {line}</Text>
      ))}

      <Text style={[styles.body, { marginTop: 10 }]}>
        This notification is valid for three (3) years from the date of inspection[cite: 43].
      </Text>

      <View style={styles.signature}>
        <Text>Temitatyo Stephanie Adeoye</Text>
        <Text>Director (Veterinary Medicine and Allied Product Directorate)</Text>
        <Text>For: Director-General (NAFDAC)</Text>
      </View>
    </Page>
  </Document>
);