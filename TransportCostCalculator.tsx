import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  RefreshCcw, 
  Settings, 
  Euro, 
  Truck, 
  Fuel, 
  DollarSign, 
  Wrench, 
  TrendingUp, 
  Save, 
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  Coins,
  Plus,
  X,
  Zap,
  Hash,
  MapPin,
  ArrowRight,
  ArrowUpRight
} from 'lucide-react';

interface TransportCostCalculatorProps {
  onBack: () => void;
}

interface CalculationHistoryItem {
  id: string;
  date: string;
  routeDate: string;
  distance: number;
  revenue: number;
  profit: number;
  isEur: boolean;
  truckName?: string;
  truckPlate?: string;
  startLocation: string;
  endLocation: string;
}

interface TruckProfile {
  id: string;
  name: string;
  power: number; // HP
  plate: string;
  consumption: number; // L/100km
  tollRate: number; // PLN/km
  maintenanceRate: number; // PLN/km
}

export const TransportCostCalculator: React.FC<TransportCostCalculatorProps> = ({ onBack }) => {
  // --- State: Main Settings ---
  const [isEurMode, setIsEurMode] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(4.30);
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [distance, setDistance] = useState<number | ''>('');
  
  // --- State: Freight ---
  const [isRatePerKm, setIsRatePerKm] = useState(false);
  const [freightValue, setFreightValue] = useState<number | ''>(''); // Can be Total Amount OR Rate per KM

  // --- State: Costs (Defaults from screenshot) ---
  const [citRate, setCitRate] = useState(0.19); // 19% Poland default
  const [citCountry, setCitCountry] = useState('Polska');
  const [fuelPrice, setFuelPrice] = useState(5.00);
  const [consumption, setConsumption] = useState(34); // L/100km
  const [tollRate, setTollRate] = useState(0.40); // PLN/km
  const [maintenanceRate, setMaintenanceRate] = useState(0.65); // PLN/km
  
  const [showCostSettings, setShowCostSettings] = useState(true);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);

  // --- State: Truck Fleet ---
  const [trucks, setTrucks] = useState<TruckProfile[]>([]);
  const [isTruckModalOpen, setIsTruckModalOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [newTruck, setNewTruck] = useState<Partial<TruckProfile>>({
    name: '',
    power: 450,
    plate: '',
    consumption: 30,
    tollRate: 0.40,
    maintenanceRate: 0.50
  });

  // --- Calculations ---
  const [results, setResults] = useState({
    revenuePLN: 0,
    fuelCost: 0,
    tollCost: 0,
    maintenanceCost: 0,
    totalOpsCost: 0,
    grossProfit: 0,
    citCost: 0,
    netProfit: 0,
    netPerKm: 0,
    breakEven: 0
  });

  // Load history and trucks on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('calcHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const savedTrucks = localStorage.getItem('truckFleet');
    if (savedTrucks) {
      setTrucks(JSON.parse(savedTrucks));
    }
  }, []);

  // Main Calculation Effect
  useEffect(() => {
    const dist = typeof distance === 'number' ? distance : 0;
    const val = typeof freightValue === 'number' ? freightValue : 0;

    // 1. Calculate Revenue in PLN
    let revenueRaw = 0;
    if (isRatePerKm) {
      revenueRaw = dist * val;
    } else {
      revenueRaw = val;
    }

    // Convert to PLN if in EUR mode
    const revenuePLN = isEurMode ? revenueRaw * exchangeRate : revenueRaw;

    // 2. Calculate Costs (Always in PLN based on inputs)
    const fuelCost = (dist / 100) * consumption * fuelPrice;
    const tollCost = dist * tollRate;
    const maintenanceCost = dist * maintenanceRate;
    
    const totalOpsCost = fuelCost + tollCost + maintenanceCost;

    // 3. Profits
    const grossProfit = revenuePLN - totalOpsCost;
    
    // CIT only applies if there is profit
    const citCost = grossProfit > 0 ? grossProfit * citRate : 0;
    const netProfit = grossProfit - citCost;

    // 4. KPIs
    const netPerKm = dist > 0 ? netProfit / dist : 0;
    const breakEven = totalOpsCost; // Cost 0% profit

    setResults({
      revenuePLN,
      fuelCost,
      tollCost,
      maintenanceCost,
      totalOpsCost,
      grossProfit,
      citCost,
      netProfit,
      netPerKm,
      breakEven
    });
  }, [distance, freightValue, isRatePerKm, isEurMode, exchangeRate, consumption, fuelPrice, tollRate, maintenanceRate, citRate]);

  // --- Handlers ---

  const handleSaveToHistory = () => {
    if (!distance || !freightValue) return;
    
    const selectedTruck = trucks.find(t => t.id === selectedTruckId);

    const newItem: CalculationHistoryItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('pl-PL'),
      routeDate: routeDate,
      distance: Number(distance),
      revenue: results.revenuePLN,
      profit: results.netProfit,
      isEur: isEurMode,
      truckName: selectedTruck?.name,
      truckPlate: selectedTruck?.plate,
      startLocation: startLocation || 'Nieznane',
      endLocation: endLocation || 'Nieznane'
    };

    const newHistory = [newItem, ...history].slice(0, 10); // Keep last 10
    setHistory(newHistory);
    localStorage.setItem('calcHistory', JSON.stringify(newHistory));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('calcHistory');
  };

  const handleLoadHistory = (item: CalculationHistoryItem) => {
    setStartLocation(item.startLocation);
    setEndLocation(item.endLocation);
    setDistance(item.distance);
    setRouteDate(item.routeDate || new Date().toISOString().split('T')[0]);
    
    // Set currency mode from history
    setIsEurMode(item.isEur);
    
    // Load revenue as "Total Freight" to be precise with what was saved
    setIsRatePerKm(false);
    
    // If it was EUR, we load the revenue (which is stored in PLN in our history object usually, 
    // but let's assume for UX we want to show the amount based on current exchange or simply 
    // allow user to re-enter. 
    // Actually, `item.revenue` is stored in PLN in our `handleSaveToHistory`.
    // If we want to restore exact input, we would need to store raw input.
    // For now, let's restore the PLN value into the input for simplicity.
    if (item.isEur) {
       // Convert back roughly to EUR for display if mode is EUR
       setFreightValue(Number((item.revenue / exchangeRate).toFixed(2)));
    } else {
       setFreightValue(item.revenue);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fleet Handlers
  const handleAddTruck = () => {
    if (!newTruck.name || !newTruck.plate) return;

    const truck: TruckProfile = {
      id: Date.now().toString(),
      name: newTruck.name,
      power: Number(newTruck.power) || 0,
      plate: newTruck.plate,
      consumption: Number(newTruck.consumption) || 0,
      tollRate: Number(newTruck.tollRate) || 0,
      maintenanceRate: Number(newTruck.maintenanceRate) || 0,
    };

    const updatedTrucks = [...trucks, truck];
    setTrucks(updatedTrucks);
    localStorage.setItem('truckFleet', JSON.stringify(updatedTrucks));
    setIsTruckModalOpen(false);
    
    // Reset form
    setNewTruck({
        name: '',
        power: 450,
        plate: '',
        consumption: 30,
        tollRate: 0.40,
        maintenanceRate: 0.50
    });
  };

  const handleDeleteTruck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTrucks = trucks.filter(t => t.id !== id);
    setTrucks(updatedTrucks);
    localStorage.setItem('truckFleet', JSON.stringify(updatedTrucks));
    if (selectedTruckId === id) setSelectedTruckId(null);
  };

  const handleSelectTruck = (truck: TruckProfile) => {
    setSelectedTruckId(truck.id);
    setConsumption(truck.consumption);
    setTollRate(truck.tollRate);
    setMaintenanceRate(truck.maintenanceRate);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans relative">
      
      {/* --- Top Bar --- */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">
                <Truck className="w-5 h-5" />
            </span>
            <span className="text-gray-400 text-sm hidden sm:inline">Witaj, Spedytorze</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-100 rounded-full text-gray-500">
                <Coins className="w-5 h-5" />
            </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* --- Header Title --- */}
        <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Kalkulator Kosztów Transportu</h1>
            <p className="text-gray-500 text-sm">Oblicz szacunkowy koszt i zysk trasy ciężarówki.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* --- LEFT COLUMN: Inputs --- */}
            <div className="lg:col-span-7 space-y-6">
                
                {/* Main Input Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                    
                    {/* Currency Settings */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-gray-100 gap-4">
                        <h2 className="text-lg font-bold text-gray-800">Ustawienia Waluty</h2>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${isEurMode ? 'text-blue-600' : 'text-gray-400'}`}>€</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isEurMode} 
                                    onChange={(e) => setIsEurMode(e.target.checked)} 
                                    className="sr-only peer" 
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <span className="text-sm font-medium text-gray-700">Tryb EUR</span>
                            <button className="text-blue-500 hover:text-blue-700 p-1"><RefreshCcw className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {/* Exchange Rate Box */}
                    {isEurMode && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-6 flex items-center gap-2 text-blue-800 text-sm border border-blue-100 animate-fade-in-up">
                            <span className="font-semibold">Aktualny Kurs:</span>
                            <span>1 EUR = </span>
                            <input 
                                type="number" 
                                value={exchangeRate}
                                onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                                className="w-16 bg-white border border-blue-200 rounded px-1 py-0.5 text-center font-bold focus:outline-none focus:border-blue-500"
                                step="0.01"
                            />
                            <span>zł</span>
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Date */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Data Trasy:</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={routeDate}
                                    onChange={(e) => setRouteDate(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                                />
                                <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                            </div>
                        </div>

                        {/* Start & End Locations */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Miejsce Startu</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="np. Warszawa"
                                        value={startLocation}
                                        onChange={(e) => setStartLocation(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                                    />
                                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Miejsce Docelowe</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="np. Berlin"
                                        value={endLocation}
                                        onChange={(e) => setEndLocation(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                                    />
                                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Distance */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Dystans do pokonania (km):</label>
                            <input 
                                type="number" 
                                placeholder="Wprowadź liczbę kilometrów"
                                value={distance}
                                onChange={(e) => setDistance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Freight Toggle & Input */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                             <div className="flex justify-end mb-3">
                                <label className="inline-flex items-center cursor-pointer">
                                    <span className="mr-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        {isRatePerKm ? 'Stawka za km' : 'Całkowity Fracht'}
                                    </span>
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            checked={isRatePerKm}
                                            onChange={(e) => setIsRatePerKm(e.target.checked)}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <span className="ml-2 text-xs text-gray-500 flex items-center gap-1">
                                        <RefreshCcw className="w-3 h-3" /> Zmień tryb
                                    </span>
                                </label>
                             </div>
                             
                             <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {isRatePerKm ? `Stawka za km (${isEurMode ? 'EUR' : 'PLN'})` : `Całkowita Kwota Frachtu (Przychód, ${isEurMode ? 'EUR' : 'PLN'}):`}
                             </label>
                             <input 
                                type="number" 
                                placeholder={isRatePerKm ? "np. 1.50" : "np. 1500.00"}
                                value={freightValue}
                                onChange={(e) => setFreightValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors font-medium text-gray-900"
                            />
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button 
                                onClick={handleSaveToHistory}
                                disabled={!distance || !freightValue}
                                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-4 h-4" /> Zapisz Trasę
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- NEW: Fleet Management Section --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6">
                   <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                                 <Truck className="w-5 h-5" />
                             </div>
                             <h3 className="text-lg font-bold text-gray-800">Moja Flota</h3>
                        </div>
                        <button 
                             onClick={() => setIsTruckModalOpen(true)}
                             className="flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                        >
                             <Plus className="w-4 h-4" /> Dodaj Ciężarówkę
                        </button>
                   </div>
                   
                   {trucks.length === 0 ? (
                       <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                           <p className="text-gray-500 text-sm">Brak zdefiniowanych pojazdów.</p>
                           <p className="text-xs text-gray-400 mt-1">Dodaj ciężarówkę, aby szybko wczytywać dane kosztowe.</p>
                       </div>
                   ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {trucks.map(truck => (
                               <div 
                                    key={truck.id} 
                                    onClick={() => handleSelectTruck(truck)}
                                    className={`relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedTruckId === truck.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
                               >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-800 text-sm">{truck.name}</h4>
                                        <button 
                                            onClick={(e) => handleDeleteTruck(truck.id, e)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Hash className="w-3 h-3 text-gray-400" /> {truck.plate}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Zap className="w-3 h-3 text-amber-500" /> {truck.power} KM
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-[10px] text-gray-500">
                                         <span>Spalanie: {truck.consumption} l</span>
                                         <span>Opłaty: {truck.tollRate.toFixed(2)} zł/km</span>
                                    </div>
                                    {selectedTruckId === truck.id && (
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full"></div>
                                    )}
                               </div>
                           ))}
                       </div>
                   )}
                </div>

                {/* Costs Settings Accordion */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <button 
                        onClick={() => setShowCostSettings(!showCostSettings)}
                        className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors text-left"
                    >
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            Indywidualne Stawki Kosztów
                        </h3>
                        {showCostSettings ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>
                    
                    {showCostSettings && (
                        <div className="p-6 pt-0 border-t border-gray-100 animate-fade-in-down">
                            <p className="text-gray-400 text-xs mb-6 mt-4">Wprowadź swoje rzeczywiste stawki. Zmiany są automatycznie uwzględniane w kalkulacji.</p>
                            
                            {/* CIT Selection */}
                            <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center gap-2 mb-3 text-blue-800">
                                    <Settings className="w-4 h-4" />
                                    <span className="text-sm font-semibold">Rezydencja Podatkowa (CIT)</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { name: 'Polska', rate: 0.19 },
                                        { name: 'Niemcy', rate: 0.298 },
                                        { name: 'Irlandia', rate: 0.125 },
                                        { name: 'Węgry', rate: 0.09 },
                                        { name: 'Rumunia', rate: 0.16 }
                                    ].map(country => (
                                        <button
                                            key={country.name}
                                            onClick={() => { setCitCountry(country.name); setCitRate(country.rate); }}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                                citCountry === country.name 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                            }`}
                                        >
                                            {country.name} ({(country.rate * 100).toFixed(1)}%)
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <Fuel className="w-4 h-4 text-green-600" /> Cena Paliwa (PLN/L)
                                    </label>
                                    <input 
                                        type="number" 
                                        value={fuelPrice}
                                        onChange={(e) => setFuelPrice(parseFloat(e.target.value))}
                                        className="block w-full px-3 py-2 text-right border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-purple-500" /> Średnie Spalanie (L/100km)
                                    </label>
                                    <input 
                                        type="number" 
                                        value={consumption}
                                        onChange={(e) => setConsumption(parseFloat(e.target.value))}
                                        className="block w-full px-3 py-2 text-right border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-orange-500" /> Opłaty Drogowe (PLN/km)
                                    </label>
                                    <input 
                                        type="number" 
                                        value={tollRate}
                                        onChange={(e) => setTollRate(parseFloat(e.target.value))}
                                        className="block w-full px-3 py-2 text-right border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <Wrench className="w-4 h-4 text-blue-500" /> Serwis/Eksploatacja (PLN/km)
                                    </label>
                                    <input 
                                        type="number" 
                                        value={maintenanceRate}
                                        onChange={(e) => setMaintenanceRate(parseFloat(e.target.value))}
                                        className="block w-full px-3 py-2 text-right border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>
                                
                                <div className="pt-2 flex justify-end">
                                     <div className="text-xs text-gray-400 font-medium">
                                        Narzut Przedsiębiorstwa (CIT): <span className="text-gray-800 font-bold">{(citRate * 100).toFixed(1)}% ({citCountry})</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- RIGHT COLUMN: Results --- */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Results Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Szczegółowe Obliczenia (w PLN)</h3>
                    
                    {/* Revenue Block */}
                    <div className="bg-indigo-50 rounded-lg p-4 mb-6 border border-indigo-100">
                        <div className="flex justify-between items-center mb-1">
                             <div className="flex items-center gap-2 text-indigo-800 font-semibold">
                                <DollarSign className="w-5 h-5" /> Całkowity Przychód Frachtu
                             </div>
                             <span className="text-xl font-extrabold text-indigo-900">{formatCurrency(results.revenuePLN)}</span>
                        </div>
                        <div className="text-xs text-indigo-400 text-right">Dystans: {distance || 0} km</div>
                    </div>

                    {/* Operational Costs */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">A. Koszty Operacyjne</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-md border border-green-100">
                                <div className="text-sm text-green-800 flex items-center gap-2">
                                    <Fuel className="w-4 h-4" /> 1. Koszt Paliwa ({consumption}L/100km @ {fuelPrice.toFixed(2)})
                                </div>
                                <span className="font-bold text-green-900">{formatCurrency(results.fuelCost)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-md border border-amber-100">
                                <div className="text-sm text-amber-800 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> 2. Koszt Opłat Drogowych ({tollRate.toFixed(2)}/km)
                                </div>
                                <span className="font-bold text-amber-900">{formatCurrency(results.tollCost)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md border border-blue-100">
                                <div className="text-sm text-blue-800 flex items-center gap-2">
                                    <Wrench className="w-4 h-4" /> 3. Koszt Serwisu ({maintenanceRate.toFixed(2)}/km)
                                </div>
                                <span className="font-bold text-blue-900">{formatCurrency(results.maintenanceCost)}</span>
                            </div>
                        </div>
                        
                        <div className="mt-3 flex justify-between items-center p-3 bg-red-50 rounded-md border border-red-100">
                             <span className="text-sm font-bold text-red-800">Całkowity Koszt Operacyjny</span>
                             <span className="text-lg font-extrabold text-red-900">{formatCurrency(results.totalOpsCost)}</span>
                        </div>
                    </div>

                    {/* EBT & Taxes */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">B. Wynik Przed Opodatkowaniem (EBT)</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-md border border-orange-100">
                                <span className="text-sm font-bold text-orange-800">Dochód Brutto (Przychód - Koszty)</span>
                                <span className={`font-bold ${results.grossProfit >= 0 ? 'text-orange-900' : 'text-red-600'}`}>
                                    {formatCurrency(results.grossProfit)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-md border border-purple-100">
                                <span className="text-sm font-bold text-purple-800">Koszt Podatku CIT ({(citRate * 100).toFixed(1)}%)</span>
                                <span className="font-bold text-purple-900">{formatCurrency(results.citCost)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Final Net */}
                    <div className="mb-6">
                         <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">C. Podsumowanie Zysku Netto</h4>
                         <div className={`p-4 rounded-lg shadow-sm mb-3 text-white flex justify-between items-center ${results.netProfit >= 0 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
                             <span className="font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5" /> CAŁKOWITY ZYSK NETTO</span>
                             <span className="text-2xl font-extrabold">{formatCurrency(results.netProfit)}</span>
                         </div>
                         
                         <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-md border border-emerald-100">
                             <span className="text-sm font-bold text-emerald-800">Zysk Netto na 1 km (na czysto)</span>
                             <span className="font-bold text-emerald-900">{formatCurrency(results.netPerKm)}/km</span>
                         </div>
                    </div>

                     <div className="p-3 bg-blue-100 rounded-md text-center text-xs text-blue-800 font-medium">
                        Sugerowana Cena Końcowa (Koszt + Zysk 0%): {formatCurrency(results.breakEven)}
                     </div>

                </div>

                {/* History Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <History className="w-5 h-5 text-gray-500" /> Historia Obliczeń
                        </h3>
                         {history.length > 0 && (
                            <button onClick={handleClearHistory} className="text-red-400 hover:text-red-600 p-1">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                         {/* Filter Placeholder - Visual Only */}
                        <div className="flex gap-2 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                             <div className="w-1/2">
                                <label className="text-[10px] text-gray-400 block mb-1">Data od:</label>
                                <input type="date" className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs" />
                             </div>
                             <div className="w-1/2">
                                <label className="text-[10px] text-gray-400 block mb-1">Data do:</label>
                                <input type="date" className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs" />
                             </div>
                        </div>

                        {history.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">Brak zapisanych tras.</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {history.map((item) => (
                                    <div 
                                      key={item.id} 
                                      onClick={() => handleLoadHistory(item)}
                                      className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center group hover:border-blue-200 transition-colors cursor-pointer relative"
                                    >
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <ArrowUpRight className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                 <span className="text-xs font-semibold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">{item.date}</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mb-2">
                                                 <span className="text-sm font-bold text-gray-800">{item.startLocation}</span>
                                                 <ArrowRight className="w-4 h-4 text-gray-400" />
                                                 <span className="text-sm font-bold text-gray-800">{item.endLocation}</span>
                                            </div>

                                            <div className="text-xs text-gray-500">{item.distance} km {item.isEur && '(EUR)'}</div>
                                            
                                            {item.truckName && (
                                                <div className="flex items-center gap-1.5 text-xs text-indigo-600 mt-1.5 bg-indigo-50 px-2 py-1 rounded-md w-fit">
                                                    <Truck className="w-3 h-3" />
                                                    <span className="font-medium">{item.truckName}</span>
                                                    <span className="text-indigo-400 border-l border-indigo-200 pl-1.5 ml-0.5">{item.truckPlate}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right pl-4">
                                            <div className={`text-lg font-bold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(item.profit)}
                                            </div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Zysk Netto</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
      </div>
      
      {/* --- Truck Modal --- */}
      {isTruckModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                          <Truck className="w-5 h-5 text-indigo-600" /> Dodaj Ciężarówkę
                      </h3>
                      <button onClick={() => setIsTruckModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Nazwa Ciężarówki (np. MAN TGX)</label>
                          <input 
                              type="text" 
                              value={newTruck.name}
                              onChange={(e) => setNewTruck({...newTruck, name: e.target.value})}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Wpisz nazwę"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Moc (KM)</label>
                              <input 
                                  type="number" 
                                  value={newTruck.power}
                                  onChange={(e) => setNewTruck({...newTruck, power: Number(e.target.value)})}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Nr Rejestracyjny</label>
                              <input 
                                  type="text" 
                                  value={newTruck.plate}
                                  onChange={(e) => setNewTruck({...newTruck, plate: e.target.value})}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="WA 12345"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Średnie spalanie (l/100km)</label>
                          <input 
                              type="number" 
                              value={newTruck.consumption}
                              onChange={(e) => setNewTruck({...newTruck, consumption: Number(e.target.value)})}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Opłaty (PLN/km)</label>
                              <input 
                                  type="number" 
                                  value={newTruck.tollRate}
                                  onChange={(e) => setNewTruck({...newTruck, tollRate: Number(e.target.value)})}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Serwis (PLN/km)</label>
                              <input 
                                  type="number" 
                                  value={newTruck.maintenanceRate}
                                  onChange={(e) => setNewTruck({...newTruck, maintenanceRate: Number(e.target.value)})}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                              />
                          </div>
                      </div>
                      <div className="pt-4 flex justify-end gap-3">
                          <button 
                              onClick={() => setIsTruckModalOpen(false)}
                              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                          >
                              Anuluj
                          </button>
                          <button 
                              onClick={handleAddTruck}
                              disabled={!newTruck.name || !newTruck.plate}
                              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                          >
                              Zapisz
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
