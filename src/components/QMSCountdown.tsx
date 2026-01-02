"use client";

import { useState, useEffect } from "react";

interface QMSCountdownProps {
  startTime: string; // ISO string from DB
  limitHours: number; // e.g., 48
}

export default function QMSCountdown({ startTime, limitHours }: QMSCountdownProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const deadline = new Date(startTime).getTime() + limitHours * 60 * 60 * 1000;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("OVERDUE");
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, limitHours]);

  const isOverdue = timeLeft === "OVERDUE";

  return (
    <span className={`font-mono font-bold ${isOverdue ? "text-red-600 animate-pulse" : "text-green-600"}`}>
      {timeLeft}
    </span>
  );
}