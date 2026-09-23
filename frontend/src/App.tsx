// Main application entry point for the Lumen Gemini API Client.
import { useState, useRef } from 'react'
// Components
import CurrencySelector from './components/CurrencySelector';
import SearchForm from './components/SearchForm';
import './index.css';
// Types
import type { TravellerCounts } from './types/TravellerType';


// Main application component. Currently a placeholder for future UI development.
function App() {
  // User trip inputs
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [compareDestination, setCompareDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travellers, setTravellers] = useState<TravellerCounts>({
    adults: 1,
    youngAdults: 0,
    children: 0,
    infants: 0,
  });
  const [budgetLevel, setBudgetLevel] = useState('medium');
  const [selectedCurrency, setSelectedCurrency] = useState('');

  // User-facing status message
  const [loadingLabel] = useState('Loading...');

  // Guide request lifecycle
  const [loading] = useState(false);

  // Refs
  const searchFormRef = useRef<HTMLDivElement>(null);

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
        {/* <TravellerSelector
          initialTravellers={initialTravellers}
          onApply={(travellers) => console.log(travellers)}
          onClose={() => console.log('Traveller selector closed')}
        /> */}

        {/* Search Form */}
        <div ref={searchFormRef}>
          <SearchForm
            origin={origin}
            setOrigin={setOrigin}
            destination={destination}
            setDestination={setDestination}
            compareDestination={compareDestination}
            setCompareDestination={setCompareDestination}
            departureDate={departureDate}
            setDepartureDate={setDepartureDate}
            returnDate={returnDate}
            setReturnDate={setReturnDate}
            travellers={travellers}
            setTravellers={setTravellers}
            budgetLevel={budgetLevel}
            setBudgetLevel={setBudgetLevel}
            handleGetGuide={() => console.log('Get Guide clicked (Placeholder for future functionality)')}
            loading={loading}
            loadingLabel={loadingLabel}
          />
        </div>


      </main>
    </div>


  )
}

export default App
