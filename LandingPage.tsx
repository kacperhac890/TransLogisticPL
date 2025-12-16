import React from 'react';
import { Truck, Calculator, ArrowRight, Map } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'time' | 'cost') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center mb-12 animate-fade-in-up">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
          <Truck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
          TruckLogistics PL
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Kompleksowe narzędzie dla spedytorów i kierowców. Oblicz czas dostawy z uwzględnieniem pauz lub oszacuj koszty transportu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Tile 1: Time Calculator */}
        <button
          onClick={() => onNavigate('time')}
          className="group relative bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100 transition-all duration-300 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          
          <div className="relative z-10">
            <div className="p-3 bg-blue-100 rounded-xl w-fit mb-6 group-hover:bg-blue-600 transition-colors">
              <Map className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              Kalkulator Czasu Dostawy
            </h2>
            <p className="text-gray-500 mb-6 line-clamp-2">
              Analiza trasy pod kątem czasu jazdy, pauz (45min) i odpoczynków dobowych. Uwzględnia autostrady i drogi krajowe.
            </p>
            <div className="flex items-center font-semibold text-blue-600 group-hover:gap-2 transition-all">
              Uruchom <ArrowRight className="w-5 h-5 ml-1" />
            </div>
          </div>
        </button>

        {/* Tile 2: Cost Calculator */}
        <button
          onClick={() => onNavigate('cost')}
          className="group relative bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-100 transition-all duration-300 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          
          <div className="relative z-10">
            <div className="p-3 bg-emerald-100 rounded-xl w-fit mb-6 group-hover:bg-emerald-600 transition-colors">
              <Calculator className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
              Kalkulator Kosztów
            </h2>
            <p className="text-gray-500 mb-6 line-clamp-2">
              Szybka kalkulacja rentowności. Oblicz koszt paliwa, opłaty drogowe i zysk na podstawie dystansu i spalania.
            </p>
            <div className="flex items-center font-semibold text-emerald-600 group-hover:gap-2 transition-all">
              Uruchom <ArrowRight className="w-5 h-5 ml-1" />
            </div>
          </div>
        </button>
      </div>

      <footer className="mt-16 text-gray-400 text-sm">
        &copy; 2024 TruckLogistics PL
      </footer>
    </div>
  );
};