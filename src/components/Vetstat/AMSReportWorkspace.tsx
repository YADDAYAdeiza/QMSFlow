// components/Vetstat/AMSReportWorkspace.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ZoneMetric, SubstanceMetric } from '@/lib/actions/Vetstat/fetchAnalytics';

interface ReportWorkspaceProps {
  zones: ZoneMetric[];
  topSubstances: SubstanceMetric[];
  totalDDD: number;
  globalTrend: number;
  species: string;
  risk: string;
  filterLabel: string;
  // Children will be the active NigeriaMap visualization component we want to capture
  children: React.ReactNode; 
}

export default function AMSReportWorkspace({
  zones,
  topSubstances,
  totalDDD,
  globalTrend,
  species,
  risk,
  filterLabel,
  children
}: ReportWorkspaceProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [regulatoryAction, setRegulatoryAction] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  // --- AUTOMATED INSIGHTS ENGINE (HYBRID BASELINE DRAFT) ---
  useEffect(() => {
    if (zones.length === 0) return;

    // Find highest consuming zone
    const sortedZones = [...zones].sort((a, b) => b.value - a.value);
    const topZone = sortedZones[0];
    
    // Find highest alarming trend
    const sortedTrends = [...zones].sort((a, b) => b.trend - a.trend);
    const topTrendZone = sortedTrends[0];

    // Find critical active substance
    const criticalSubstance = topSubstances.find(s => s.riskPriority === 'CRITICAL') || topSubstances[0];

    const generatedSummary = `EXECUTIVE SUMMARY: During the observed temporal window (${filterLabel}), national surveillance captured a total cumulative volume of ${totalDDD.toLocaleString(undefined, { maximumFractionDigits: 2 })} Divisional Deputy Director (DDD) units across the ${species} sector. The geopolitical vector mapping indicates that the ${topZone.zone} zone presents the highest consolidated loading framework, accounting for ${topZone.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} units. Notably, the ${topTrendZone.zone} zone demonstrates a significant kinetic velocity with a usage trend deviation of +${topTrendZone.trend.toFixed(1)}%.`;

    const generatedAction = `RECOMMENDED REGULATORY ACTIONS:\n1. Deploy targeted field pharmacovigilance audits within the high-density quadrants of the ${topZone.zone} zone.\n2. Initiate immediate antimicrobial stewardship (AMS) consultations addressing the high volume loading of ${criticalSubstance?.substance || 'unclassified compounds'}.\n3. Intensify border and post-registration tracking metrics to stabilize the ${topTrendZone.zone} vector acceleration.`;

    setExecutiveSummary(generatedSummary);
    setRegulatoryAction(generatedAction);
  }, [zones, topSubstances, totalDDD, species, filterLabel]);

  // --- WYSIWYG PDF GENERATION UTILITY ---
  const generatePDFReport = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);

    try {
      const element = reportRef.current;
      
      // Target an optimal canvas scale context for crisp text rendering
      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        logging: false,
        windowWidth: 794, // Standard A4 pixel base width context at 72 DPI multiplied
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Initialize an A4 Portrait jsPDF Document Framework
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 Standard Width in mm
      const pageHeight = 295; // A4 Standard Height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Append primary page canvas rendering
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Wrap overflowing containers onto subsequent pages cleanly if content heights shift
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const safeFileName = `VMD_Surveillance_Report_${species}_${filterLabel.replace(/\s+/g, '_')}.pdf`;
      pdf.save(safeFileName);
    } catch (error) {
      console.error('Failed to generate PDF structural layout:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
      
      {/* LEFT & CENTER COLUMNS: The Live Analytics View and Document Assembly Sandbox */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        
        {/* Pass through wrapper containing the map engine visualizer */}
        <div className="w-full">
          {children}
        </div>

        {/* --- EDITABLE BRIEF SANDBOX CONTROLS --- */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Interactive Executive Brief Customizer
              </h3>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-tight bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
              Draft Mode
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Strategic Executive Summary
              </label>
              <textarea
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                rows={4}
                className="w-full text-xs font-medium text-slate-700 bg-slate-50/50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Directive Regulatory Measures
              </label>
              <textarea
                value={regulatoryAction}
                onChange={(e) => setRegulatoryAction(e.target.value)}
                rows={4}
                className="w-full text-xs font-mono font-bold text-slate-600 bg-slate-50/50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition resize-none"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isGenerating || zones.length === 0}
            onClick={generatePDFReport}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-black text-xs uppercase p-3.5 rounded-xl transition shadow-lg tracking-wider active:scale-[0.99]"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Compiling Document Layers...
              </>
            ) : (
              <>
                <Download size={14} /> Compile and Export Official PDF Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Real-Time Print Document Stage Layout View (What you see is what you get) */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <FileText size={12} /> Document Print Stage Preview
        </h4>
        
        <div className="border border-slate-200 shadow-xl bg-slate-300 p-2 rounded-2xl max-h-[800px] overflow-y-auto">
          {/* --- TARGET CONTAINER RENDERED FOR TRANSFORMATION --- */}
          <div 
            ref={reportRef}
            className="w-[190mm] min-h-[260mm] bg-white text-slate-900 p-[15mm] space-y-6 mx-auto select-none"
            style={{ fontFamily: 'sans-serif' }}
          >
            {/* Report Header Block */}
            <div className="border-b-4 border-slate-900 pb-4 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black tracking-[0.3em] uppercase text-slate-400 leading-none">
                  Federal Republic of Nigeria
                </p>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-1">
                  VMD Surveillance Hub
                </h2>
                <p className="text-[9px] font-bold uppercase text-blue-600 tracking-wider">
                  Antimicrobial Stewardship Analytical Dossier
                </p>
              </div>
              <div className="text-right text-[8px] font-mono font-bold text-slate-400">
                <p>Report Date: {new Date().toLocaleDateString('en-GB')}</p>
                <p>Scope: {species} / {risk}</p>
                <p>Focus: {filterLabel}</p>
              </div>
            </div>

            {/* Micro Stats Row */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              <div>
                <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">Total Structural Load</p>
                <p className="text-sm font-black text-slate-900 font-mono">
                  {totalDDD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">Global Trend Matrix</p>
                <p className={`text-sm font-black font-mono ${globalTrend > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {globalTrend > 0 ? '+' : ''}{globalTrend.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">Status Clearance</p>
                <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1 mt-0.5">
                  <CheckCircle2 size={10} className="text-emerald-500" /> SECURE / SIGNED
                </p>
              </div>
            </div>

            {/* Mini Summary Text Injection Block */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-0.5">
                  1.0 Strategic Analysis Outline
                </h4>
                <p className="text-[10px] leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">
                  {executiveSummary || 'No summary configured.'}
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-0.5">
                  2.0 Directive Actions Protocol
                </h4>
                <p className="text-[10px] leading-relaxed font-mono text-slate-600 whitespace-pre-wrap bg-slate-50 p-2.5 border border-slate-100 rounded">
                  {regulatoryAction || 'No measures designated.'}
                </p>
              </div>
            </div>

            {/* Document Footer Verification Anchor */}
            <div className="pt-8 border-t border-dashed border-slate-200 flex justify-between text-[7px] text-slate-400 font-bold uppercase tracking-widest">
              <span>NAFDAC VMD - Quality Management System Protocol</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}