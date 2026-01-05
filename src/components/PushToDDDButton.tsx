"use client";

import React, { useTransition } from 'react';
import { pushToDDD } from '@/lib/actions/director';

interface PushToDDDButtonProps {
  appId: number;
  divisions: string[];
}

export default function PushToDDDButton({ appId, divisions }: PushToDDDButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handlePush = () => {
    startTransition(async () => {
      try {
        await pushToDDD(appId, divisions);
        alert("Dossier pushed to Divisional Deputy Director.");
      } catch (error) {
        console.error(error);
        alert("Failed to push to DDD.");
      }
    });
  };

  return (
    <button
      onClick={handlePush}
      disabled={isPending}
      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm font-bold disabled:bg-gray-400 transition-colors"
    >
      {isPending ? "Pushing..." : "Send to DDD"}
    </button>
  );
}