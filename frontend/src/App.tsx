import { useState } from 'react'
import CurrencySelector from './components/CurrencySelector';
import TravellerSelector from './components/TravellerSelector';
import type { TravellerCounts } from './types/TravellerType';
import './index.css';

// Main application component. Currently a placeholder for future UI development.
function App() {
  const [selectedCurrency, setSelectedCurrency] = useState('');

  const initialTravellers: TravellerCounts = {
    adults: 1,
    youngAdults: 0,
    children: 0,
    infants: 0,
  };

  return (
    <div className="App">
      <h1 className="TODO-title">Lumen - Gemini API Client</h1>
      <p className="TODO-description">
        This is a placeholder for the main application interface. Future UI components will be added here.
      </p>
      <main>
        <CurrencySelector
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
        />
        <TravellerSelector
          initialTravellers={initialTravellers}
          onApply={(travellers) => console.log(travellers)}
          onClose={() => console.log('Traveller selector closed')}
        />
      </main>
    </div>
  )
}

export default App
