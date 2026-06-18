import { useState, useRef } from 'react'
import CurrencySelector from './components/CurrencySelector';
import LoadingSpinner from './components/LoadingSpinner';
import SearchForm from './components/SearchForm';
// import TravellerSelector from './components/TravellerSelector';
import type { TravellerCounts } from './types/TravellerType';
import './index.css';

// Main application component. Currently a placeholder for future UI development.
function App() {
  // State variables for managing the search form inputs
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
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Loading...');
  const [selectedCurrency, setSelectedCurrency] = useState('');

  // const initialTravellers: TravellerCounts = {
  //   adults: 1,
  //   youngAdults: 0,
  //   children: 0,
  //   infants: 0,
  // };

  // Refs
  const searchFormRef = useRef<HTMLDivElement>(null);

  // Handlers
  const handleChangeTrip = () => {
    if (searchFormRef.current) {
      searchFormRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start',
      });
    }
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
