// Main application entry point for the Lumen Gemini API Client.
import { useState, useRef } from 'react'
// Components
import CurrencySelector from './components/CurrencySelector';
import LoadingSpinner from './components/LoadingSpinner';
import SearchForm from './components/SearchForm';
import TripSummaryBar from "./components/TripSummaryBar";
// Utilities
import { fetchWithRetry } from './utils/fetchWithRetry';
import './index.css';
import { ApiError } from './utils/ApiError';
import getUserMessage from './utils/getUserMessage';
// Types
import type { TravellerCounts } from './types/TravellerType';


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// Helper functions
// Sends the composed prompt to the backend Gemini endpoint and validates shape.
const callGemini = async (prompt: string) => {
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

// Calculates trip length in nights from two date strings.
const calculateNights = (start: string, end: string) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// Builds the prompt payload used to request guide data from Gemini.
const buildGeminiPrompt = ({
  origin,
  destination,
  departureDate,
  returnDate,
  travellers,
  nights,
  budgetLevel,
  selectedCurrency,
  weatherSummary,
}: {
  origin: string;
  destination: string;
  compareDestination: string;
  departureDate: string;
  returnDate: string;
  travellers: TravellerCounts;
  nights: number;
  budgetLevel: string;
  selectedCurrency: string;
  weatherSummary: string;
}) => {
  return `
    Generate a JSON object describing the trip options for:
      Origin: ${origin}
      Destination: ${destination}
      Departure Date: ${departureDate}
      Return Date: ${returnDate}
      Travellers: ${JSON.stringify(travellers)}
      Trip length in nights: ${nights !== null ? nights : "Not specified"}.
      Budget Level: ${budgetLevel || "not specified"} (low = budget-conscious, medium = balanced, high = comfort-focused).

      Weather Summary: 
        ${weatherSummary
      ? `Real live-weather summary for these dates: ${weatherSummary}.
          Use this when describing outdoor activities, packing tips (e.g. light layers vs. warm clothing), and whether it is better for sun-seeking, mild city exploring, or cooler escapes.`
      : ""
    }
        Use the budget level when describing flight choices, hotels, and packages.

        For example, for low budget focus on economy options and value deals, for high budget highlight comfort, convenience, and premium experiences.

        The JSON must contain (DO NOT include code fences or markdown formatting.):
        - originName
        - destinationName
        - flights (array) {
            airline (string)
            flightNumber (string)
            flightPricePerPerson (number)

            For each flight, calculate totalPrice as:
                totalFlightPrice = flightPricePerPerson * (number of Passengers)
            Return prices in chosen currency: ${selectedCurrency}
        }
        - hotelInfo (string)
        - travelPackages (string)
        - comparisonInfo (string)

        If the trip length is provided, tailor flight, hotel, and package recommendations to that duration (e.g., suitable for a weekend, 7 nights, or a long stay).

        Ensure all prices reflect the selected currency: ${selectedCurrency}.
    `;
};


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
