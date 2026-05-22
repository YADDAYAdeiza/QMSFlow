// src/components/reports/SurveillancePdfReport.tsx
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { ZoneMetric, SubstanceMetric } from '../../lib/actions/Vetstat/fetchAnalytics';

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    backgroundColor: '#ffffff', 
    fontFamily: 'Helvetica' 
  },
  header: { 
    borderBottomWidth: 2, 
    borderBottomColor: '#c46231', 
    paddingBottom: 12, 
    marginBottom: 20 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1a1a1a',
    textTransform: 'uppercase'
  },
  subtitle: { 
    fontSize: 10, 
    color: '#555555', 
    marginTop: 4 
  },
  sectionHeading: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: '#c46231', 
    marginTop: 15, 
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 4,
    textTransform: 'uppercase'
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
    marginBottom: 15
  },
  metaBox: {
    flex: 1,
  },
  metaLabel: { fontSize: 9, color: '#666666', uppercase: true },
  metaValue: { fontSize: 11, fontWeight: 'bold', color: '#1a1a1a', marginTop: 2 },
  chartSideBySide: {
    flexDirection: 'row',
    gap: 15,
    marginVertical: 10,
  },
  chartWrapperHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6
  },
  chartWrapperFull: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    marginVertical: 5
  },
  chartImageHalf: { 
    width: '100%', 
    height: 180, 
    objectFit: 'contain'
  },
  chartImageFull: { 
    width: '100%', 
    height: 200, 
    objectFit: 'contain'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 6,
    borderRadius: 2,
    marginTop: 5
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingVertical: 6,
    alignItems: 'center'
  },
  thText: { color: '#ffffff', fontSize: 9, fontWeight: 'bold' },
  tdText: { fontSize: 9, color: '#333333' },
  colLarge: { flex: 3 },
  colMedium: { flex: 2 },
  colSmall: { flex: 1, textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#999999'
  }
});

interface PdfProps {
  zones: ZoneMetric[];
  topSubstances: SubstanceMetric[];
  totalDDD: number;
  globalTrend: number;
  charts: {
    zoneBarUrl: string;
    zonePieUrl: string;
    substanceBarUrl: string;
  };
}

export const SurveillancePdfReport = ({ zones, topSubstances, totalDDD, globalTrend, charts }: PdfProps) => (
  <Document>
    
    {/* PAGE 1: GEOPOLITICAL VOLUME DISTRIBUTION METRICS */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>National Antimicrobial Surveillance Report</Text>
        <Text style={styles.subtitle}>Veterinary Medicines and Allied Products Directorate (VMD) | Audit Stream</Text>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>REPORTING CYCLE</Text>
          <Text style={styles.metaValue}>2026 (Current Window)</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>TOTAL VOLUME CONSUMED</Text>
          <Text style={styles.metaValue}>{totalDDD.toLocaleString(undefined, { maximumFractionDigits: 2 })} DDD</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>GROWTH VARIANCE TREND</Text>
          <Text style={[styles.metaValue, { color: globalTrend > 0 ? '#b91c1c' : '#15803d' }]}>
            {globalTrend > 0 ? '+' : ''}{globalTrend.toFixed(2)}%
          </Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>I. Regional Geopolitical Distribution Analysis</Text>
      
      {/* Dynamic Side-by-Side Grid containing both Bar and Pie configurations */}
      <View style={styles.chartSideBySide}>
        <View style={styles.chartWrapperHalf}>
          <Image src={charts.zoneBarUrl} style={styles.chartImageHalf} />
        </View>
        <View style={styles.chartWrapperHalf}>
          <Image src={charts.zonePieUrl} style={styles.chartImageHalf} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Confidential - Internal Regulatory Dashboard Audit</Text>
        <Text>Page 1 of 2</Text>
      </View>
    </Page>

    {/* PAGE 2: DETAILED CRITICAL SUBSTANCE RANKINGS */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>National Antimicrobial Surveillance Report</Text>
        <Text style={styles.subtitle}>Substance Categorization Matrix & Risk Taxonomy</Text>
      </View>

      <Text style={styles.sectionHeading}>II. Active Substance Volume Ranking</Text>
      <View style={styles.chartWrapperFull}>
        <Image src={charts.substanceBarUrl} style={styles.chartImageFull} />
      </View>

      <Text style={styles.sectionHeading}>III. High-Priority Substance Ledger</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.thText, styles.colLarge]}>Active Substance Ingredient</Text>
        <Text style={[styles.thText, styles.colMedium]}>Class Taxonomy</Text>
        <Text style={[styles.thText, styles.colSmall]}>Priority</Text>
        <Text style={[styles.thText, styles.colSmall]}>Volume (DDD)</Text>
      </View>

      {topSubstances.slice(0, 10).map((sub, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={[styles.tdText, styles.colLarge]}>{sub.substance}</Text>
          <Text style={[styles.tdText, styles.colMedium]}>{sub.class}</Text>
          <Text style={[styles.tdText, styles.colSmall, { color: sub.riskPriority === 'CRITICAL' ? '#b91c1c' : '#4b5563', fontWeight: sub.riskPriority === 'CRITICAL' ? 'bold' : 'normal' }]}>
            {sub.riskPriority}
          </Text>
          <Text style={[styles.tdText, styles.colSmall]}>
            {sub.volume.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </Text>
        </View>
      ))}

      <View style={styles.footer}>
        <Text>Confidential - Internal Regulatory Dashboard Audit</Text>
        <Text>Page 2 of 2</Text>
      </View>
    </Page>

  </Document>
);