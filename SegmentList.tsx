import React from 'react';
import { DetailedSegment, ColorConfig, RoadType } from '../types';
import { Clock, Navigation, Ship } from 'lucide-react';

interface SegmentListProps {
  segments: DetailedSegment[];
  colors: ColorConfig;
}

export const SegmentList: React.FC<SegmentListProps> = ({ segments, colors }) => {
  if (!segments || segments.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Przebieg trasy krok po kroku</h3>
        <span className="text-xs text-gray-500 font-medium bg-gray-200 px-2 py-1 rounded">Szczegóły</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {segments.map((segment, idx) => {
            const isLast = idx === segments.length - 1;
            
            return (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 group">
                {/* Timeline connector and dot */}
                <div className="flex flex-col items-center self-stretch w-4">
                  <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm flex-shrink-0 z-10`} style={{ backgroundColor: colors[segment.type] }}></div>
                  {!isLast && <div className="w-0.5 bg-gray-200 flex-grow -mb-6 mt-1 group-hover:bg-gray-300 transition-colors"></div>}
                </div>

                <div className="flex-grow">
                   <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                           {segment.type === RoadType.FERRY && <Ship className="w-4 h-4 text-gray-500" />}
                           <p className="font-semibold text-gray-800 text-sm">{segment.name}</p>
                        </div>
                        <p className="text-xs text-gray-500 capitalize">{segment.type}</p>
                      </div>
                      <div className="text-right">
                          <div className="flex items-center gap-1 justify-end text-gray-700 text-sm font-medium">
                            <Navigation className="w-3 h-3 text-gray-400" />
                            {segment.distanceKm} km
                          </div>
                          <div className="flex items-center gap-1 justify-end text-gray-500 text-xs">
                             <Clock className="w-3 h-3 text-gray-400" />
                             {segment.durationMinutes} min
                          </div>
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
