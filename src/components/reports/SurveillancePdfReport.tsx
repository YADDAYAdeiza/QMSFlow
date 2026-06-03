import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  header: { borderBottomWidth: 2, borderBottomColor: '#1e293b', paddingBottom: 12, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' },
  subtitle: { fontSize: 9, color: '#64748b', marginTop: 4 },
  sectionHeading: { 
    fontSize: 11, fontWeight: 'bold', color: '#1e293b', 
    marginTop: 15, marginBottom: 10, borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0', paddingBottom: 4, textTransform: 'uppercase' 
  },
  metaGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 10, borderRadius: 4, marginBottom: 15 },
  metaLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  metaValue: { fontSize: 10, fontWeight: 'bold', color: '#0f172a', marginTop: 2 },
  chartSideBySide: { flexDirection: 'row', gap: 10, marginVertical: 5 },
  chartWrapperHalf: { flex: 1, padding: 5 },
  chartImageHalf: { width: '100%', height: 160, objectFit: 'contain' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 6, borderRadius: 2, marginTop: 5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 6 },
  thText: { color: '#ffffff', fontSize: 8, fontWeight: 'bold' },
  tdText: { fontSize: 8, color: '#334155' },
  colLarge: { flex: 3 }, colMedium: { flex: 2 }, colSmall: { flex: 1, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#94a3b8' }
});

export const SurveillancePdfReport = ({ zones, topSubstances, totalDDD, globalTrend, charts }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Antimicrobial Usage Surveillance</Text>
        <Text style={styles.subtitle}>VMD • PAD • AFPD • IRSD | Regulatory Oversight Audit</Text>
      </View>

      <View style={styles.metaGrid}>
        <View><Text style={styles.metaLabel}>Reporting Cycle</Text><Text style={styles.metaValue}>FY 2026</Text></View>
        <View><Text style={styles.metaLabel}>Total Volume</Text><Text style={styles.metaValue}>{totalDDD.toLocaleString()} DDD</Text></View>
        <View><Text style={styles.metaLabel}>Growth Variance</Text><Text style={[styles.metaValue, { color: globalTrend > 0 ? '#b91c1c' : '#15803d' }]}>{globalTrend > 0 ? '+' : ''}{globalTrend.toFixed(2)}%</Text></View>
      </View>

      <Text style={styles.sectionHeading}>I. Regional Geopolitical Distribution</Text>
      <View style={styles.chartSideBySide}>
        <View style={styles.chartWrapperHalf}><Image src={charts.zoneBarUrl} style={styles.chartImageHalf} /></View>
        <View style={styles.chartWrapperHalf}><Image src={charts.zonePieUrl} style={styles.chartImageHalf} /></View>
      </View>

      <View style={styles.footer}><Text>Confidential - Authorized VMD Internal Use</Text><Text>Page 1 of 2</Text></View>
    </Page>

    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeading}>II. Substance Risk Taxonomy & Volume Ledger</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.thText, styles.colLarge]}>Substance Ingredient</Text>
        <Text style={[styles.thText, styles.colMedium]}>Taxonomy</Text>
        <Text style={[styles.thText, styles.colSmall]}>Volume (DDD)</Text>
      </View>

      {topSubstances.slice(0, 15).map((sub: any, i: number) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.tdText, styles.colLarge]}>{sub.substance}</Text>
          <Text style={[styles.tdText, styles.colMedium]}>{sub.class}</Text>
          <Text style={[styles.tdText, styles.colSmall]}>{sub.volume.toLocaleString()}</Text>
        </View>
      ))}

      <View style={styles.footer}><Text>Confidential - Authorized VMD Internal Use</Text><Text>Page 2 of 2</Text></View>
    </Page>
  </Document>
);