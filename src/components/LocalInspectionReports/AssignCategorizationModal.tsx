"use client";

import { useState, useEffect } from "react";
import { assignCategorizationTaskAction } from "@/lib/LocalInspectionReports/assignCategorisation";
import { getDivisionStaffAction } from "@/lib/LocalInspectionReports/getDivisionStaff";

interface StaffMember {
  id: string;
  name: string;
  email: string;
}

export default function AssignCategorizationModal({
  applicationId,
  companyName,
  applicationNumber,
  onClose,
}: {
  applicationId: number;
  companyName: string;
  applicationNumber: string;
  onClose: () => void;
}) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [divisionName, setDivisionName] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [instructions, setInstructions] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingStaff, setFetchingStaff] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadStaff() {
      try {
        const res = await getDivisionStaffAction();
        if (isMounted) {
          setStaffList(res.staff || []);
          setDivisionName(res.division || "");
        }
      } catch (err) {
        console.error("Error fetching divisional staff:", err);
        if (isMounted) {
          setErrorMessage("Failed to load staff list for your division.");
        }
      } finally {
        if (isMounted) {
          setFetchingStaff(false);
        }
      }
    }
    loadStaff();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErrorMessage("Please select an officer for assignment.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await assignCategorizationTaskAction({
        applicationId,
        assignedStaffId: selectedStaffId,
        instructions,
        targetStepKey: "UNDER_CATEGORIZATION",
      });
      onClose();
    } catch (err) {
      console.error("Categorization assignment failed:", err);
      setErrorMessage("Failed to assign categorization task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5">
        <div className="border-b pb-3 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Assign Facility Categorization Desk Review
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              App ID: <span className="font-mono font-medium">{applicationNumber}</span> | {companyName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Divisional Context
            </label>
            <div className="text-xs font-medium text-slate-800 bg-slate-100 p-2.5 rounded-md border border-slate-200">
              {fetchingStaff ? "Detecting division..." : divisionName || "Division Not Found"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Technical Officer <span className="text-rose-500">*</span>
            </label>
            {fetchingStaff ? (
              <p className="text-xs text-slate-400">Loading divisional staff...</p>
            ) : staffList.length === 0 ? (
              <p className="text-xs text-rose-500">No technical officers found in {divisionName}.</p>
            ) : (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-md bg-white border-slate-300 font-medium"
                required
              >
                <option value="">-- Select Officer --</option>
                {staffList.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Desk Directive / File Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Please extract product line parameters from hard-copy File Vol 1 and calculate risk tier..."
              className="w-full text-xs p-2.5 border rounded-md border-slate-300 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetchingStaff || !selectedStaffId}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {loading ? "Assigning..." : "Assign Desk Categorization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}