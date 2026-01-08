import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 60, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.5 },
  header: { marginBottom: 20, textAlign: 'center', alignItems: 'center' },
  nafdacTitle: { fontSize: 16, fontWeight: 'bold', color: '#004d00' }, // NAFDAC Green
  subTitle: { fontSize: 10, marginBottom: 10 },
  refDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  addressBlock: { marginBottom: 20 },
  companyName: { fontWeight: 'bold' },
  subject: { fontWeight: 'bold', textDecoration: 'underline', marginBottom: 10, marginTop: 10 },
  body: { marginBottom: 15, textAlign: 'justify' },
  productList: { marginLeft: 20, marginBottom: 15 },
  closing: { marginTop: 30 },
  signature: { marginTop: 40, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 30, left: 60, right: 60, borderTop: 1, paddingTop: 5, fontSize: 8, textAlign: 'center', color: 'gray' }
});

export const ClearanceLetter = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header section mirroring the PDF upload */}
      <View style={styles.header}>
        <Text style={styles.nafdacTitle}>NATIONAL AGENCY FOR FOOD AND DRUG</Text>
        <Text style={styles.nafdacTitle}>ADMINISTRATION AND CONTROL</Text>
        <Text style={styles.subTitle}>(NAFDAC)</Text>
      </View>

      <View style={styles.refDateRow}>
        <Text>Ref: {data.appNumber || 'NAFDAC/VMAP/2895/VOL.III/69'}</Text>
        <Text>Date: {new Date().toLocaleDateString('en-GB')}</Text>
      </View>

      <View style={styles.addressBlock}>
        <Text>The Managing Director,</Text>
        <Text style={styles.companyName}>{data.companyName}</Text>
        <Text>{data.companyAddress}</Text>
      </View>

      <Text style={styles.subject}>RE: APPLICATION FOR FACILITY VERIFICATION OF OVERSEAS PRODUCTION FACILITY</Text>

      <Text style={styles.body}>The above refers, please.</Text>
      
      <Text style={styles.body}>
        We refer to your letter requesting the verification of your overseas manufacturing facility; 
        {data.factoryName} {data.factoryAddress} for the purpose of registration of the following products;
      </Text>

      <View style={styles.productList}>
        {data.products?.map((p: string, i: number) => (
          <Text key={i}>{i + 1}. {p}</Text>
        ))}
      </View>

      <Text style={styles.body}>
        I write to inform that your application for facility verification has been reviewed in line with the Agency's policy and procedures. 
        You shall be communicated in due course by the Agency for the physical inspection of the facility.
      </Text>

      <View style={styles.closing}>
        <Text>Thank you.</Text>
        <View style={styles.signature}>
          <Text>Temitayo Stephanie Adeoye</Text>
          <Text>Director, Veterinary Medicine & Allied Products</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>NAFDAC CORPORATE HQ: Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja.</Text>
        <Text>Tel: +234-9-2905701 | E-mail: nafdac@nafdac.gov.ng | website: www.nafdac.gov.ng</Text>
      </View>
    </Page>
  </Document>
);