"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface EndorsementModalProps {
  applicationId: number;
  facilityId: string | null;
  companyName: string;
  applicationNumber: string;
  onClose: () => void;
}

export default function CategorizationEndorsementModal({
  applicationId,
  facilityId,
  companyName,
  applicationNumber,
  onClose,
}: EndorsementModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchReviewData() {
      try {
        const res = await fetch(`/api/LocalInspectionReports/DDD/CategorizationEndorse?appId=${applicationId}&facilityId=${facilityId}`);
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load review findings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReviewData();
  }, [applicationId, facilityId]);

  const handleDecision = async (action: "ENDORSE" | "REWORK") => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/LocalInspectionReports/DDD/CategorizationEndorse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          facilityId,
          action, // "ENDORSE" or "REWORK"
          remarks,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      router.refresh();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to process endorsement decision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <span className="font-mono text-xs text-purple-600 font-bold">#{applicationNumber}</span>
            <h3 className="text-base font-bold text-slate-900">Categorization Endorsement Review</h3>
            <p className="text-xs text-slate-500">{companyName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading staff desk review findings...</div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Staff Review Findings Summary Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>📋</span> Staff Desk Review Summary
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <span className="text-slate-400 block">Overall Risk Rating</span>
                  <span className="font-bold text-sm text-slate-800 uppercase">{data?.riskAssessment?.overallRiskRating || "N/A"}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <span className="text-slate-400 block">Next Inspection Due</span>
                  <span className="font-bold text-slate-800">{data?.riskAssessment?.nextInspectionDate ? new Date(data.riskAssessment.nextInspectionDate).toLocaleDateString() : "N/A"}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <span className="text-slate-400 block">Complexity Score</span>
                  <span className="font-semibold text-slate-700">{data?.riskAssessment?.complexityScore ?? 0}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <span className="text-slate-400 block">Criticality Score</span>
                  <span className="font-semibold text-slate-700">{data?.riskAssessment?.criticalityScore ?? 0}</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-2xs space-y-1">
                <p><strong>Compliance Level:</strong> {data?.riskAssessment?.complianceLevel || "N/A"}</p>
                <p><strong>Critical Deficiencies:</strong> {data?.riskAssessment?.criticalDeficiencies ?? 0}</p>
                <p><strong>Major Deficiencies:</strong> {data?.riskAssessment?.majorDeficiencies ?? 0}</p>
                <p><strong>Reviewed By Staff:</strong> {data?.reviewerName || "Assigned Technical Reviewer"}</p>
              </div>
            </div>

            {/* Endorsement Remarks Input */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Endorsement / Rework Remarks & Instructions</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter endorsement confirmation notes or specify rework instructions for the reviewer..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDecision("REWORK")}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition"
              >
                {submitting ? "Processing..." : "🔄 Send Back for Rework"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDecision("ENDORSE")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition shadow-sm"
              >
                {submitting ? "Processing..." : "🛡️ Endorse & Log Facility"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}