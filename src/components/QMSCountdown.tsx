// "use client"

// import { useEffect, useState } from "react";

// export default function QMSCountdown({ startTime }: { startTime: Date }) {
//   const [timeLeft, setTimeLeft] = useState("");
//   const [isUrgent, setIsUrgent] = useState(false);

//   useEffect(() => {
//     const calculateTime = () => {
//       const start = new Date(startTime).getTime();
//       const deadline = start + (48 * 60 * 60 * 1000); // 48 Hours in ms
//       const now = new Date().getTime();
//       const diff = deadline - now;

//       if (diff <= 0) {
//         setTimeLeft("OVERDUE");
//         setIsUrgent(true);
//         return;
//       }

//       const hours = Math.floor(diff / (1000 * 60 * 60));
//       const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
//       if (hours < 5) setIsUrgent(true);
//       setTimeLeft(`${hours}h ${minutes}m`);
//     };

//     calculateTime();
//     const timer = setInterval(calculateTime, 60000); // Update every minute
//     return () => clearInterval(timer);
//   }, [startTime]);

//   return (
//     <div className={`text-2xl font-mono font-bold ${isUrgent ? 'text-red-600 animate-pulse' : 'text-blue-700'}`}>
//       {timeLeft}
//     </div>
//   );
// }


"use client"

import React, { useState, useEffect } from 'react';

interface CountdownProps {
  startTime: Date;
  initialRemainingSeconds: number;
}

export default function QMSCountdown({ startTime, initialRemainingSeconds }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(initialRemainingSeconds);

  useEffect(() => {
    // 1. Calculate the exact moment the clock should hit zero
    // This is: "Right Now" + "The seconds we have left"
    const targetEndTime = new Date().getTime() + initialRemainingSeconds * 1000;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = Math.max(0, Math.floor((targetEndTime - now) / 1000));
      
      setTimeLeft(difference);

      if (difference <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [initialRemainingSeconds]);

  // Formatting seconds into HH:MM:SS
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const isUrgent = timeLeft < 3600; // Less than 1 hour remains
  const isExpired = timeLeft === 0;

  return (
    <div className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
      isExpired ? 'bg-red-50 border-red-500' : 
      isUrgent ? 'bg-amber-50 border-amber-500 animate-pulse' : 
      'bg-slate-50 border-slate-200'
    }`}>
      <div className={`text-3xl font-mono font-black ${
        isExpired ? 'text-red-600' : 
        isUrgent ? 'text-amber-600' : 
        'text-slate-700'
      }`}>
        {String(hours).padStart(2, '0')}:
        {String(minutes).padStart(2, '0')}:
        {String(seconds).padStart(2, '0')}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 mt-1">
        {isExpired ? "SOP DEADLINE BREACHED" : "Active QMS Window"}
      </p>
    </div>
  );
}