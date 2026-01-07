import React from 'react';
import { format } from 'date-fns';

export default function AuditTrail({ segments = [] }: { segments: any[] }) {
  // Debug log to see the data in your browser console

  if (!segments || segments.length === 0) {
    return (
      <div className="text-slate-400 text-xs italic py-4">
        No workflow history found for this application.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {segments.map((segment, idx) => {
          const isLast = idx === segments.length - 1;
          
          // Safety check for dates
          const start = segment.startTime ? new Date(segment.startTime) : null;
          const end = segment.endTime ? new Date(segment.endTime) : null;

          const durationSeconds = end && start 
            ? Math.floor((end.getTime() - start.getTime()) / 1000)
            : null;

          return (
            <li key={idx}>
              <div className="relative pb-8">
                {/* Vertical Connector Line */}
                {!isLast && (
                  <span 
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" 
                    aria-hidden="true" 
                  />
                )}
                
                <div className="relative flex space-x-3">
                  {/* Status Circle Icon */}
                  <div>
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                      segment.endTime ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'
                    }`}>
                      <div className="h-2.5 w-2.5 rounded-full bg-white" />
                    </span>
                  </div>

                  {/* Content Block */}
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="font-bold text-gray-900">{segment.point}</span> by{' '}
                        <span className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4">
                          {segment.division}
                        </span>
                      </p>
                      
                      {/* Show Staff Comments from JSONB */}
                      {segment.details?.staff_comment && (
                        <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                          "{segment.details.staff_comment}"
                        </p>
                      )}

                      {/* Show DDD Comments from JSONB */}
                      {segment.details?.ddd_comment && (
                        <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 italic">
                          DDD: "{segment.details.ddd_comment}"
                        </p>
                      )}

                      {/* Show Director Notes if present */}
                      {segment.details?.director_final_notes && (
                        <p className="mt-2 text-xs text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-100 font-medium">
                          Director: "{segment.details.director_final_notes}"
                        </p>
                      )}
                    </div>

                    {/* Time and Duration Label */}
                    <div className="whitespace-nowrap text-right text-xs text-slate-400">
                      <time dateTime={start?.toISOString()}>
                        {start ? format(start, 'MMM d, HH:mm') : 'Pending'}
                      </time>
                      
                      {durationSeconds && (
                        <div className="font-mono text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 px-1 rounded inline-block">
                          {Math.floor(durationSeconds / 3600)}h {Math.floor((durationSeconds % 3600) / 60)}m
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}