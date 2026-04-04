import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 60, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.5 },
  logo: { width: 70, height: 70, marginBottom: 10 },
  header: { marginBottom: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  nafdacTitle: { fontSize: 14, fontWeight: 'bold', color: '#004d00', textTransform: 'uppercase' },
  subTitle: { fontSize: 10, marginBottom: 10, fontWeight: 'bold' },
  refDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: 20 },
  addressBlock: { marginBottom: 20, lineHeight: 1.2 },
  companyName: { fontWeight: 'bold', textTransform: 'uppercase' },
  subject: { fontWeight: 'bold', textDecoration: 'underline', marginBottom: 15, marginTop: 10, textAlign: 'center' },
  body: { marginBottom: 12, textAlign: 'justify' },
  productList: { marginLeft: 30, marginBottom: 15 },
  productItem: { marginBottom: 4 },
  signatureBlock: { marginTop: 30 },
  signatureName: { fontWeight: 'bold', fontSize: 12, marginTop: 5 },
  footer: { position: 'absolute', bottom: 30, left: 60, right: 60, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, fontSize: 8, textAlign: 'center', color: 'gray' }
});

export const ClearanceLetter = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src="/nafdac_logo2-removebg-preview.png" style={styles.logo} />
        <Text style={styles.nafdacTitle}>NATIONAL AGENCY FOR FOOD AND DRUG</Text>
        <Text style={styles.nafdacTitle}>ADMINISTRATION AND CONTROL</Text>
        <Text style={styles.subTitle}>(NAFDAC)</Text>
      </View>

      <View style={styles.refDateRow}>
        <Text>Ref: {data.appNumber || 'NAFDAC/VMAP/2895/VOL.III/69'}</Text>
        <Text>Date: {data.date}</Text>
      </View>

      <View style={styles.addressBlock}>
        <Text>The Managing Director,</Text>
        <Text style={styles.companyName}>{data.localApplicantName}</Text>
        <Text>{data.localApplicantAddress}</Text>
      </View>

      <Text style={styles.subject}>RE: APPLICATION FOR FACILITY VERIFICATION OF OVERSEAS PRODUCTION FACILITY</Text>

      <Text style={styles.body}>The above refers, please.</Text>
      <Text style={styles.body}>
        We refer to your letter requesting the verification of your overseas manufacturing facility; 
        {" "}{data.factoryName}, {data.factoryAddress} for the purpose of registration of the following products:
      </Text>

      <View style={styles.productList}>
        {data.products?.map((p: string, i: number) => (
          <Text key={i} style={styles.productItem}>{i + 1}. {p}</Text>
        ))}
      </View>

      <Text style={styles.body}>
        I write to inform you that your application for facility verification has been reviewed in line with the Agency's policy and procedures. 
        You shall be communicated in due course by the Agency for the physical inspection of the facility.
      </Text>

      <View style={{ marginTop: 20 }}>
        <Text>Thank you.</Text>
        <View style={styles.signatureBlock}>
          {/* <Image src="/Signature-removebg-preview.png" style={{ width: 100, height: 80 }} /> */}
          <Text style={styles.signatureName}>Dr. Idayat Mudashir</Text>
          <Text>Deputy Director in-charge, Veterinary Medicine & Allied Products</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>NAFDAC CORPORATE HQ: Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja.</Text>
        <Text>www.nafdac.gov.ng</Text>
      </View>
    </Page>
  </Document>
);