"use client";

import React, { useState, useEffect, useMemo, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Upload,
  Paperclip,
  CheckCircle2,
  X,
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Printer,
} from "lucide-react";

// --- TYPES & INTERFACES ---

export type DeficiencyCategory = "Critical" | "Major" | "Minor" | "Recommendation";

export interface EvidenceFile {
  name: string;
  url: string;
  size?: number;
  uploadedAt?: string;
}

export interface CAPAItem {
  id: string;
  deficiency: string;
  deficiencyCategory: DeficiencyCategory;
  rootCause: string;
  proposedCorrection: string;
  preventiveAction: string;
  indicatorsForCompletion?: string;
  timeline: string;
  responsiblePerson: string;
  status: "Pending" | "In-Progress" | "Completed" | "Verified";
  evidenceFiles?: EvidenceFile[];
}

export interface InspectionObservation {
  id: string;
  deficiency: string;
  deficiencyCategory: DeficiencyCategory;
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
  referenceNumber?: string;
  companyName?: string;
  facilityAddress?: string;
  inspectionTitle?: string;
  inspectionDate?: string;
  initialObservations?: InspectionObservation[];
  initialItems?: CAPAItem[];
  onSaveDraft?: (data: { items: CAPAItem[]; summary: CAPASummary }) => Promise<void> | void;
  onSubmit?: (data: { items: CAPAItem[]; summary: CAPASummary }) => Promise<void> | void;
  onApproveAndSign?: (data: { items: CAPAItem[]; summary: CAPASummary }) => Promise<void> | void;
  onFileUpload?: (file: File, itemId: string) => Promise<EvidenceFile>;
  onBack?: () => void;
  isSubmitting?: boolean;
}

// --- COMPONENT ---

export const ApplicantCAPAForm = forwardRef<HTMLDivElement, ApplicantCAPAFormProps>(
  (
    {
      referenceNumber = "NAFDAC/VMAP/CAPA/2026/001",
      companyName = "Facility / Company Name",
      facilityAddress = "Facility Address",
      inspectionTitle = "GMP Inspection",
      inspectionDate = "8th July 2026",
      initialObservations = [],
      initialItems = [],
      onSaveDraft,
      onSubmit,
      onApproveAndSign,
      onFileUpload,
      onBack,
      isSubmitting = false,
    },
    ref
  ) => {
    // 1. DYNAMIC INITIAL STATE MAPPER
    const [items, setItems] = useState<CAPAItem[]>(() => {
      // If full pre-populated CAPA items exist, use them
      if (initialItems && initialItems.length > 0) {
        return initialItems;
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
        }));
      }

      // Default fallback if no observations are passed in
      return [
        {
          id: "default-1",
          deficiency: "",
          deficiencyCategory: "Major",
          rootCause: "",
          proposedCorrection: "",
          preventiveAction: "",
          indicatorsForCompletion: "",
          timeline: "30 Days",
          responsiblePerson: "QA Manager",
          status: "Pending",
          evidenceFiles: [],
        },
      ];
    });

    const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<string>("editor");
    const [isApproving, setIsApproving] = useState<boolean>(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const currentFormattedDate = useMemo(() => {
      return new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }, []);

    // Categorized items for table rendering
    const criticalItems = useMemo(() => items.filter((i) => i.deficiencyCategory === "Critical"), [items]);
    const majorItems = useMemo(() => items.filter((i) => i.deficiencyCategory === "Major"), [items]);
    const otherItems = useMemo(
      () => items.filter((i) => i.deficiencyCategory === "Minor" || i.deficiencyCategory === "Recommendation"),
      [items]
    );

    // Dynamic Summary Stats
    const internalSummary = useMemo<CAPASummary>(() => {
      return {
        totalDeficiencies: items.length,
        criticalCount: criticalItems.length,
        majorCount: majorItems.length,
        minorCount: items.filter((i) => i.deficiencyCategory === "Minor").length,
        recommendationCount: items.filter((i) => i.deficiencyCategory === "Recommendation").length,
      };
    }, [items, criticalItems, majorItems]);

    // Keep active item index valid when removing items
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

    // Add new blank item
    const handleAddItem = () => {
      const newItem: CAPAItem = {
        id: `custom-${Date.now()}`,
        deficiency: "",
        deficiencyCategory: "Major",
        rootCause: "",
        proposedCorrection: "",
        preventiveAction: "",
        indicatorsForCompletion: "",
        timeline: "30 Days",
        responsiblePerson: "QA Manager",
        status: "Pending",
        evidenceFiles: [],
      };
      setItems((prev) => [...prev, newItem]);
      setActiveItemIndex(items.length);
    };

    // Remove item
    const handleRemoveItem = (id: string) => {
      if (items.length === 1) return;
      setItems((prev) => prev.filter((item) => item.id !== id));
    };

    // File upload handler
    const handleFileUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploadingId(itemId);
      try {
        const fileList = Array.from(files);
        for (const file of fileList) {
          let uploadedFile: EvidenceFile;

          if (onFileUpload) {
            uploadedFile = await onFileUpload(file, itemId);
          } else {
            // Local fallback simulation if no remote handler provided
            uploadedFile = {
              name: file.name,
              url: URL.createObjectURL(file),
              size: file.size,
              uploadedAt: new Date().toISOString(),
            };
          }

          setItems((prev) =>
            prev.map((item) => {
              if (item.id === itemId) {
                return {
                  ...item,
                  evidenceFiles: [...(item.evidenceFiles || []), uploadedFile],
                };
              }
              return item;
            })
          );
        }
      } catch (err) {
        console.error("Error uploading evidence document:", err);
      } finally {
        setUploadingId(null);
        e.target.value = "";
      }
    };

    // Remove file handle
    const handleRemoveFile = (itemId: string, fileIdx: number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const nextFiles = [...(item.evidenceFiles || [])];
            nextFiles.splice(fileIdx, 1);
            return { ...item, evidenceFiles: nextFiles };
          }
          return item;
        })
      );
    };

    // Final Approval Handler
    const handleFinalDirectorApproval = async () => {
      if (!onApproveAndSign) return;
      setIsApproving(true);
      try {
        await onApproveAndSign({ items, summary: internalSummary });
      } finally {
        setIsApproving(false);
      }
    };

    // Badge styling helper
    const categoryBadge = (cat: DeficiencyCategory) => {
      switch (cat) {
        case "Critical":
          return <Badge className="bg-red-600 text-white hover:bg-red-700">Critical</Badge>;
        case "Major":
          return <Badge className="bg-amber-600 text-white hover:bg-amber-700">Major</Badge>;
        case "Minor":
          return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Minor</Badge>;
        case "Recommendation":
          return <Badge className="bg-slate-600 text-white hover:bg-slate-700">Recommendation</Badge>;
        default:
          return <Badge variant="outline">{cat}</Badge>;
      }
    };

    return (
      <div ref={ref} className="w-full max-w-7xl mx-auto space-y-6 p-2 sm:p-4">
        {/* HEADER CONTROLS */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-4 rounded-xl shadow-md">
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
            {onSaveDraft && (
              <Button 
                variant="outline" 
                onClick={() => onSaveDraft({ items, summary: internalSummary })}
                disabled={isSubmitting || isApproving}
                className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            )}

            {onSubmit && (
              <Button 
                onClick={() => onSubmit({ items, summary: internalSummary })}
                disabled={isSubmitting || isApproving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isSubmitting ? (
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

            {/* FINAL DIRECTOR APPROVAL BUTTON */}
            {onApproveAndSign && (
              <Button
                onClick={handleFinalDirectorApproval}
                disabled={isSubmitting || isApproving}
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
        <Card className="border-slate-200 shadow-sm bg-slate-50/50">
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
          <div className="flex justify-between items-center mb-4">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="editor" className="data-[state=active]:bg-white">
                Form Editor ({items.length})
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-white">
                Official Letter Preview
              </TabsTrigger>
            </TabsList>

            <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden print:hidden sm:flex">
              <Printer className="h-4 w-4 mr-2" />
              Print Form
            </Button>
          </div>

          {/* EDITOR TAB CONTENT */}
          <TabsContent value="editor" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* ITEM SIDEBAR SELECTOR */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Action Items</h3>
                  <Button variant="ghost" size="sm" onClick={handleAddItem} className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Defect
                  </Button>
                </div>

                <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveItemIndex(index)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        activeItemIndex === index
                          ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                        {categoryBadge(item.deficiencyCategory)}
                      </div>
                      <p className="text-sm font-medium text-slate-800 line-clamp-2">
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
                  ))}
                </div>
              </div>

              {/* DETAILED FORM EDITOR */}
              <div className="lg:col-span-8">
                {items[activeItemIndex] && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-base font-bold text-slate-800">
                        Editing Item #{activeItemIndex + 1}
                      </CardTitle>
                      {items.length > 1 && (
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Identified Deficiency / Observation *</Label>
                          <Textarea
                            rows={3}
                            value={items[activeItemIndex].deficiency}
                            onChange={(e) => handleItemChange(items[activeItemIndex].id, 'deficiency', e.target.value)}
                            placeholder="Describe the non-conformity or regulatory observation..."
                            className="bg-white border-slate-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Classification *</Label>
                          <select
                            value={items[activeItemIndex].deficiencyCategory}
                            onChange={(e) => handleItemChange(items[activeItemIndex].id, 'deficiencyCategory', e.target.value as DeficiencyCategory)}
                            className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                          >
                            <option value="Critical">Critical</option>
                            <option value="Major">Major</option>
                            <option value="Minor">Minor</option>
                            <option value="Recommendation">Recommendation</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Root Cause Analysis (RCA)</Label>
                        <Textarea
                          rows={2}
                          value={items[activeItemIndex].rootCause}
                          onChange={(e) => handleItemChange(items[activeItemIndex].id, 'rootCause', e.target.value)}
                          placeholder="Detail why this non-conformity occurred..."
                          className="bg-white border-slate-200"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Immediate Correction</Label>
                          <Textarea
                            rows={3}
                            value={items[activeItemIndex].proposedCorrection}
                            onChange={(e) => handleItemChange(items[activeItemIndex].id, 'proposedCorrection', e.target.value)}
                            placeholder="Short-term action to fix the immediate issue..."
                            className="bg-white border-slate-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Preventive Action (Long Term)</Label>
                          <Textarea
                            rows={3}
                            value={items[activeItemIndex].preventiveAction}
                            onChange={(e) => handleItemChange(items[activeItemIndex].id, 'preventiveAction', e.target.value)}
                            placeholder="Systemic changes to ensure recurrence is prevented..."
                            className="bg-white border-slate-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Indicators for Completion</Label>
                          <Input
                            value={items[activeItemIndex].indicatorsForCompletion || ''}
                            onChange={(e) => handleItemChange(items[activeItemIndex].id, 'indicatorsForCompletion', e.target.value)}
                            placeholder="e.g. SOP revised, Training logs"
                            className="bg-white border-slate-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Timeline</Label>
                          <Input
                            value={items[activeItemIndex].timeline}
                            onChange={(e) => handleItemChange(items[activeItemIndex].id, 'timeline', e.target.value)}
                            placeholder="e.g. 30 Days, Immediate"
                            className="bg-white border-slate-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Responsibility</Label>
                          <Input
                            value={items[activeItemIndex].responsiblePerson}
                            onChange={(e) => handleItemChange(items[activeItemIndex].id, 'responsiblePerson', e.target.value)}
                            placeholder="Designated QA/QC Manager"
                            className="bg-white border-slate-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <Label className="text-xs font-bold text-slate-700">Objective Evidence & Attachments</Label>
                        
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

                        {(items[activeItemIndex].evidenceFiles ?? []).length > 0 && (
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
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(items[activeItemIndex].id, fIdx)}
                                  className="text-slate-400 hover:text-red-500 ml-1"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

            </div>
          </TabsContent>

          {/* OFFICIAL LETTER PREVIEW TAB */}
          <TabsContent value="preview">
            <Card className="border-slate-400 shadow-xl print:shadow-none print:border-none p-8 sm:p-12 max-w-5xl mx-auto font-serif bg-[#EFF1BD] text-slate-900 border">
              
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