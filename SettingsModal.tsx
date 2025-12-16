import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { ColorConfig, SpeedConfig, RoadType } from '../types';
import { LABELS, DEFAULT_COLORS, SPEEDS as DEFAULT_SPEEDS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ColorConfig;
  onUpdateColors: (newColors: ColorConfig) => void;
  speeds: SpeedConfig;
  onUpdateSpeeds: (newSpeeds: SpeedConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  colors, 
  onUpdateColors,
  speeds,
  onUpdateSpeeds
}) => {
  if (!isOpen) return null;

  const handleColorChange = (type: RoadType, value: string) => {
    onUpdateColors({
      ...colors,
      [type]: value
    });
  };

  const handleSpeedChange = (type: RoadType, value: number) => {
    // Validation: prevent negative or zero speeds
    const safeValue = isNaN(value) || value <= 0 ? 1 : value;
    onUpdateSpeeds({
        ...speeds,
        [type]: safeValue
    });
  };

  const handleReset = () => {
    onUpdateColors(DEFAULT_COLORS);
    onUpdateSpeeds(DEFAULT_SPEEDS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">Ustawienia</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Colors Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Kolory typów dróg</h4>
            {Object.values(RoadType).map((type) => (
              <div key={`color-${type}`} className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">{LABELS[type]}</span>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-mono uppercase">{colors[type]}</span>
                    <input 
                      type="color" 
                      value={colors[type]} 
                      onChange={(e) => handleColorChange(type, e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                    />
                </div>
              </div>
            ))}
          </div>

          {/* Speeds Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Średnie prędkości (km/h)</h4>
            {Object.values(RoadType).map((type) => (
              <div key={`speed-${type}`} className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">{LABELS[type]}</span>
                <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={speeds[type]} 
                      onChange={(e) => handleSpeedChange(type, parseInt(e.target.value))}
                      className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-right focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max="140"
                    />
                    <span className="text-sm text-gray-500">km/h</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Przywróć domyślne
            </button>
            
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Gotowe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};