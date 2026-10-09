// Main application entry point for the Lumen Gemini API Client.
import { useState, useRef } from 'react'
// Components
import CurrencySelector from './components/CurrencySelector';
import SearchForm from './components/SearchForm';
import './index.css';
// Types
import type { TravellerCounts } from './types/TravellerType';
import { fetchWithRetry } from './utils/fetchWithRetry';
import { ApiError } from './utils/ApiError';
import formatDate from './utils/FormatDate';

// Base URL for Render backend (To be configured)
const API_BASE_URL = import.meta.env.VITE_RENDER_API_BASE_URL;


// Helpers
//Gemini API call helper function
const callGemini = async (prompt: string) => {
  try {
    const res = await fetchWithRetry(
      `${API_BASE_URL}/generatre-guide`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      }
    );

    const data = await res.json();
    if (!data || typeof data !== "object") {
      throw new Error("UNEXPECTED_RESPONSE_SHAPE");
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    throw err;
  }

}

// Nights calculation helper function
const calculateNights = (start: string, end: string): number | null => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
};


// Prompt builder helper interface and function
interface BuildPromptParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travellers: TravellerCounts;
  nights: number | null;
  budgetLevel: string;
  selectedCurrency: string;
  weatherSummary: string;
}

const buildPrompt = ({
  origin,
  destination,
  departureDate,
  returnDate,
  travellers,
  nights,
  budgetLevel,
  selectedCurrency,
  weatherSummary,
}: BuildPromptParams) => {
  return `
    You are generating a travel guide response.

    Return ONLY valid JSON (no markdown, no code fences, no extra text).

    Trip input:
    - Origin: ${origin}
    - Destination: ${destination}
    - Dates: ${formatDate({ dateString: departureDate })} to ${formatDate({ dateString: returnDate })}
    - Travellers: ${JSON.stringify(travellers)}
    - Trip length in nights: ${nights !== null ? nights : "Not specified"}
    - Budget level: ${budgetLevel || "not specified"} (low = budget-conscious, medium = balanced, high = comfort-focused)
    - Currency for all prices: ${selectedCurrency}
    ${weatherSummary
      ? `- Live weather summary: ${weatherSummary}`
      : ""
    }

    Output JSON schema (required keys):
    {
      "originName": string,
      "destinationName": string,
      "flights": [
        {
          "airline": string,
          "flightNumber": string,
          "flightPricePerPerson": number,
          "totalFlightPrice": number
        }
      ],
      "hotelInfo": string,
      "travelPackages": string,
      "comparisonInfo": string,
      "imageGenPrompt": string
    }

    Rules:
    - Set totalFlightPrice = flightPricePerPerson * total number of travellers.
    - All monetary values must be in ${selectedCurrency}.
    - Keep recommendations aligned with budget level for flights, hotels, and packages.
    - If nights are provided, tailor recommendations to that trip duration.
    - If weather summary is provided, reflect it in activity suggestions and packing guidance.
    `;
};

// Flight price calculation helper function (to be implemented next)
const getCheapestFlightPrice = (guide: any) => {
  if (!guide || !Array.isArray(guide.flights) || guide.flights.length === 0) {
    return null;
  }
  
  let min  = null;
  for (const f of guide.flights) {
    // Try a bunch of possible fields Gemini might use
    let raw = 
        f.totalFlightPrice ??
        f.totalPriceEUR ??
        f.totalPrice ??
        f.flightTotalPrice ??
        f.flightPrice ??
        f.flightPricePerPerson ??
        f.priceEUR ??
        f.price ??
        null;
    
    let price = null;

    if (typeof raw === "number") {
      price = raw;
    } else if (typeof raw === "string") {
      // Strip currency symbols and text, keep digits / separators
      const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        price = parsed;
      }
    }

    if (typeof price === "number" && !isNaN(price)) {
      if (min === null || price < min) {
        min = price;
      }
    }    
  }

  return min;
};

// Weather fetcher helper
const fetchWeatherForDestination = async (destination: string) => {
  if (!destination) return null;

  try {
    const res = await fetchWithRetry(
      `${API_BASE_URL}/weather?destination=${encodeURIComponent(
        destination
      )}`
    );
    
    const data = await res.json();
    return data;   
  } catch (err) {
    if (err instanceof ApiError) {
      console.warn("Weather API error:", err.status, err.code, err.message);
    } else {
      console.warn("Weather fetch failed:", err);
    }
    return null;
  }
};




// Main application component. Currently a placeholder for future UI development.
function App() {
  // Search form inputs
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

  // Request and feedback state
  const [loading, setLoading] = useState(false);
  const [loadingLabel] = useState('Loading...');
  const [error, setError] = useState(null);

  // Guide data state
  const [guideData, setGuideData] = useState(null);
  const [guideDataSecondary, setGuideDataSecondary] = useState(null);

  // Saved trips state
  const [savedTrip, setSavedTrip] = useState([]);

  // Weather state
  const [weatherPrimary, setWeatherPrimary] = useState(null);
  const [weatherSecondary, setWeatherSecondary] = useState(null);

  // Per-section loading flags
  const [componentsLoading, setComponentsLoading] = useState({
    weatherPrimary: false,
    weatherSecondary: false,
    airport: false,
    flightsA: false,
    flightsB: false,
    guidePrimary: false,
    guideSecondary: false,
  });

  // Refs
  const searchFormRef = useRef<HTMLDivElement>(null);

  return (
    <div className="App">
      <header className="app-navbar">
        <div className="app-brand-lockup">
          <h1 className="app-brand">Lumen</h1>
          <p className="app-brand-tagline">Travel Decision Engine</p>
        </div>
        <CurrencySelector
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
        />

        {/* Language Selector (To be implemented) */}
        {/* Beta Badge (To be implemented) */}
      </header>

      <main className="app-main">
        <p className="TODO-description">
          This is a placeholder for the main application interface. Future UI components will be added here.
        </p>

        {/* Trip Summary Bar (To be implemented) */}
        {/* Saved Trips (To be implemented) */}
        {/* Save Trip button (To be implemented) */}

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

        {/* Helper tip - only before the first result is displayed and when there is no error */}



      </main>
    </div>


  )
}

export default App
