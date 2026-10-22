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
    isDeskReview?: boolean;
    fullPaymentDate?: string;
    expiryDate?: string;
  };
  userRole?: string;
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
  signatureImage: { 
    width: 140, 
    height: 140, 
    marginBottom: -90, 
    marginLeft: -32,    
    alignSelf: 'flex-start' 
  },
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
  addressBlock: { width: '35%', marginBottom: 15, lineHeight: 0.85 },
  companyName: { fontWeight: 'bold', textTransform: 'uppercase' },
  subject: { fontWeight: 'bold', textDecoration: 'underline', marginBottom: 15, marginTop: 10, textAlign: 'center' },
  body: { marginBottom: 10, textAlign: 'justify' },
  warningBox: {
    marginTop: 8,
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEEBA',
    borderRadius: 4
  },
  warningText: {
    fontSize: 10,
    color: '#856404',
    fontWeight: 'bold',
    textAlign: 'justify'
  },
  productList: { marginLeft: 30, marginBottom: 12 },
  productItem: { marginBottom: 3 },
  signatureBlockWrapper: { marginTop: 12 },
  signatureBlock: { marginTop: 2 }, 
  signatureName: { fontWeight: 'bold', fontSize: 12, marginTop: 2 },
  footerWrapper: {
    position: 'absolute',
    bottom: 25, 
    left: 55,  
    right: 55, 
    display: 'flex',
    flexDirection: 'column'
  },
  footerLine: { width: '100%', borderBottomWidth: 2, borderBottomColor: '#006600', marginBottom: 6 },
  footerContainer: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' },
  footerColumn: { width: '46%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  footerPartition: { borderRightWidth: 1, borderRightColor: '#333333', marginHorizontal: 5 },
  hqTextContainer: { lineHeight: 0.45, textAlign: 'left' },
  officeTextContainer: { lineHeight: 0.45, textAlign: 'left' },
  hqLabel: { color: '#CC0000', fontWeight: 'bold', fontSize: 8 },
  officeLabel: { color: '#CC0000', fontWeight: 'bold', fontSize: 8 },
  standardFooterText: { fontSize: 7.5, color: '#111111' },
  smallFooterText: { fontSize: 6.5, color: '#333333' }
});

export const ClearanceLetter = ({ data, userRole }: ClearanceLetterProps) => {
  const isDirector = userRole?.toLowerCase() === 'director';
  const hasExactDates = data.expiryDate && !data.expiryDate.includes("Pending") && !data.expiryDate.includes("Calculated");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        <View style={styles.header}>
          <Image src="/nafdac_logo2-removebg-preview.png" style={styles.logo} />
          <View style={styles.titleContainer}>
            <Text style={styles.nafdacTitle}>NATIONAL AGENCY FOR FOOD AND DRUG</Text>
            <Text style={styles.nafdacTitle}>ADMINISTRATION AND CONTROL</Text>
            <View style={styles.headerLine} />
          </View>
        </View>

        <View style={styles.refDateRow}>
          <Text>Ref: {data.appNumber || 'NAFDAC/VMAP/...'}</Text>
          <Text>Date: {data.date || 'Unspecified Date'}</Text>
        </View>

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

        <View style={styles.productList}>
          {data.products?.map((p: string, i: number) => (
            <Text key={i} style={styles.productItem}>{i + 1}. {p}</Text>
          ))}
        </View>

        <Text style={styles.body}>
          I write to inform you that your application for facility verification has been reviewed in line with the Agency's policy and procedures. 
          You shall be communicated in due course by the Agency for the physical inspection of the facility.
        </Text>

        {/* ONLY DISPLAY WARNING BLOCK IF AUDIT CONFIRMS DESK REVIEW
        {data.isDeskReview && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              NOTICE OF VALIDITY: Please note that this approval is processed via Desk Review based on a prior facility payment. 
              In accordance with Agency guidelines, the 3-year validity lifecycle of this GMP status counts strictly from the date of the original 
              Full Payment {hasExactDates ? `(Recorded: ${data.fullPaymentDate}) and expires precisely on ${data.expiryDate}` : 'and maintains a strict 3-year validity window from the original payment baseline'}. 
              This review does not extend an independent 3-year window from the current review date.
            </Text>
          </View>
        )} */}

        {/* DUAL-VARIANT VALIDITY NOTICE BOX */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {data.isDeskReview ? (
              `NOTICE OF VALIDITY: Please note that this approval is processed via Desk Review based on a prior facility payment. In accordance with Agency guidelines, the 3-year validity lifecycle of this GMP status counts strictly from the date of the original Full Payment ${hasExactDates ? `(Recorded: ${data.fullPaymentDate}) and expires precisely on${data.expiryDate}` : 'and maintains a strict 3-year validity window from the original payment baseline'}. This review does not extend an independent 3-year window from the current review date.`
            ) : (
              `NOTICE OF VALIDITY: Please note that this approval is granted following full payment verification. In accordance with Agency guidelines, the GMP status maintains a strict 3-year validity window starting from the date of payment, as reflected on the payment receipt.`
            )}
          </Text>
        </View>


        <View style={styles.signatureBlockWrapper}>
          <Text>Thank you.</Text>
          <View style={styles.signatureBlock}>
            {isDirector && (
              <Image src="/WaheedSign.png" style={styles.signatureImage} />
            )}
            <Text style={styles.signatureName}>
              {isDirector ? "Waheed Agboola" : "[Signature Pending Executive Sign-Off]"}
            </Text>
            <Text>Director, Veterinary Medicine & Allied Products</Text>
            <Text>For: Director-General (NAFDAC)</Text>
          </View>
        </View>

        <View style={styles.footerWrapper}>
          <View style={styles.footerLine} />
          <View style={styles.footerContainer}>
            <View style={styles.footerColumn}>
              <Text style={styles.hqTextContainer}>
                <Text style={styles.hqLabel}>NAFDAC CORPORATE HQ:{"\n"}</Text>
                <Text style={styles.standardFooterText}>Plot 2932 Olusegun Obasanjo Way,{"\n"}</Text>
                <Text style={styles.standardFooterText}>Wuse Zone 7, Abuja{"\n"}</Text>
                <Text style={styles.smallFooterText}>Tel: +234-9-2905701, E-mail: nafdac@nafdac.gov.ng{"\n"}</Text>
                <Text style={styles.smallFooterText}>Website: www.nafdac.gov.ng</Text>
              </Text>
            </View>
            <View style={styles.footerPartition} />
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
};