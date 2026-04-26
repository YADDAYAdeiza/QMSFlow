"use client";

import { Trash2 } from "lucide-react";

interface DeleteStaffButtonProps {
  userId: string;
  userName: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

export default function DeleteStaffButton({ userId, userName, deleteAction }: DeleteStaffButtonProps) {
  return (
    <form 
      action={deleteAction} 
      onSubmit={(e) => {
        // Confirmation dialog to prevent accidental deletion
        if (!confirm(`Are you sure you want to revoke access for ${userName}?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button 
        type="submit" 
        className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
        title="Revoke Access"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </form>
  );
}