import React from 'react';
import { format } from 'date-fns'; // Highly recommended: npm install date-fns

interface AuditSegment {
  point: string;
  staffId: string | null;
  division: string;
  startTime: Date | null;
  endTime: Date | null;
  details: any;
}

export default function AuditTrail({ segments }: { segments: AuditSegment[] }) {
  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {segments.map((segment, idx) => {
          const isLast = idx === segments.length - 1;
          const durationSeconds = segment.endTime && segment.startTime 
            ? Math.floor((segment.endTime.getTime() - segment.startTime.getTime()) / 1000)
            : null;

          return (
            <li key={idx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                      segment.endTime ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                    }`}>
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="font-bold text-gray-900">{segment.point}</span> by{' '}
                        <span className="font-medium text-blue-600">{segment.division}</span>
                      </p>
                      {/* Show Comments from JSONB */}
                      {segment.details?.staff_comment && (
                        <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border italic">
                          "{segment.details.staff_comment}"
                        </p>
                      )}
                      {segment.details?.ddd_comment && (
                        <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 italic">
                          DDD: "{segment.details.ddd_comment}"
                        </p>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-gray-500">
                      <time dateTime={segment.startTime?.toISOString()}>
                        {segment.startTime ? format(segment.startTime, 'MMM d, HH:mm') : 'Pending'}
                      </time>
                      {durationSeconds && (
                        <div className="font-mono text-[10px] text-green-600 font-bold mt-1">
                          Active: {Math.floor(durationSeconds / 3600)}h {Math.floor((durationSeconds % 3600) / 60)}m
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