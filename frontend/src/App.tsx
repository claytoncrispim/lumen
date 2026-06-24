import { useState, useRef } from 'react'
// Components
import CurrencySelector from './components/CurrencySelector';
import LoadingSpinner from './components/LoadingSpinner';
import SearchForm from './components/SearchForm';
// Utilities
import { fetchWithRetry } from './utils/fetchWithRetry';
// Types
import type { TravellerCounts } from './types/TravellerType';
import './index.css';
import { ApiError } from './utils/ApiError';


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// Helpers
const callGemini = async(prompt: string) => {
  try {
    const res = await fetchWithRetry(
      `${API_BASE_URL}/generate-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      }
    );

    const data = await res.json();

    if (!data || typeof data !== 'object') {
      throw new Error('UNEXPECTED_RESPONSE_SHAPE');
    }

    return data;    
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw error;
  }
}



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
