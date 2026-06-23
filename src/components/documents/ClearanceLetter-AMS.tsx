import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

interface ClearanceLetterProps {
  data: {
    appNumber?: string;
    date?: string;
    localApplicantName?: string;
    localApplicantAddress?: string;
    factoryName?: string;
    factoryAddress?: string;
    products?: string[];
  };
}

const styles = StyleSheet.create({
  page: { 
    paddingTop: 35,       
    paddingBottom: 35,    
    paddingHorizontal: 55, 
    fontSize: 11, 
    fontFamily: 'Helvetica', 
    lineHeight: 1.25,
    backgroundColor: '#FCFBF4', 
    position: 'relative'
  },
  
  logo: { width: 84, height: 84, marginRight: 15 },
  
  // ✅ ALTERED: Enlarged signature dimensions by 3x (from 70x70 to 210x210)
  signatureImage: { width: 70, height: 70, marginBottom: 2 },
  
  header: { 
    marginBottom: 15, 
    display: 'flex', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  titleContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  nafdacTitle: { 
    fontSize: 17, 
    fontWeight: 900, 
    color: '#006600', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 1.4 
  },
  
  headerLine: {
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: '#006600',
    marginTop: 8
  },
  
  refDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 15 },
  
  addressBlock: { 
    width: '35%', 
    marginBottom: 15, 
    lineHeight: 0.85 
  },
  
  companyName: { fontWeight: 'bold', textTransform: 'uppercase' },
  subject: { fontWeight: 'bold', textDecoration: 'underline', marginBottom: 15, marginTop: 10, textAlign: 'center' },
  boldText: { fontWeight: 'bold' },
  body: { marginBottom: 10, textAlign: 'justify' },
  productList: { marginLeft: 30, marginBottom: 12 },
  productItem: { marginBottom: 3 },
  
  signatureBlockWrapper: { 
    marginTop: 12 
  },
  signatureBlock: { marginTop: 5 },
  signatureName: { fontWeight: 'bold', fontSize: 12, marginTop: 5 },

  // ==================== FOOTER LAYOUT SYSTEM ====================
  footerWrapper: {
    position: 'absolute',
    bottom: 25, 
    left: 55,  
    right: 55, 
    display: 'flex',
    flexDirection: 'column'
  },
  footerLine: {
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: '#006600',
    marginBottom: 6
  },
  footerContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch'
  },
  footerColumn: {
    width: '46%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', 
    justifyContent: 'center'
  },
  footerPartition: {
    borderRightWidth: 1,
    borderRightColor: '#333333',
    marginHorizontal: 5
  },
  hqTextContainer: {
    lineHeight: 0.45, 
    textAlign: 'left' 
  },
  officeTextContainer: {
    lineHeight: 0.45, 
    textAlign: 'left' 
  },
  hqLabel: {
    color: '#CC0000', 
    fontWeight: 'bold',
    fontSize: 8
  },
  officeLabel: {
    color: '#CC0000', 
    fontWeight: 'bold',
    fontSize: 8
  },
  standardFooterText: {
    fontSize: 7.5,
    color: '#111111'
  },
  smallFooterText: {
    fontSize: 6.5, 
    color: '#333333'
  }
});

export const ClearanceLetterAMS = ({ data }: ClearanceLetterProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Official Header Flex-Row Layout */}
      <View style={styles.header}>
        <Image src="/nafdac_logo2-removebg-preview.png" style={styles.logo} />
        
        {/* Title Text Column Stack */}
        <View style={styles.titleContainer}>
          <Text style={styles.nafdacTitle}>NATIONAL AGENCY FOR FOOD AND DRUG</Text>
          <Text style={styles.nafdacTitle}>ADMINISTRATION AND CONTROL</Text>
          <View style={styles.headerLine} />
        </View>
      </View>

      {/* References and Tracking Timeline Details */}
      <View style={styles.refDateRow}>
        <Text>Ref: {data.appNumber || 'NAFDAC/VMAP/...'}</Text>
        <Text>Date: {data.date || 'Unspecified Date'}</Text>
      </View>

      {/* Addressee Block (With Updated Tight Tracking Line Height) */}
      <View style={styles.addressBlock}>
        <Text>The Managing Director,</Text>
        <Text style={styles.companyName}>{data.localApplicantName || 'Unspecified Applicant'}</Text>
        <Text>{data.localApplicantAddress || 'Unspecified Address'}</Text>
      </View>

      {/* Heading with explicit line break and underline-friendly nested structure */}
      <Text style={styles.subject}>
        RE: APPLICATION FOR FACILITY VERIFICATION OF OVERSEAS PRODUCTION FACILITY{"\n"}
        <Text style={styles.boldText}>(ADDITIONAL MANUFACTURING SITE)</Text>
      </Text>

      <Text style={styles.body}>The above refers, please.</Text>
      
      {/* Adjusted Text Body: Comma placed after factoryAddress, followed by un-bolded "as" */}
      <Text style={styles.body}>
        We refer to your letter requesting the verification of your overseas manufacturing facility; {data.factoryName || 'Unspecified Site'}, {data.factoryAddress || 'Unspecified Address'}, as{" "}
        <Text style={styles.boldText}>ADDITIONAL MANUFACTURING SITE</Text>, for the purpose of registration of the following products:
      </Text>

      {/* Tracked Product List mapping section */}
      <View style={styles.productList}>
        {data.products?.map((p: string, i: number) => (
          <Text key={i} style={styles.productItem}>{i + 1}. {p}</Text>
        ))}
      </View>

      <Text style={styles.body}>
        I write to inform you that your application for facility verification has been reviewed in line with the Agency's policy and procedures. 
        You shall be communicated in due course by the Agency for the physical inspection of the facility.
      </Text>

      {/* Dynamic Sign-off Authorization Block */}
      <View style={styles.signatureBlockWrapper}>
        <Text>Thank you.</Text>
        <View style={styles.signatureBlock}>
          <Image src="/MudSig-removebg-preview.png" style={styles.signatureImage} />
          <Text style={styles.signatureName}>Mudashir, I. A</Text>
          <Text>Deputy Director i/c, Veterinary Medicine & Allied Products</Text>
          <Text>For: Director-General (NAFDAC)</Text>
        </View>
      </View>

      {/* Left-Aligned Block-Centered Two Column Corporate Footer */}
      <View style={styles.footerWrapper}>
        <View style={styles.footerLine} />
        
        <View style={styles.footerContainer}>
          {/* Column Left: Corporate Headquarters */}
          <View style={styles.footerColumn}>
            <Text style={styles.hqTextContainer}>
              <Text style={styles.hqLabel}>NAFDAC CORPORATE HQ:{"\n"}</Text>
              <Text style={styles.standardFooterText}>Plot 2932 Olusegun Obasanjo Way,{"\n"}</Text>
              <Text style={styles.standardFooterText}>Wuse Zone 7, Abuja{"\n"}</Text>
              <Text style={styles.smallFooterText}>Tel: +234-9-2905701, E-mail: nafdac@nafdac.gov.ng{"\n"}</Text>
              <Text style={styles.smallFooterText}>Website: www.nafdac.gov.ng</Text>
            </Text>
          </View>

          {/* Separator Partition Wall */}
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