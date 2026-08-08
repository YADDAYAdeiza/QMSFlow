"use client";

import React, { useState, useEffect, useMemo, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History,
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  Upload,
  Paperclip,
  CheckCircle2,
  X,
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Printer,
  ShieldCheck,
  Trash2,
  ChevronDown
} from "lucide-react";
import { buildCompanyFilePath, uploadDossierFile } from "@/lib/utils/supabaseUpload";
import { createClient } from "@/utils/supabase/client";

// --- HELPER BADGE ---
const getCategoryBadge = (category?: string) => {
  const cat = category?.toUpperCase();

  switch (cat) {
    case "CRITICAL":
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800 border border-red-200">
          Critical
        </span>
      );
    case "MAJOR":
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">
          Major
        </span>
      );
    case "MINOR":
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">
          Minor
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600 border border-slate-200">
          {category || "Unassigned"}
        </span>
      );
  }
};

// --- TYPES & INTERFACES ---

export type DeficiencyCategory = "Critical" | "Major" | "Minor" | "Recommendation" | string;

export type HistoryRole = "APPLICANT" | "INSPECTOR";

export interface AuditHistoryEntry {
  cycle?: number;
  timestamp?: string;
  authorName?: string;
  authorRole?: HistoryRole | string;
  timeline?: string;
  rootCause?: string;
  proposedCorrection?: string;
  preventiveAction?: string;
  indicators?: string;
  evidenceUrl?: string;
  responsibility?: string;
  remarks?: string;
  statusRuling?: string;
  [key: string]: any;
}

export interface EvidenceFile {
  name: string;
  url: string;
  size?: number;
  uploadedAt?: string;
}

export interface CAPAItem {
  id: string;
  deficiency: string;
  deficiencyCategory?: string;
  rootCause?: string;
  proposedCorrection?: string;
  preventiveAction?: string;
  indicatorsForCompletion?: string;
  timeline?: string;
  responsiblePerson?: string;
  status?: string;
  inspectorRemarks?: string;
  inspectorStatus?: string;
  uploadedEvidenceUrl?: string;
  evidenceFiles?: any[];
  history?: AuditHistoryEntry[]; // <--- Maintained required state
}

export interface InspectionObservation {
  id: string;
  deficiency: string;
  deficiencyCategory?: DeficiencyCategory;
  timeline?: string;
  responsiblePerson?: string;
}

export interface CAPASummary {
  totalDeficiencies: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  recommendationCount: number;
}

export interface ApplicantCAPAFormProps {
  applicationId?:string
  companyId?:string
  referenceNumber?: string;
  companyName?: string;
  facilityAddress?: string;
  inspectionTitle?: string;
  inspectionDate?: string;
  initialObservations?: InspectionObservation[];
  initialItems?: CAPAItem[] | string; // Accepts array or raw JSON string from Supabase
  initialIsApplicant?: boolean; // Optional prop override if role is provided upstream
  onSaveDraft?: (data: { items: CAPAItem[]; summary: CAPASummary; jsonPayload: string }) => Promise<void> | void;
  onSubmit?: (data: { items: CAPAItem[]; summary: CAPASummary; jsonPayload: string }) => Promise<void> | void;
  onApproveAndSign?: (data: { items: CAPAItem[]; summary: CAPASummary; jsonPayload: string }) => Promise<void> | void;
  onFileUpload?: (file: File, itemId: string) => Promise<EvidenceFile>;
  onBack?: () => void;
  isSubmitting?: boolean;
}

interface UploadedFile {
  name: string;
  filePath?: string;
  size?: number;
  type?: string;
  file?: File;
}

// --- HELPER FUNCTION FOR NUCLEATING CAPA ITEMS FROM DIVERSE JSON SCHEMAS ---
const normalizeRawCAPAItem = (raw: any, index: number): CAPAItem => {
  const categoryRaw = raw.deficiencyCategory || raw.severity || "Major";
  const formattedCategory: string =
    typeof categoryRaw === "string" && categoryRaw.length > 0
      ? categoryRaw.charAt(0).toUpperCase() + categoryRaw.slice(1).toLowerCase()
      : "Major";

  return {
    id: raw.id || `obs_${index}_${Date.now()}`,
    deficiency: raw.deficiency || raw.observation || "",
    deficiencyCategory: formattedCategory,
    rootCause: raw.rootCause || "",
    proposedCorrection: raw.proposedCorrection || raw.correction || "",
    preventiveAction: raw.preventiveAction || raw.correctiveAction || "",
    indicatorsForCompletion: raw.indicatorsForCompletion || raw.indicators || "CAPA Report & Supporting SOPs",
    timeline: raw.timeline || (formattedCategory === "Critical" ? "Immediate" : "30 Days"),
    responsiblePerson: raw.responsiblePerson || raw.responsibility || "Quality Assurance Manager",
    status: raw.status || "Pending",
    evidenceFiles: raw.evidenceFiles || [],
    uploadedEvidenceUrl: raw.uploadedEvidenceUrl || raw.evidenceUrl || "",
    inspectorStatus: raw.inspectorStatus || raw.statusRuling || "",
    inspectorRemarks: raw.inspectorRemarks || "",
    history: Array.isArray(raw.history) ? raw.history : [],
  };
};

// --- COMPONENT ---

export const ApplicantCAPAForm = forwardRef<HTMLDivElement, ApplicantCAPAFormProps>(
  (
    {
      applicationId,
      companyId,
      referenceNumber = "NAFDAC/VMAP/CAPA/2026/001",
      companyName = "Facility / Company Name",
      facilityAddress = "Facility Address",
      inspectionTitle = "GMP Inspection",
      inspectionDate = "8th July 2026",
      initialObservations = [],
      initialItems = [],
      initialIsApplicant = true,
      onSaveDraft,
      onSubmit,
      onApproveAndSign,
      onFileUpload,
      onBack,
      isSubmitting = false,
    },
    ref
  ) => {
    // Instantiate Supabase client for local component storage operations
    const supabase = createClient();

    // 0. ROLE STATE & TOGGLE (Default: Applicant mode)
    const [isApplicant, setIsApplicant] = useState<boolean>(initialIsApplicant);

    const toggleApplicantMode = () => {
      setIsApplicant((prev) => !prev);
    };

    // 1. DYNAMIC INITIAL STATE MAPPER (Handles String JSON from Supabase & Maps Inspector History)
    const [items, setItems] = useState<CAPAItem[]>(() => {
      let parsedItems: any[] = [];

      // Parse initial JSON from Supabase if it arrives as a string
      if (typeof initialItems === "string") {
        try {
          parsedItems = JSON.parse(initialItems);
        } catch (e) {
          console.error("Failed to parse initialItems JSON string:", e);
        }
      } else if (Array.isArray(initialItems)) {
        parsedItems = initialItems;
      }

      // If valid pre-populated CAPA items exist, map & normalize them
      if (parsedItems && parsedItems.length > 0) {

        return parsedItems.map((raw, idx) => normalizeRawCAPAItem(raw, idx));
      }

      // Map incoming raw observations to CAPA items
      if (initialObservations && initialObservations.length > 0) {
        return initialObservations.map((obs, idx) => ({
          id: obs.id || `obs-${idx}-${Date.now()}`,
          deficiency: obs.deficiency,
          deficiencyCategory: obs.deficiencyCategory || "Major",
          rootCause: "",
          proposedCorrection: "",
          preventiveAction: "",
          indicatorsForCompletion: "CAPA Report & Supporting SOPs",
          timeline: obs.timeline || (obs.deficiencyCategory === "Critical" ? "Immediate" : "30 Days"),
          responsiblePerson: obs.responsiblePerson || "Quality Assurance Manager",
          status: "Pending",
          evidenceFiles: [],
          uploadedEvidenceUrl: "",
          inspectorStatus: "",
          inspectorRemarks: "",
          history: [],
        }));
      }

      // Default fallback if no observations or items exist
      return [
        {
          id: `obs_${Date.now()}`,
          deficiency: "",
          deficiencyCategory: "Minor",
          rootCause: "",
          proposedCorrection: "",
          preventiveAction: "",
          indicatorsForCompletion: "",
          timeline: "30 Days",
          responsiblePerson: "QA Manager",
          status: "Pending",
          evidenceFiles: [],
          uploadedEvidenceUrl: "",
          inspectorStatus: "",
          inspectorRemarks: "",
          history: [],
        },
      ];
    });

    console.log('This is items: ',items);

    const [dossierFiles, setDossierFiles] = useState<UploadedFile[]>([]);
    const [documentFiles, setDocumentFiles] = useState<UploadedFile[]>([]);

    const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<string>("editor");
    const [isApproving, setIsApproving] = useState<boolean>(false);
    const [isSavingLocal, setIsSavingLocal] = useState<boolean>(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [isSubmittingLocal, setIsSubmittingLocal] = useState<boolean>(false);

    const activeSubmitting = isSubmitting || isSubmittingLocal;

    // --- FILE UPLOAD HANDLER ---
    const handleFileUpload = async (
      itemId: string,
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setUploadingId(itemId);

        const fileExt = file.name.split(".").pop() || "pdf";
        const cleanFileName = `capa_evidence_${itemId}_${Date.now()}.${fileExt}`;
        const compIdStr = companyId !== undefined && companyId !== null ? String(companyId) : "GENERAL";
        // const appIdStr = referenceNumber !== undefined && referenceNumber !== null ? String(referenceNumber) : "GENERAL";
        const storagePath = buildCompanyFilePath(
                      compIdStr,                         // 1st arg: companyId
                      '05_CAPA_Evidence',    // 2nd arg: folder
                      cleanFileName,                          // 3rd arg: fileName
                      applicationId                    // 4th arg: applicationId
                    )

        // Uploads directly to the lowercase 'documents' bucket
        const publicUrl = await uploadDossierFile(file, storagePath);

        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? { ...item, uploadedEvidenceUrl: publicUrl }
              : item
          )
        );

        alert("✅ CAPA evidence document uploaded successfully!");
      } catch (error: any) {
        console.error("CAPA evidence upload failed:", error);
        alert(`Upload Error: ${error.message || "Failed to upload file to storage."}`);
      } finally {
        setUploadingId(null);
        event.target.value = "";
      }
    };

    const handleRemoveFile = async (
      indexToRemove: number,
      field: 'documents' | 'dossier' = 'documents'
    ) => {
      // 1. Get the target file object from the state
      const targetArray = field === 'dossier' ? dossierFiles : documentFiles;
      const targetFile = targetArray[indexToRemove];

      if (!targetFile) return;

      try {
        // 2. If the file is already uploaded to Supabase, delete it from storage
        if (targetFile.filePath) {
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([targetFile.filePath]);

          if (storageError) {
            console.error('Error removing file from Supabase storage:', storageError.message);
          }
        }

        // 3. Update the local state array
        if (field === 'dossier') {
          setDossierFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
        } else {
          setDocumentFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
        }
      } catch (err) {
        console.error('Unexpected error during file removal:', err);
      }
    };

    const currentFormattedDate = useMemo(() => {
      return new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }, []);

    // Categorized items for table rendering
    const criticalItems = useMemo(
      () => items.filter((i) => i.deficiencyCategory?.toUpperCase() === "CRITICAL"),
      [items]
    );
    const majorItems = useMemo(
      () => items.filter((i) => i.deficiencyCategory?.toUpperCase() === "MAJOR"),
      [items]
    );
    const otherItems = useMemo(
      () =>
        items.filter(
          (i) =>
            i.deficiencyCategory?.toUpperCase() === "MINOR" ||
            i.deficiencyCategory?.toUpperCase() === "RECOMMENDATION"
        ),
      [items]
    );

    // Dynamic Summary Stats
    const internalSummary = useMemo<CAPASummary>(() => {
      return {
        totalDeficiencies: items.length,
        criticalCount: criticalItems.length,
        majorCount: majorItems.length,
        minorCount: items.filter((i) => i.deficiencyCategory?.toUpperCase() === "MINOR").length,
        recommendationCount: items.filter(
          (i) => i.deficiencyCategory?.toUpperCase() === "RECOMMENDATION"
        ).length,
      };
    }, [items, criticalItems, majorItems]);

    // Keep active item index valid if items array changes
    useEffect(() => {
      if (activeItemIndex >= items.length && items.length > 0) {
        setActiveItemIndex(items.length - 1);
      }
    }, [items.length, activeItemIndex]);

    // Field mutation helper
    const handleItemChange = (id: string, field: keyof CAPAItem, value: any) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    };

    // SAVE DRAFT HANDLER (Passes stringified JSON for Supabase UPDATE)
    const handleSaveDraft = async () => {
      if (!onSaveDraft) return;
      setIsSavingLocal(true);
      try {
        const jsonPayload = JSON.stringify(items);
        await onSaveDraft({ items, summary: internalSummary, jsonPayload });
      } finally {
        setIsSavingLocal(false);
      }
    };

    // SUBMIT HANDLER (Passes stringified JSON for Supabase UPDATE)
    const handleSubmitForm = async () => {
      if (!onSubmit || activeSubmitting) return;

      setIsSubmittingLocal(true);
      try {
        const jsonPayload = JSON.stringify(items);
        await onSubmit({ items, summary: internalSummary, jsonPayload });
      } catch (err) {
        console.error("Error submitting CAPA plan:", err);
      } finally {
        setIsSubmittingLocal(false);
      }
    };

    // Final Approval Handler
    const handleFinalDirectorApproval = async () => {
      if (!onApproveAndSign) return;
      setIsApproving(true);
      try {
        const jsonPayload = JSON.stringify(items);
        await onApproveAndSign({ items, summary: internalSummary, jsonPayload });
      } finally {
        setIsApproving(false);
      }
    };

    return (
    <div ref={ref} className="w-full max-w-7xl mx-auto space-y-6 p-2 sm:p-4">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-4 rounded-xl shadow-md print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-slate-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">Corrective & Preventive Action (CAPA) Plan</h1>
            <p className="text-xs text-slate-400">Reference: {referenceNumber} | {companyName}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Applicant Draft Saving */}
          {isApplicant && onSaveDraft && (
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={activeSubmitting || isApproving || isSavingLocal}
              className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
            >
              {isSavingLocal ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
          )}

          {/* Applicant Final Submission */}
          {isApplicant && onSubmit && (
            <Button 
              onClick={handleSubmitForm}
              disabled={activeSubmitting || isApproving || isSavingLocal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {activeSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Plan
                </>
              )}
            </Button>
          )}

          {/* Regulator / Inspector / Director Final Approval */}
          {!isApplicant && onApproveAndSign && (
            <Button
              onClick={handleFinalDirectorApproval}
              disabled={activeSubmitting || isApproving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve & Sign
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* METADATA SUMMARY BAR */}
      <Card className="border-slate-200 shadow-sm bg-slate-50/50 print:hidden">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-slate-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Facility</p>
              <p className="font-medium text-slate-900 truncate">{companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Audit / Inspection</p>
              <p className="font-medium text-slate-900 truncate">{inspectionTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-slate-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Inspection Date</p>
              <p className="font-medium text-slate-900">{inspectionDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-slate-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Deficiencies Count</p>
              <p className="font-medium text-slate-900">{items.length} Identified Items</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WORKFLOW MAIN TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4 print:hidden">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="editor" className="data-[state=active]:bg-white">
              {isApplicant ? "Form Editor" : "Review CAPA Inputs"} ({items.length})
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-white">
              Official Letter Preview
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex">
            <Printer className="h-4 w-4 mr-2" />
            Print Form
          </Button>
        </div>

        {/* EDITOR TAB CONTENT */}
        <TabsContent value="editor" className="space-y-6 print:hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ITEM SIDEBAR SELECTOR */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex justify-between items-center py-1">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Action Items</h3>
              </div>

              <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
               {items.map((item, index) => {
                  // Determine if item was passed/accepted by the inspector
                  const isItemAccepted = 
                    item.status === "Acceptable" || 
                    item.inspectorStatus === "Acceptable" || 
                    item.status === "PASSED";

                  const isActive = activeItemIndex === index;

                  return (
                    <div
                      key={item.id || index}
                      onClick={() => {
                        // Still allow selection to view details, but styles will indicate read-only status
                        setActiveItemIndex(index);
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isItemAccepted
                          ? isActive
                            ? 'border-emerald-500 bg-emerald-50/20 opacity-80 ring-1 ring-emerald-500'
                            : 'border-slate-200 bg-slate-100/70 opacity-70 hover:bg-slate-100'
                          : isActive
                            ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                        <div className="flex items-center gap-1.5">
                          {isItemAccepted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                              🔒 Accepted
                            </span>
                          )}
                          {getCategoryBadge(item.deficiencyCategory)}
                        </div>
                      </div>

                      <p className={`text-sm font-medium line-clamp-2 ${isItemAccepted ? 'text-slate-600' : 'text-slate-800'}`}>
                        {item.deficiency || <span className="text-slate-400 italic">No deficiency specified...</span>}
                      </p>

                      <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                        <span>Timeline: {item.timeline || 'Unassigned'}</span>
                        {(item.evidenceFiles ?? []).length > 0 && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Paperclip className="h-3 w-3" /> {(item.evidenceFiles ?? []).length}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DETAILED FORM EDITOR */}
            <div className="lg:col-span-8">
              {items[activeItemIndex] && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-slate-800">
                        {isApplicant ? `Editing Item #${activeItemIndex + 1}` : `Reviewing Item #${activeItemIndex + 1}`}
                      </CardTitle>
                      {items[activeItemIndex].history && items[activeItemIndex].history!.length > 0 && (
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-[10px]">
                          {items[activeItemIndex].history!.length} Revision Cycle{items[activeItemIndex].history!.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    {isApplicant && items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(items[activeItemIndex].id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Item
                      </Button>
                    )}
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    {/* DEFICIENCY & CLASSIFICATION */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Identified Deficiency / Observation *</Label>
                        <Textarea
                          rows={3}
                          disabled={!isApplicant}
                          value={items[activeItemIndex].deficiency}
                          onChange={(e) => handleItemChange(items[activeItemIndex].id, 'deficiency', e.target.value)}
                          placeholder="Describe the non-conformity or regulatory observation..."
                          className="bg-white border-slate-200 disabled:opacity-80"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Classification (Locked)</Label>
                        <select
                          disabled={true}
                          value={items[activeItemIndex].deficiencyCategory}
                          className="w-full h-10 px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-sm font-semibold text-slate-700 cursor-not-allowed opacity-90 focus:outline-none"
                        >
                          <option value="Critical">Critical</option>
                          <option value="Major">Major</option>
                          <option value="Minor">Minor</option>
                          <option value="Recommendation">Recommendation</option>
                        </select>
                      </div>
                    </div>

                    {/* ROOT CAUSE ANALYSIS */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Root Cause Analysis (RCA)</Label>
                      <Textarea
                        rows={2}
                        disabled={!isApplicant}
                        value={items[activeItemIndex].rootCause}
                        onChange={(e) => handleItemChange(items[activeItemIndex].id, 'rootCause', e.target.value)}
                        placeholder="Detail why this non-conformity occurred..."
                        className="bg-white border-slate-200 disabled:opacity-80"
                      />
                    </div>

                    {/* PROPOSED CORRECTION & PREVENTIVE ACTION */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Immediate Correction</Label>
                        <Textarea
                          rows={3}
                          disabled={!isApplicant}
                          value={items[activeItemIndex].proposedCorrection}
                          onChange={(e) => handleItemChange(items[activeItemIndex].id, 'proposedCorrection', e.target.value)}
                          placeholder="Short-term action to fix the immediate issue..."
                          className="bg-white border-slate-200 disabled:opacity-80"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Preventive Action (Long Term)</Label>
                        <Textarea
                          rows={3}
                          disabled={!isApplicant}
                          value={items[activeItemIndex].preventiveAction}
                          onChange={(e) => handleItemChange(items[activeItemIndex].id, 'preventiveAction', e.target.value)}
                          placeholder="Systemic changes to ensure recurrence is prevented..."
                          className="bg-white border-slate-200 disabled:opacity-80"
                        />
                      </div>
                    </div>

                    {/* METRICS & RESPONSIBILITY */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Indicators for Completion</Label>
                        <Input
                          disabled={!isApplicant}
                          value={items[activeItemIndex].indicatorsForCompletion || ''}
                          onChange={(e) => handleItemChange(items[activeItemIndex].id, 'indicatorsForCompletion', e.target.value)}
                          placeholder="e.g. SOP revised, Training logs"
                          className="bg-white border-slate-200 disabled:opacity-80"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Timeline</Label>
                        <Input
                          disabled={!isApplicant}
                          value={items[activeItemIndex].timeline}
                          onChange={(e) => handleItemChange(items[activeItemIndex].id, 'timeline', e.target.value)}
                          placeholder="e.g. 30 Days, Immediate"
                          className="bg-white border-slate-200 disabled:opacity-80"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Responsibility</Label>
                        <Input
                          disabled={!isApplicant}
                          value={items[activeItemIndex].responsiblePerson}
                          onChange={(e) => handleItemChange(items[activeItemIndex].id, 'responsiblePerson', e.target.value)}
                          placeholder="Designated QA/QC Manager"
                          className="bg-white border-slate-200 disabled:opacity-80"
                        />
                      </div>
                    </div>

                    {/* EVIDENCE ATTACHMENTS */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <Label className="text-xs font-bold text-slate-700">Objective Evidence & Attachments</Label>
                      
                      {isApplicant && (
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md shadow-sm text-xs font-medium text-slate-700 bg-white hover:bg-slate-50">
                            {uploadingId === items[activeItemIndex].id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            ) : (
                              <Upload className="h-4 w-4 text-slate-500" />
                            )}
                            <span>Upload Supporting Documents</span>
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              disabled={uploadingId === items[activeItemIndex].id}
                              onChange={(e) => handleFileUpload(items[activeItemIndex].id, e)}
                            />
                          </label>
                        </div>
                      )}

                      {(items[activeItemIndex].evidenceFiles ?? []).length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {items[activeItemIndex].evidenceFiles!.map((file, fIdx) => (
                            <div 
                              key={fIdx}
                              className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700"
                            >
                              <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[150px]">
                                {file.name}
                              </a>
                              {isApplicant && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(items[activeItemIndex].id, fIdx)}
                                  className="text-slate-400 hover:text-red-500 ml-1"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        !isApplicant && (
                          <p className="text-xs text-slate-400 italic mt-1">No objective evidence attached by applicant.</p>
                        )
                      )}
                    </div>

                    {/* COLLAPSIBLE AUDIT CYCLE & REVIEW HISTORY SEGMENT */}
                    <div className="pt-4 border-t border-slate-200">
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors text-left group">
                          <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-slate-600 group-hover:text-slate-900" />
                            <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 uppercase tracking-wide">
                              Audit Cycle & Review History
                            </span>
                            {(items[activeItemIndex].history ?? []).length > 0 && (
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                                {items[activeItemIndex].history!.length}
                              </span>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>

                        <CollapsibleContent className="pt-3 space-y-3">
                          {(items[activeItemIndex].history ?? []).length > 0 ? (
                            <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-2">
                              {items[activeItemIndex].history!.map((entry, hIdx) => {
                                // Determine display values based on database schema
                                const authorDisplay = entry.authorName || entry.authorRole || entry.role || entry.author || "Reviewer";
                                const remarksText = entry.remarks || entry.inspectorRemarks;
                                const applicantText = entry.proposedCorrection || entry.applicantComment;
                                const statusText = entry.statusRuling || entry.status;

                                return (
                                  <div key={hIdx} className="relative pl-4 space-y-1">
                                    {/* Timeline Node Icon */}
                                    <span className="absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-400 border-2 border-white ring-1 ring-slate-200" />

                                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                                      <span className="font-semibold text-slate-800">{authorDisplay}</span>
                                      <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "Previous Cycle"}</span>
                                    </div>

                                    {/* Inspector Feedback / Remarks */}
                                    {remarksText && (
                                      <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-md text-xs text-amber-900 mt-1">
                                        <p className="font-semibold text-[11px] text-amber-800 uppercase tracking-wider mb-0.5">
                                          Inspector Feedback
                                        </p>
                                        <p className="whitespace-pre-wrap">{remarksText}</p>
                                      </div>
                                    )}

                                    {/* Applicant Response / Correction */}
                                    {applicantText && (
                                      <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-800 mt-1">
                                        <p className="font-semibold text-[11px] text-slate-600 uppercase tracking-wider mb-0.5">
                                          Proposed Correction
                                        </p>
                                        <p className="whitespace-pre-wrap">{applicantText}</p>
                                      </div>
                                    )}

                                    {/* Ruling / Status */}
                                    {statusText && (
                                      <div className="mt-1">
                                        <span className="text-[10px] font-medium text-slate-500 uppercase">Status Ruling: </span>
                                        <span className="text-xs font-semibold text-slate-700">{statusText}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                              <p className="text-xs text-slate-400 italic">No prior review cycles recorded for this item.</p>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                  </CardContent>
                </Card>
              )}
            </div>

          </div>
        </TabsContent>

        {/* OFFICIAL LETTER PREVIEW TAB */}
        <TabsContent value="preview">
          <Card className="border-slate-400 shadow-xl print:shadow-none print:border-none p-8 sm:p-12 max-w-5xl mx-auto font-serif bg-[#EFF1BD] print:bg-white text-slate-900 border">
            
            <div className="border-b-2 border-green-950/40 pb-4 mb-6 flex items-center justify-between gap-4">
              <img 
                src="/nafdac_logo2-removebg-preview.png" 
                alt="NAFDAC Logo" 
                className="h-28 w-auto object-contain flex-shrink-0"
              />
              
              <div className="flex-1 text-center">
                <h1 
                  className="text-xl sm:text-2xl uppercase tracking-wide text-emerald-950 leading-tight"
                  style={{ fontFamily: "'Franklin Gothic Heavy', 'Arial Black', sans-serif", fontWeight: 900 }}
                >
                  NATIONAL AGENCY FOR FOOD AND DRUG ADMINISTRATION AND CONTROL
                </h1>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 font-sans mt-1">
                  Veterinary Medicine and Allied Products Directorate (VMAP)
                </h2>
              </div>
            </div>

            <div className="flex justify-between items-start text-xs font-sans mb-6 text-slate-800 border-slate-400 pb-3">
              <div>
                <p><strong className="text-slate-950">Ref. No.:</strong> {referenceNumber || ""}</p>
              </div>
              <div className="text-right">
                <p><strong className="text-slate-950">Date:</strong> {currentFormattedDate || "8th July 2026"}</p>
              </div>
            </div>

            <div className="text-xs font-sans mb-6 text-slate-900 leading-snug">
              <p className="font-bold">The Managing Director,</p>
              <p>{companyName || "Company Name"}</p>
              <p>{facilityAddress || "Company Address"}</p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm font-sans text-slate-900 leading-relaxed">
              <p className="font-bold uppercase tracking-wide text-xs lg:text-lg text-slate-950 border-b border-slate-400 pb-1 text-center">
                NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) INSPECTION {inspectionTitle}
              </p>

              <p>Dear Sir,</p>

              <p className="text-justify">
                The above subject refers. 
                <br /><br />
                Please recall that a team of NAFDAC inspectors conducted a Routine Inspection (RI) of your facility located at 
                {" "}{facilityAddress}. 
                During the inspection, a number of observations relating to various aspects of GMP were identified. These 
                observations were discussed with your team during the inspection and at the exit meeting. Please find attached 
                the detailed inspection report for your attention and necessary action.  
                <br /><br />
                In view of the above, you are required to develop and submit a Corrective and Preventive Action (CAPA) plan 
                addressing each observation raised in the report. For observations classified as “major”, please include 
                supporting documentation as objective evidence of corrective actions implemented. 
                <br /><br />
                Kindly note that the adequacy of your CAPA Plan will be evaluated through a desk review and the 
                implementation of the proposed actions will be verified during subsequent GMP inspections. 
                <br /><br />
                Please complete the CAPA template below and submit both the signed hard copy and an electronic copy to the 
                undersigned within thirty (30) days of receipt of this letter. The electronic copy should be forwarded to <strong>vmap@nafdac.gov.ng</strong>.
              </p>

              <div className="overflow-x-auto my-6">
                <table className="w-full border-collapse border border-slate-500 text-[10px] sm:text-xs text-left bg-white/70">
                  <thead>
                    <tr className="bg-emerald-950 text-white font-bold font-sans">
                      <th className="border border-slate-500 p-1.5 w-6 text-center">S/N</th>
                      <th className="border border-slate-500 p-1.5">Audit findings (observations)</th>
                      <th className="border border-slate-500 p-1.5">Root cause analysis</th>
                      <th className="border border-slate-500 p-1.5">Correction</th>
                      <th className="border border-slate-500 p-1.5">Corrective Action(s)</th>
                      <th className="border border-slate-500 p-1.5">Indicators for Completion</th>
                      <th className="border border-slate-500 p-1.5">Timeline</th>
                      <th className="border border-slate-500 p-1.5">Responsibility</th>
                      <th className="border border-slate-500 p-1.5">CAPA Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-red-100/80 font-bold text-red-950 border-b border-slate-500">
                      <td colSpan={9} className="border border-slate-500 p-1.5 uppercase tracking-wide">
                        Critical Deficiencies
                      </td>
                    </tr>
                    {criticalItems.length > 0 ? (
                      criticalItems.map((item, index) => (
                        <tr key={item.id} className="align-top border-b border-slate-400">
                          <td className="border border-slate-500 p-1.5 font-bold text-center">{index + 1}</td>
                          <td className="border border-slate-500 p-1.5">{item.deficiency || 'N/A'}</td>
                          <td className="border border-slate-500 p-1.5">{item.rootCause || 'Pending RCA'}</td>
                          <td className="border border-slate-500 p-1.5">{item.proposedCorrection || 'N/A'}</td>
                          <td className="border border-slate-500 p-1.5">{item.preventiveAction || 'N/A'}</td>
                          <td className="border border-slate-500 p-1.5">{item.indicatorsForCompletion || 'CAPA Report & SOPs'}</td>
                          <td className="border border-slate-500 p-1.5">{item.timeline || 'Immediate'}</td>
                          <td className="border border-slate-500 p-1.5">{item.responsiblePerson || 'QA Manager'}</td>
                          <td className="border border-slate-500 p-1.5 font-semibold">{item.status || 'Pending'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="border border-slate-500 p-1.5 text-center italic text-slate-500">
                          Nil
                        </td>
                      </tr>
                    )}

                    <tr className="bg-amber-100/80 font-bold text-amber-950 border-b border-slate-500">
                      <td colSpan={9} className="border border-slate-500 p-1.5 uppercase tracking-wide">
                        Major Deficiencies
                      </td>
                    </tr>
                    {majorItems.length > 0 ? (
                      majorItems.map((item, index) => (
                        <tr key={item.id} className="align-top border-b border-slate-400">
                          <td className="border border-slate-500 p-1.5 font-bold text-center">{index + 1}</td>
                          <td className="border border-slate-500 p-1.5">{item.deficiency || 'N/A'}</td>
                          <td className="border border-slate-500 p-1.5">{item.rootCause || 'Pending RCA'}</td>
                          <td className="border border-slate-500 p-1.5">{item.proposedCorrection || 'N/A'}</td>
                          <td className="border border-slate-500 p-1.5">{item.preventiveAction || 'N/A'}</td>
                          <td className="border border-slate-500 p-1.5">{item.indicatorsForCompletion || 'CAPA Report & SOPs'}</td>
                          <td className="border border-slate-500 p-1.5">{item.timeline || '30 Days'}</td>
                          <td className="border border-slate-500 p-1.5">{item.responsiblePerson || 'QA Manager'}</td>
                          <td className="border border-slate-500 p-1.5 font-semibold">{item.status || 'Pending'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="border border-slate-500 p-1.5 text-center italic text-slate-500">
                          Nil
                        </td>
                      </tr>
                    )}

                    <tr className="bg-slate-100 font-bold text-slate-900 border-b border-slate-500">
                      <td colSpan={9} className="border border-slate-500 p-1.5 uppercase tracking-wide">
                        Others (Minor / Recommendations)
                      </td>
                    </tr>
                    {otherItems.length > 0 ? (
                      otherItems.map((item, index) => (
                        <tr key={item.id} className="align-top border-b border-slate-400">
                          <td className="border border-slate-500 p-1.5 font-bold text-center">{index + 1}</td>
                          <td className="border border-slate-500 p-1.5">{item.deficiency || 'N/A'}</td>
                          <td className="border border-slate-500 p-1.5">{item.rootCause || 'Pending RCA'}</td>
                          <td className="border border-slate-500 p-1.5">{item.proposedCorrection || 'N/A'}</td>
                          <td className="border border-slate-500 p-1.5">{item.preventiveAction || 'N/A'}</td>
                          <td className="border border-slate-500 p-1.5">{item.indicatorsForCompletion || 'CAPA Report & SOPs'}</td>
                          <td className="border border-slate-500 p-1.5">{item.timeline || '60 Days'}</td>
                          <td className="border border-slate-500 p-1.5">{item.responsiblePerson || 'QA Manager'}</td>
                          <td className="border border-slate-500 p-1.5 font-semibold">{item.status || 'Pending'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="border border-slate-500 p-1.5 text-center italic text-slate-500">
                          Nil
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-800 italic">
                * Please note that altering the audit findings (observations) and failure to submit the CAPA plan on or before the above stated timeline may attract regulatory actions.
              </p>

              <div className="mt-10 pt-4 grid grid-cols-2 gap-8 text-xs font-sans">
                <div>
                  <p className="font-bold text-slate-900">Responsible Person (Facility QA Lead):</p>
                  <p className="text-[11px] text-slate-700 font-sans mt-1">Name: ______________________</p>
                  <div className="h-10 border-b border-dashed border-slate-400 my-1"></div>
                  <p>Signature & Date</p>
                </div>
                <div>
                  <p className="font-bold text-slate-900">Reviewed By:</p>
                  
                  {/* Signature Container & Line */}
                  <div className="relative my-1 border-b border-dashed border-slate-400 min-h-[50px] flex items-end justify-start">
                    <img 
                      src="/MudSig-removebg-preview.png" 
                      alt="Signature" 
                      className="h-12 w-auto object-contain -mb-1"
                    />
                  </div>

                  <p className="font-semibold text-slate-900">Divisional Deputy Director</p>
                  <p className="text-[11px] text-slate-800">For: Director-General (NAFDAC)</p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-400 text-[10px] font-sans text-slate-800 grid grid-cols-2 gap-4 uppercase tracking-tighter">
                <div>
                  <p className="font-bold text-slate-950">NAFDAC CORPORATE HQ:</p>
                  <p>Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja</p>
                  <p>Tel: +234-9-2905701 | E-mail: nafdac@nafdac.gov.ng</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-950">LAGOS LIAISON OFFICE:</p>
                  <p>Plot 1, Industrial Estate, Oshodi Apapa Expressway, Isolo, Lagos</p>
                  <p>Website: www.nafdac.gov.ng</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
  }
);

ApplicantCAPAForm.displayName = "ApplicantCAPAForm";

export default ApplicantCAPAForm;