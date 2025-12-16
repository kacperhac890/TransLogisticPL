import React, { useState, useEffect } from 'react';
import { calculateRouteAnalysis } from './geminiService';
import { reverseGeocode, forwardGeocode, getAdvancedRouteDetails, getRouteShape } from './mapService';
import { calculateLogisticsTime, LogisticsTime } from './driverRules';
import { RouteResult, RouteSegment, ColorConfig, SpeedConfig } from './types';
import { SPEEDS, DEFAULT_COLORS, LABELS } from './constants';
import { RouteChart } from './RouteChart';
import { SummaryCard } from './SummaryCard';
import { LeafletMap } from './LeafletMap';
import { SettingsModal } from './SettingsModal';
import { SegmentList } from './SegmentList';
import { 
  Truck, 
  Map as MapIcon, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Info, 
  MapPin, 
  MousePointerClick, 
  Settings, 
  Clock, 
  Moon, 
  ArrowLeft,
  Save,
  History,
  Trash2,
  ArrowUpRight
} from 'lucide-react';

interface Coords {
  lat: number;
  lng: number;
}

interface DeliveryHistoryItem {
  id: string;
  date: string;
  start: string;
  end: string;
  distance: number;
  totalDurationHours: number;
  segments: RouteSegment[];
}

interface DeliveryTimeCalculatorProps {
  onBack: () => void;
}

export const DeliveryTimeCalculator: React.FC<DeliveryTimeCalculatorProps> = ({ onBack }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  
  // Map State
  const [startCoords, setStartCoords] = useState<Coords | null>(null);
  const [endCoords, setEndCoords] = useState<Coords | null>(null);
  const [routeShape, setRouteShape] = useState<[number, number][]>([]);
  const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null);

  // Settings State
  const [customColors, setCustomColors] = useState<ColorConfig>(DEFAULT_COLORS);
  const [customSpeeds, setCustomSpeeds] = useState<SpeedConfig>(SPEEDS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Driver Rules State
  const [allowExtendedDriving, setAllowExtendedDriving] = useState(false);
  const [dailyRestDuration, setDailyRestDuration] = useState<9 | 11>(11);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logisticsData, setLogisticsData] = useState<LogisticsTime | null>(null);
  
  // History State
  const [history, setHistory] = useState<DeliveryHistoryItem[]>([]);

  // Sync route shape when both coords are available (simple fetch for shape if no result yet)
  useEffect(() => {
    const fetchShape = async () => {
      // Only fetch simple shape if we don't have a result yet (to avoid overwriting advanced calculation shape)
      if (startCoords && endCoords && !result) {
        const shape = await getRouteShape(startCoords, endCoords);
        setRouteShape(shape);
      } else if (!startCoords || !endCoords) {
        setRouteShape([]);
      }
    };
    fetchShape();
  }, [startCoords, endCoords, result]);

  // Load History
  useEffect(() => {
    const saved = localStorage.getItem('deliveryHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!start || !end) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLogisticsData(null);

    try {
      // 1. Resolve Coordinates
      let finalStartCoords = startCoords;
      let finalEndCoords = endCoords;

      if (!finalStartCoords) {
        finalStartCoords = await forwardGeocode(start);
        if (finalStartCoords) setStartCoords(finalStartCoords);
      }
      if (!finalEndCoords) {
        finalEndCoords = await forwardGeocode(end);
        if (finalEndCoords) setEndCoords(finalEndCoords);
      }

      if (!finalStartCoords || !finalEndCoords) {
        throw new Error("Nie znaleziono lokalizacji. Sprawdź wpisane adresy.");
      }

      // 2. Perform Advanced Calculation (Hard Data)
      // Pass customSpeeds to calculate durations correctly
      const { analysis: advancedData, shape } = await getAdvancedRouteDetails(finalStartCoords, finalEndCoords, customSpeeds);
      
      if (shape.length > 0) {
        setRouteShape(shape);
      }

      if (!advancedData) {
        throw new Error("Nie udało się pobrać danych trasy.");
      }

      // Calculate Logistics (Breaks & Rests)
      const totalDrivingHours = advancedData.segments.reduce((acc, segment) => {
        const speed = customSpeeds[segment.type];
        // Prevent div by zero
        return acc + (segment.distanceKm / (speed || 1));
      }, 0);

      const maxDaily = allowExtendedDriving ? 10.0 : 9.0;
      const logistics = calculateLogisticsTime(totalDrivingHours, maxDaily, dailyRestDuration);
      setLogisticsData(logistics);

      // 3. Perform Gemini Analysis (Summary & Validation)
      const finalResult = await calculateRouteAnalysis(start, end, advancedData);
      
      setResult(finalResult);

    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas pobierania danych.");
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (coords: Coords) => {
    if (!selectionMode) return;

    if (selectionMode === 'start') {
      setStartCoords(coords);
      setStart("Pobieranie adresu...");
      const address = await reverseGeocode(coords.lat, coords.lng);
      setStart(address);
    } else if (selectionMode === 'end') {
      setEndCoords(coords);
      setEnd("Pobieranie adresu...");
      const address = await reverseGeocode(coords.lat, coords.lng);
      setEnd(address);
    }
    setSelectionMode(null);
    setResult(null);
    setLogisticsData(null);
  };

  const handleSaveToHistory = () => {
    if (!result?.data || !logisticsData) return;

    const newItem: DeliveryHistoryItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('pl-PL'),
      start: start,
      end: end,
      distance: result.data.totalDistanceKm,
      totalDurationHours: logisticsData.totalDurationHours,
      segments: result.data.segments
    };

    const newHistory = [newItem, ...history].slice(0, 10); // Keep last 10
    setHistory(newHistory);
    localStorage.setItem('deliveryHistory', JSON.stringify(newHistory));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('deliveryHistory');
  };

  const handleLoadHistory = (item: DeliveryHistoryItem) => {
    setStart(item.start);
    setEnd(item.end);
    
    // Clear results to force re-calculation/validation with current map data
    setResult(null);
    setLogisticsData(null);
    setStartCoords(null);
    setEndCoords(null);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDurationSimple = (h: number) => {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        colors={customColors}
        onUpdateColors={setCustomColors}
        speeds={customSpeeds}
        onUpdateSpeeds={setCustomSpeeds}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <button 
              onClick={onBack}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              title="Wróć do menu"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="bg-blue-600 p-2 rounded-lg">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">TruckLogistics PL</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-500">
              Kalkulator Czasu
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Ustawienia"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro / Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Jak to działa?</p>
                Aplikacja pobiera <strong>szczegółowe dane nawigacyjne</strong> i klasyfikuje każdy odcinek trasy:
                <span className="font-semibold mx-1">Autostrada ({customSpeeds.autostrada}km/h)</span>,
                <span className="font-semibold mx-1">Krajowa ({customSpeeds.krajowa}km/h)</span>,
                <span className="font-semibold mx-1">Miasto ({customSpeeds.miasto}km/h)</span>.
                <br/>
                Uwzględnia również obowiązkowe przerwy kierowcy (45min co 4.5h, 9h/11h pauzy dobowej).
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* Left Column: Inputs & Results */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Input Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleCalculate} className="space-y-4">
                
                {/* Start Input */}
                <div>
                  <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1 ml-1">Miejsce startowe</label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="start"
                        value={start}
                        onChange={(e) => {
                          setStart(e.target.value);
                          if (startCoords) { setStartCoords(null); setResult(null); setLogisticsData(null); }
                        }}
                        className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm ${selectionMode === 'start' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}
                        placeholder="np. Warszawa"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectionMode(selectionMode === 'start' ? null : 'start')}
                      className={`p-3 rounded-lg border transition-colors ${selectionMode === 'start' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                      title="Wybierz na mapie"
                    >
                      <MousePointerClick className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* End Input */}
                <div>
                  <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1 ml-1">Miejsce docelowe</label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="end"
                        value={end}
                        onChange={(e) => {
                          setEnd(e.target.value);
                          if (endCoords) { setEndCoords(null); setResult(null); setLogisticsData(null); }
                        }}
                        className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm ${selectionMode === 'end' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}
                        placeholder="np. Kraków"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectionMode(selectionMode === 'end' ? null : 'end')}
                      className={`p-3 rounded-lg border transition-colors ${selectionMode === 'end' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                      title="Wybierz na mapie"
                    >
                      <MousePointerClick className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Driver Settings Container */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Konfiguracja Kierowcy</p>
                    
                    {/* Daily Rest Duration Selector */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-gray-600" />
                            <div className="text-sm font-medium text-gray-700">
                                Czas pauzy dobowej
                            </div>
                        </div>
                        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                             <button
                                type="button"
                                onClick={() => setDailyRestDuration(9)}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${dailyRestDuration === 9 ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                             >
                                9h
                             </button>
                             <button
                                type="button"
                                onClick={() => setDailyRestDuration(11)}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${dailyRestDuration === 11 ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                             >
                                11h
                             </button>
                        </div>
                    </div>

                    {/* Extended Driving Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <div className="text-sm font-medium text-gray-700 leading-tight">
                            Wydłużony czas jazdy (10h)
                            <p className="text-[10px] text-gray-400 font-normal mt-0.5">Dozwolone 2x w tygodniu</p>
                        </div>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={allowExtendedDriving}
                        onChange={(e) => setAllowExtendedDriving(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[50px] bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center shadow-md disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <span className="flex items-center gap-2">Oblicz precyzyjną trasę <ArrowRight className="w-5 h-5" /></span>
                  )}
                </button>
              </form>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Results Summary */}
            {result && result.data && logisticsData && (
              <div className="animate-fade-in-up space-y-4">
                 <SummaryCard 
                  totalDistance={result.data.totalDistanceKm}
                  logisticsTime={logisticsData}
                  routeDescription={result.data.summary}
                />
                
                {/* Save Button */}
                <button 
                  onClick={handleSaveToHistory}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-sm"
                >
                   <Save className="w-5 h-5" /> Zapisz wynik
                </button>
              </div>
            )}
            
            {/* History Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-500" /> Ostatnie obliczenia
                    </h3>
                     {history.length > 0 && (
                        <button onClick={handleClearHistory} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                {history.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                        Brak zapisanych tras.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((item) => (
                            <div 
                              key={item.id} 
                              onClick={() => handleLoadHistory(item)}
                              className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2 hover:border-blue-200 transition-colors cursor-pointer relative group"
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowUpRight className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="flex justify-between items-start">
                                     <span className="text-xs font-semibold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">{item.date}</span>
                                     <span className="text-xs font-bold text-blue-700">{formatDurationSimple(item.totalDurationHours)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     <span className="text-sm font-bold text-gray-800 truncate">{item.start}</span>
                                     <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                     <span className="text-sm font-bold text-gray-800 truncate">{item.end}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-gray-200 mt-1">
                                    <span className="text-xs text-gray-500">{item.distance} km</span>
                                    <div className="flex gap-1">
                                       {/* Simple indicators of segments present */}
                                       {item.segments.map((seg, idx) => (
                                          <div key={idx} className="w-2 h-2 rounded-full" style={{ backgroundColor: customColors[seg.type] }} title={LABELS[seg.type]}></div>
                                       ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
          </div>

          {/* Right Column: Map */}
          <div className="lg:col-span-7 h-[500px] lg:h-auto min-h-[500px] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
            <LeafletMap 
              startCoords={startCoords}
              endCoords={endCoords}
              routeShape={routeShape}
              selectionMode={selectionMode}
              onMapClick={handleMapClick}
            />
            {selectionMode && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200 text-sm font-semibold animate-bounce text-gray-800 pointer-events-none">
                Kliknij na mapie aby wybrać punkt {selectionMode === 'start' ? 'Start' : 'Koniec'}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Results (Below) */}
        {result && result.data && (
          <div className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Detailed Breakdown - Updated to use SegmentList if available */}
            <div className="lg:col-span-2">
                {result.data.detailedSegments && result.data.detailedSegments.length > 0 ? (
                    <SegmentList segments={result.data.detailedSegments} colors={customColors} />
                ) : (
                    // Fallback to simple category list if detail unavailable
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Podział kategorii</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {result.data.segments.map((segment, idx) => {
                            // Use custom speeds for display calculation consistency
                            const speed = customSpeeds[segment.type];
                            const hours = segment.distanceKm / speed;
                            const h = Math.floor(hours);
                            const m = Math.round((hours - h) * 60);
                            
                            return (
                                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: customColors[segment.type] }}></div>
                                    <div>
                                    <p className="font-medium text-gray-900">{LABELS[segment.type]}</p>
                                    <p className="text-sm text-gray-500">Prędkość śr. {speed} km/h</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">{segment.distanceKm} km</p>
                                    <p className="text-sm text-gray-500">{h > 0 ? `${h}h ` : ''}{m}m</p>
                                </div>
                                </div>
                            );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-4">Rozkład trasy</h3>
              <div className="flex-grow flex items-center justify-center">
                <RouteChart segments={result.data.segments} colors={customColors} />
              </div>
            </div>
            
             {/* Grounding Sources */}
             {result.sources.length > 0 && (
              <div className="lg:col-span-3 mt-4 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Źródła informacji</h4>
                <ul className="space-y-2">
                  {result.sources.map((source, i) => (
                    <li key={i}>
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm hover:underline flex items-center gap-2"
                      >
                        <MapPin className="w-3 h-3" />
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
