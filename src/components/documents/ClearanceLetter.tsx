// import React from 'react';
// import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// const styles = StyleSheet.create({
//   page: { 
//     padding: 60, 
//     fontSize: 11, 
//     fontFamily: 'Helvetica', 
//     lineHeight: 1.5,
//     backgroundColor: '#FCFBF4' // ✅ ALTERED: Added premium Ivory / Light Yellow background
//   },
//   logo: { width: 70, height: 70, marginBottom: 10 },
//   header: { marginBottom: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
//   nafdacTitle: { fontSize: 14, fontWeight: 'bold', color: '#004d00', textTransform: 'uppercase' },
//   subTitle: { fontSize: 10, marginBottom: 10, fontWeight: 'bold' },
//   refDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: 20 },
//   addressBlock: { marginBottom: 20, lineHeight: 1.2 },
//   companyName: { fontWeight: 'bold', textTransform: 'uppercase' },
//   subject: { fontWeight: 'bold', textDecoration: 'underline', marginBottom: 15, marginTop: 10, textAlign: 'center' },
//   body: { 
//     marginBottom: 12, 
//     textAlign: 'justify' 
//     // ✅ ALTERED: Removed harsh highlight backgroundColor: 'yellow' 
//   },
//   productList: { marginLeft: 30, marginBottom: 15 },
//   productItem: { marginBottom: 4 },
//   signatureBlock: { marginTop: 30 },
//   signatureName: { fontWeight: 'bold', fontSize: 12, marginTop: 5 },
//   footer: { position: 'absolute', bottom: 30, left: 60, right: 60, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, fontSize: 8, textAlign: 'center', color: 'gray' }
// });

// export const ClearanceLetter = ({ data }: { data: any }) => (
//   <Document>
//     <Page size="A4" style={styles.page}>
//       {/* Official NAFDAC Header */}
//       <View style={styles.header}>
//         <Image src="/nafdac_logo2-removebg-preview.png" style={styles.logo} />
//         <Text style={styles.nafdacTitle}>NATIONAL AGENCY FOR FOOD AND DRUG</Text>
//         <Text style={styles.nafdacTitle}>ADMINISTRATION AND CONTROL</Text>
//         <Text style={styles.subTitle}>(NAFDAC)</Text>
//       </View>

//       {/* References and Tracking Timeline Details */}
//       <View style={styles.refDateRow}>
//         <Text>Ref: {data.appNumber || 'NAFDAC/VMAP/...'}</Text>
//         <Text>Date: {data.date}</Text>
//       </View>

//       {/* Addressee Block */}
//       <View style={styles.addressBlock}>
//         <Text>The Managing Director,</Text>
//         <Text style={styles.companyName}>{data.localApplicantName}</Text>
//         <Text>{data.localApplicantAddress}</Text>
//       </View>

//       <Text style={styles.subject}>RE: APPLICATION FOR FACILITY VERIFICATION OF OVERSEAS PRODUCTION FACILITY</Text>

//       <Text style={styles.body}>The above refers, please.</Text>
      
//       {/* Fixed text alignment formatting for react-pdf compilation */}
//       <Text style={styles.body}>
//         We refer to your letter requesting the verification of your overseas manufacturing facility; {data.factoryName || 'Unspecified Site'}, {data.factoryAddress || 'Unspecified Address'} for the purpose of registration of the following products:
//       </Text>

//       {/* Tracked Product List mapping section */}
//       <View style={styles.productList}>
//         {data.products?.map((p: string, i: number) => (
//           <Text key={i} style={styles.productItem}>{i + 1}. {p}</Text>
//         ))}
//       </View>

//       <Text style={styles.body}>
//         I write to inform you that your application for facility verification has been reviewed in line with the Agency's policy and procedures. 
//         You shall be communicated in due course by the Agency for the physical inspection of the facility.
//       </Text>

//       {/* Sign-off Authorization Block */}
//       <View style={{ marginTop: 20 }}>
//         <Text>Thank you.</Text>
//         <View style={styles.signatureBlock}>
//           <Image src="/MudSig-removebg-preview.png" style={styles.logo} />
//           <Text style={styles.signatureName}>Mudashir, I. A</Text>
//           <Text>Divisional Deputy Director i/c, Veterinary Medicine & Allied Products</Text>
//           <Text>For: Director-General (NAFDAC)</Text>
//         </View>
//       </View>
        
//       {/* Official Footing Registry */}
//       <View style={styles.footer}>
//         <Text>NAFDAC CORPORATE HQ: Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja.</Text>
//         <Text>www.nafdac.gov.ng</Text>
//       </View>
//     </Page>
//   </Document>
// );

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
    padding: 35, // ✅ LEARNING: Reduced padding to increase printable real estate area
    fontSize: 11, 
    fontFamily: 'Helvetica', 
    lineHeight: 1.25,
    backgroundColor: '#FCFBF4', // ✅ PRESERVED: Premium Ivory / Light Yellow background
    position: 'relative'
  },
  
  logo: { width: 84, height: 84, marginRight: 15 },
  signatureImage: { width: 70, height: 70, marginBottom: 5 }, // Specific sizing for signature capture asset
  
  // ✅ LEARNING: Side-by-side header row design layout
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
    textAlign: 'center' 
  },
  
  headerLine: {
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: '#006600',
    marginTop: 8
  },
  
  refDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 15 },
  addressBlock: { marginBottom: 15, lineHeight: 1.1 },
  companyName: { fontWeight: 'bold', textTransform: 'uppercase' },
  subject: { fontWeight: 'bold', textDecoration: 'underline', marginBottom: 15, marginTop: 10, textAlign: 'center' },
  body: { marginBottom: 10, textAlign: 'justify' },
  productList: { marginLeft: 30, marginBottom: 12 },
  productItem: { marginBottom: 3 },
  
  // ✅ LEARNING: Pushes the sign-off block downwards toward the footer to prevent page stranding
  signatureBlockWrapper: { 
    marginTop: 110 
  },
  signatureBlock: { marginTop: 10 },
  signatureName: { fontWeight: 'bold', fontSize: 12, marginTop: 5 },

  // ==================== LEARNING: HIGH REFINEMENT FOOTER SYSTEM ====================
  footerWrapper: {
    position: 'absolute',
    bottom: 25, 
    left: 35,
    right: 35,
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
    alignItems: 'center', // Centers the entire wrapper block as a single cohesive unit
    justifyContent: 'center'
  },
  footerPartition: {
    borderRightWidth: 1,
    borderRightColor: '#333333',
    marginHorizontal: 5
  },
  hqTextContainer: {
    lineHeight: 0.45, // Halved line-height factor for ultra-tight text tracking
    textAlign: 'left' // Reverted to strict left alignment inside the centered block container
  },
  officeTextContainer: {
    lineHeight: 0.45, // Halved line-height factor for ultra-tight text tracking
    textAlign: 'left' // Reverted to strict left alignment inside the centered block container
  },
  hqLabel: {
    color: '#CC0000', // Both labels set to professional corporate red
    fontWeight: 'bold',
    fontSize: 8
  },
  officeLabel: {
    color: '#CC0000', // Both labels set to professional corporate red
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

export const ClearanceLetter = ({ data }: ClearanceLetterProps) => (
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

      {/* Addressee Block */}
      <View style={styles.addressBlock}>
        <Text>The Managing Director,</Text>
        <Text style={styles.companyName}>{data.localApplicantName || 'Unspecified Applicant'}</Text>
        <Text>{data.localApplicantAddress || 'Unspecified Address'}</Text>
      </View>

      <Text style={styles.subject}>RE: APPLICATION FOR FACILITY VERIFICATION OF OVERSEAS PRODUCTION FACILITY</Text>

      <Text style={styles.body}>The above refers, please.</Text>
      
      <Text style={styles.body}>
        We refer to your letter requesting the verification of your overseas manufacturing facility; {data.factoryName || 'Unspecified Site'}, {data.factoryAddress || 'Unspecified Address'} for the purpose of registration of the following products:
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

      {/* Dynamic Sign-off Authorization Pushing Block */}
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