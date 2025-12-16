import React from 'react';
import { Clock, Navigation, Coffee, Moon, Zap } from 'lucide-react';
import { LogisticsTime } from '../utils/driverRules';

interface SummaryCardProps {
  totalDistance: number;
  logisticsTime: LogisticsTime;
  routeDescription: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ totalDistance, logisticsTime, routeDescription }) => {
  const formatTime = (totalHours: number) => {
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {/* Total Logistics Time - Spans full width on larger screens to fit sidebar nicely */}
      <div className="sm:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-blue-200 relative overflow-hidden flex flex-col justify-center">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10"></div>
        <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-blue-900 font-bold text-xs sm:text-sm uppercase tracking-wide">Całkowity Czas Dostawy</h3>
            </div>
            <div className="flex flex-wrap items-baseline gap-4 mt-2">
                <p className="text-3xl sm:text-4xl font-extrabold text-blue-900">
                {formatTime(logisticsTime.totalDurationHours)}
                </p>
                <div className="flex flex-wrap gap-2">
                    {logisticsTime.breakCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-800 px-2 py-1 rounded-md whitespace-nowrap">
                            <Coffee className="w-3 h-3" /> {logisticsTime.breakCount}x Pauza
                        </span>
                    )}
                    {logisticsTime.restCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md whitespace-nowrap">
                            <Moon className="w-3 h-3" /> {logisticsTime.restCount}x Nocleg {logisticsTime.dailyRestDuration}h
                        </span>
                    )}
                     {logisticsTime.isExtendedDriving && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-800 px-2 py-1 rounded-md whitespace-nowrap" title="Wydłużony czas jazdy do 10h (dozwolone 2x w tygodniu)">
                            <Zap className="w-3 h-3" /> Jazda 10h
                        </span>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Pure Driving Time */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between h-full">
        <div>
            <div className="flex items-center space-x-2 mb-2">
            <div className="p-1.5 bg-gray-100 rounded-lg">
                <Navigation className="w-4 h-4 text-gray-600" />
            </div>
            <h3 className="text-gray-500 font-medium text-xs uppercase tracking-wide">Czas samej jazdy</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
            {formatTime(logisticsTime.drivingTimeHours)}
            </p>
        </div>
        <p className="text-xs text-gray-400 mt-2">Bez przerw</p>
      </div>

      {/* Distance & Info */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between h-full">
        <div>
            <div className="flex items-center space-x-2 mb-2">
            <div className="p-1.5 bg-green-100 rounded-lg">
                <Navigation className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-gray-500 font-medium text-xs uppercase tracking-wide">Dystans</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
            {totalDistance} km
            </p>
        </div>
        <p className="text-xs text-gray-400 mt-2 line-clamp-1" title={routeDescription}>{routeDescription || "Trasa optymalna"}</p>
      </div>
    </div>
  );
};