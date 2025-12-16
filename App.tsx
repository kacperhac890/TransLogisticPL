import React, { useState } from 'react';
import { LandingPage } from './LandingPage';
import { DeliveryTimeCalculator } from './DeliveryTimeCalculator';
import { TransportCostCalculator } from './TransportCostCalculator';

type ViewState = 'landing' | 'time' | 'cost';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');

  const renderView = () => {
    switch (currentView) {
      case 'time':
        return <DeliveryTimeCalculator onBack={() => setCurrentView('landing')} />;
      case 'cost':
        return <TransportCostCalculator onBack={() => setCurrentView('landing')} />;
      case 'landing':
      default:
        return <LandingPage onNavigate={setCurrentView} />;
    }
  };

  return (
    <>
      {renderView()}
    </>
  );
};

export default App;