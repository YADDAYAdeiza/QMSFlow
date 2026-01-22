import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', lineHeight: 1.5 },
  header: { textAlign: 'center', marginBottom: 20, borderBottom: 1, pb: 10 },
  agencyName: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  directorate: { fontSize: 11, fontWeight: 'bold', textDecoration: 'underline', marginTop: 4 },
  address: { fontSize: 8, marginTop: 2 },
  
  metaSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, fontWeight: 'bold' },
  recipient: { marginBottom: 20 },
  subject: { textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: 15, fontSize: 10 },
  
  table: { display: 'flex', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { margin: 'auto', flexDirection: 'row' },
  tableColHeader: { width: '14.28%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f0f0f0', padding: 4 },
  tableCol: { width: '14.28%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, padding: 4, minHeight: 25 },
  tableCellHeader: { fontWeight: 'bold', fontSize: 7 },
  tableCell: { fontSize: 7 },
  categoryRow: { backgroundColor: '#f9f9f9', fontWeight: 'bold', fontStyle: 'italic' },

  sigSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, marginBottom: 30 },
  sigBox: { width: '45%' },
  sigLine: { borderBottom: 1, marginTop: 15, marginBottom: 5 },
  
  footer: { marginTop: 40 },
  closing: { fontWeight: 'bold' }
});

export const CapaLetter = ({ data, observations }: any) => {
  const getBySeverity = (sev: string) => observations.filter((o: any) => o.severity?.toLowerCase() === sev.toLowerCase());
  
  const criticals = getBySeverity('Critical');
  const majors = getBySeverity('Major');
  const others = getBySeverity('Others').length > 0 ? getBySeverity('Others') : getBySeverity('Minor');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.agencyName}>National Agency for Food and Drug Administration and Control</Text>
          <Text style={styles.directorate}>OFFICE OF THE DIRECTOR (AFPD) DIRECTORATE</Text>
          <Text style={styles.address}>Plot 1, Isolo Industrial Scheme, Oshodi-Apapa Expressway, Isolo, Lagos</Text>
        </View>

        {/* Ref and Date */}
        <View style={styles.metaSection}>
          <Text>Ref. No: NAFDAC/AFPD/2026/{data.appNumber}</Text>
          <Text>Date: {data.date}</Text>
        </View>

        {/* Recipient */}
        <View style={styles.recipient}>
          <Text style={{ fontWeight: 'bold', textDecoration: 'underline' }}>The Managing Director,</Text>
          <Text>{data.companyName}</Text>
          <Text>{data.companyAddress}</Text>
        </View>

        <Text style={styles.subject}>Notification of Outcome of Good Manufacturing Practice (GMP) Inspection</Text>

        <Text style={{ marginBottom: 10 }}>
          Kindly recall that your factory was inspected by a team of NAFDAC inspectors. However, your application for registration of products will not be granted as the inspection was not satisfactory.
        </Text>

        <Text style={{ marginBottom: 15 }}>
          You are expected to submit your CAPA Plan of actions taken to close the deficiencies using the table below and provide objective evidences in an electronic editable format.
        </Text>

        {/* The CAPA Table */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {['Audit Findings', 'Root Cause', 'Correction', 'Corrective Action', 'Indicators', 'Timeline', 'Responsibility'].map((h) => (
              <View key={h} style={styles.tableColHeader}><Text style={styles.tableCellHeader}>{h}</Text></View>
            ))}
          </View>

          {/* Criticals */}
          <View style={[styles.tableRow, styles.categoryRow]}>
            <View style={{ width: '100%', borderBottom: 1, padding: 3 }}><Text>Critical</Text></View>
          </View>
          {criticals.map((obs: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>• {obs.finding}</Text></View>
              {[...Array(6)].map((_, j) => <View key={j} style={styles.tableCol} />)}
            </View>
          ))}

          {/* Majors */}
          <View style={[styles.tableRow, styles.categoryRow]}>
            <View style={{ width: '100%', borderBottom: 1, padding: 3 }}><Text>Major</Text></View>
          </View>
          {majors.map((obs: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>• {obs.finding}</Text></View>
              {[...Array(6)].map((_, j) => <View key={j} style={styles.tableCol} />)}
            </View>
          ))}

          {/* Others */}
          <View style={[styles.tableRow, styles.categoryRow]}>
            <View style={{ width: '100%', borderBottom: 1, padding: 3 }}><Text>Others</Text></View>
          </View>
          {others.map((obs: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>• {obs.finding}</Text></View>
              {[...Array(6)].map((_, j) => <View key={j} style={styles.tableCol} />)}
            </View>
          ))}
        </View>

        {/* Signatures */}
        <View style={styles.sigSection}>
          <View style={styles.sigBox}>
            <Text style={{ fontWeight: 'bold', fontStyle: 'italic' }}>Responsible Person:</Text>
            <View style={styles.sigLine} />
            <Text>Name/Signature/Date</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={{ fontWeight: 'bold', fontStyle: 'italic' }}>Managing Director:</Text>
            <View style={styles.sigLine} />
            <Text>Name/Signature/Date</Text>
          </View>
        </View>

        <Text style={{ marginBottom: 20 }}>
          Kindly acknowledge receipt and revert with your CAPA plan within 14 calendar days. Liaise with the AFPD Division for scheduling of the Follow-up Inspection upon readiness.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.closing}>Director (AFPD)</Text>
          <Text style={{ fontStyle: 'italic' }}>For: Director-General (NAFDAC)</Text>
        </View>
      </Page>
    </Document>
  );
};