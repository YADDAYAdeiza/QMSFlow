"use client"

import { useEffect, useState } from "react";

export default function QMSCountdown({ startTime }: { startTime: Date }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startTime).getTime();
      const deadline = start + (48 * 60 * 60 * 1000); // 48 Hours in ms
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("OVERDUE");
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours < 5) setIsUrgent(true);
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className={`text-2xl font-mono font-bold ${isUrgent ? 'text-red-600 animate-pulse' : 'text-blue-700'}`}>
      {timeLeft}
    </div>
  );
}