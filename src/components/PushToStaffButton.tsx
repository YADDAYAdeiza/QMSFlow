"use client"

import { useTransition } from "react";
import { pushToDivisions } from "@/app/actions/director";
import { useRouter } from "next/navigation";

export default function PushToStaffButton({ 
  appId, 
  divisions 
}: { 
  appId: number, 
  divisions: string[] 
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handlePush = () => {
    startTransition(async () => {
      await pushToDivisions(appId, divisions);
      router.refresh(); // This clears the item from the Director's inbox
      alert("Dossier sent to Divisions!");
    });
  };

  return (
    <button 
      onClick={handlePush}
      disabled={isPending}
      className={`px-4 py-1 rounded text-sm font-bold text-white ${
        isPending ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
      }`}
    >
      {isPending ? "Pushing..." : "Push to Division(s)"}
    </button>
  );
}