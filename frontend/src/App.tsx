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
const API_BASE_URL = import.meta.env.VITE_RENDER_API_BASE_URL ?? '';

const buildApiUrl = (path: string) => {
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}${path}`;
};

// Helpers
//Gemini API call helper function
interface TripContextPayload {
  origin: string;
  destinationA: string;
  destinationB?: string;
  departureDate: string;
  returnDate: string;
  travellers: TravellerCounts;
  budgetLevel: string;
  currency: string;
  weatherSummary?: string;
}

const DEBUG_CONTEXT_HEADER = 'X-Lumen-Debug-Context';

interface GeminiCallResult {
  guide: GuideResponse;
  debugContext: unknown | null;
}

const callGemini = async (prompt: string, tripContext: TripContextPayload): Promise<GeminiCallResult> => {
  try {
    const res = await fetchWithRetry(
      buildApiUrl('/api/generate-guide/'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          tripContext,
          includeDebugContext: import.meta.env.DEV,
        }),
      }
    );

    const data = await res.json();
    let parsedDebugContext: unknown | null = null;
    if (import.meta.env.DEV) {
      const debugContext = res.headers.get(DEBUG_CONTEXT_HEADER);
      if (debugContext) {
        try {
          parsedDebugContext = JSON.parse(debugContext);
          console.debug('Lumen authoritative context:', parsedDebugContext);
        } catch (error) {
          console.warn('Unable to parse Lumen debug context header.', error);
          parsedDebugContext = debugContext;
        }
      }
    }
    if (!data || typeof data !== "object") {
      throw new Error("UNEXPECTED_RESPONSE_SHAPE");
    }
    return {
      guide: data as GuideResponse,
      debugContext: parsedDebugContext,
    };
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
  compareDestination?: string;
  departureDate: string;
  returnDate: string;
  travellers: TravellerCounts;
  nights: number | null;
  budgetLevel: string;
  selectedCurrency: string;
  weatherSummary: string;
}

interface MoneyAmount {
  currency: string;
  amount: number;
}

interface GuideFlight {
  airline: string;
  flightNumber: string;
  flightPricePerPerson: MoneyAmount;
  totalFlightPrice: MoneyAmount;
}

interface GuideResponse {
  schemaVersion: string;
  query?: {
    currency?: string;
  };
  outputViewA?: {
    destination?: {
      cityName?: string;
      countryName?: string;
    };
    primaryAnchor?: {
      safetyPill?: {
        score?: number;
        level?: string;
      };
    };
    resultsCards?: {
      flights?: GuideFlight[];
    };
    discoveryBlock?: {
      culinaryCompass?: {
        summary?: string;
      };
      nightlife?: {
        summary?: string;
      };
    };
  };
  comparison?: {
    versusPills?: {
      winner?: {
        destination?: 'A' | 'B' | 'none';
        badge?: 'LUMEN_WINNER' | 'NONE';
        reason?: string;
      };
    };
  };
}

interface ResolvedLocation {
  iata_code?: string;
  airport_name?: string;
  city_name?: string;
  country_name?: string;
  country_code?: string;
  safety_score?: number | null;
}

const buildPrompt = ({
  origin,
  destination,
  compareDestination,
  departureDate,
  returnDate,
  travellers,
  nights,
  budgetLevel,
  selectedCurrency,
  weatherSummary,
}: BuildPromptParams) => {
  const totalTravellers =
    travellers.adults +
    travellers.youngAdults +
    travellers.children +
    travellers.infants;
  const currency = (selectedCurrency || 'EUR').toUpperCase();

  return `
    You are generating a travel planner presentation response for Lumen.

    Return ONLY valid JSON (no markdown, no code fences, no extra text).
    Use schemaVersion exactly "1.0.0".
    Do not include keys that are not listed in the contract.

    Trip input:
    - Origin: ${origin}
    - Destination: ${destination}
    ${compareDestination ? `- Comparison destination: ${compareDestination}\n` : ''}
    - Dates: ${formatDate({ dateString: departureDate })} to ${formatDate({ dateString: returnDate })}
    - Travellers: ${JSON.stringify(travellers)}
    - Total travellers: ${totalTravellers}
    - Trip length in nights: ${nights !== null ? nights : "Not specified"}
    - Budget level: ${budgetLevel || "not specified"} (low = budget-conscious, medium = balanced, high = comfort-focused)
    - Currency for all prices: ${currency}
    ${weatherSummary
      ? `- Live weather summary: ${weatherSummary}`
      : ""
    }

    Canonical contract (all required unless marked optional):
    {
      "schemaVersion": "1.0.0",
      "meta": {
        "generatedAt": "ISO-8601 datetime",
        "model": string,
        "provider": string,
        "latencyMs": number,
        "warnings": string[]
      },
      "query": {
        "origin": { "cityName": string, "countryName": string, "countryCode": "AA", "iataCode": "AAA" },
        "destinationA": { "cityName": string, "countryName": string, "countryCode": "AA", "iataCode": "AAA" },
        "destinationB": { "cityName": string, "countryName": string, "countryCode": "AA", "iataCode": "AAA" },
        "dates": { "departureDate": "YYYY-MM-DD", "returnDate": "YYYY-MM-DD", "nights": number>=1 },
        "travellers": {
          "adults": number>=0,
          "youngAdults": number>=0,
          "children": number>=0,
          "infants": number>=0,
          "total": number>=1
        },
        "budgetLevel": "low|medium|high",
        "currency": "ISO-4217 code"
      },
      "outputViewA": {
        "destination": { "cityName": string, "countryName": string, "countryCode": "AA", "iataCode": "AAA" },
        "primaryAnchor": {
          "safetyPill": {
            "score": 0-100,
            "level": "very_low|low|moderate|high|very_high",
            "bulletPoints": {
              "legalStatus": string,
              "socialVibe": string,
              "travelAlerts": string
            },
            "source": string,
            "lastUpdated": "YYYY-MM-DD"
          }
        },
        "resultsCards": {
          "flights": [
            {
              "rank": number>=1,
              "airline": string,
              "flightNumber": string,
              "departureDate": "YYYY-MM-DD",
              "returnDate": "YYYY-MM-DD",
              "flightPricePerPerson": { "currency": "ISO-4217 code", "amount": number>=0 },
              "totalFlightPrice": { "currency": "ISO-4217 code", "amount": number>=0 },
              "stops": number>=0,
              "durationMinutes": number>=1,
              "bookingUrl": string,
              "notes": string
            }
          ],
          "hotels": [
            {
              "name": string,
              "priceRange": string,
              "inclusiveNotes": string,
              "bookingUrl": string,
              "neighborhood": string
            }
          ],
          "packageDeals": [
            {
              "title": string,
              "priceRange": string,
              "inclusions": string[],
              "bookingUrl": string
            }
          ]
        },
        "discoveryBlock": {
          "culinaryCompass": {
            "summary": string,
            "venues": [
              {
                "name": string,
                "category": string,
                "whyRecommended": string,
                "inclusiveSignals": string[],
                "vetted": boolean,
                "source": string
              }
            ]
          },
          "nightlife": {
            "summary": string,
            "venues": [
              {
                "name": string,
                "category": string,
                "whyRecommended": string,
                "inclusiveSignals": string[],
                "vetted": boolean,
                "source": string
              }
            ]
          }
        }
      },
      "comparison": {
        "versusPills": {
          "destinationA": {
            "destination": { "cityName": string, "countryName": string, "countryCode": "AA", "iataCode": "AAA" },
            "safetyScore": 0-100,
            "isWinner": boolean
          },
          "destinationB": {
            "destination": { "cityName": string, "countryName": string, "countryCode": "AA", "iataCode": "AAA" },
            "safetyScore": 0-100,
            "isWinner": boolean
          },
          "winner": {
            "destination": "A|B|none",
            "badge": "LUMEN_WINNER|NONE",
            "reason": string
          }
        },
        "matrix": {
          "destinationA": { "cityName": string, "countryName": string, "countryCode": "AA", "iataCode": "AAA" },
          "destinationB": { "cityName": string, "countryName": string, "countryCode": "AA", "iataCode": "AAA" },
          "metrics": {
            "price": { "a": 0-100, "b": 0-100, "winner": "A|B|tie", "rationale": string },
            "safety": { "a": 0-100, "b": 0-100, "winner": "A|B|tie", "rationale": string },
            "culinary": { "a": 0-100, "b": 0-100, "winner": "A|B|tie", "rationale": string },
            "nightlife": { "a": 0-100, "b": 0-100, "winner": "A|B|tie", "rationale": string },
            "overallValue": { "a": 0-100, "b": 0-100, "winner": "A|B|tie", "rationale": string }
          }
        }
      }
    }

    Rules:
    - If no comparison destination is provided, still include destinationB by mirroring destinationA and set winner.destination to "none" with badge "NONE".
    - Set travellers.total exactly to ${totalTravellers}.
    - Set totalFlightPrice.amount = flightPricePerPerson.amount * ${totalTravellers}.
    - All monetary values must use currency ${currency}.
    - Keep recommendations aligned with budget level for flights, hotels, and packages.
    - If nights are provided, tailor recommendations to that trip duration.
    - If weather summary is provided, reflect it in activity suggestions and packing guidance.
    `;
};

// Flight price calculation helper function (to be implemented next)
const getCheapestFlightPrice = (guide: GuideResponse | null) => {
  const flights = guide?.outputViewA?.resultsCards?.flights;
  if (!flights || flights.length === 0) {
    return null;
  }

  let min: number | null = null;
  for (const flight of flights) {
    const price = flight?.totalFlightPrice?.amount;
    if (typeof price === 'number' && !Number.isNaN(price)) {
      if (min === null || price < min) {
        min = price;
      }
    }
  }

  return min;
};

const resolveLocation = async (query: string): Promise<ResolvedLocation | null> => {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) return null;

  const res = await fetchWithRetry(
    buildApiUrl(`/api/locations/resolve/?query=${encodeURIComponent(trimmedQuery)}`)
  );

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0] as ResolvedLocation;
};

// Weather fetcher helper
const fetchWeatherForDestination = async (destination: string) => {
  if (!destination) return null;

  try {
    const res = await fetchWithRetry(
      buildApiUrl(`/api/weather/${encodeURIComponent(destination.trim())}/`)
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
  const [error, setError] = useState<string | null>(null);

  // Guide data state
  const [guideData, setGuideData] = useState<GuideResponse | null>(null);
  const [debugContextData, setDebugContextData] = useState<unknown | null>(null);

  // Weather state
  const [weatherPrimary, setWeatherPrimary] = useState<any>(null);
  const [weatherSecondary, setWeatherSecondary] = useState<any>(null);

  const handleGetGuide = async () => {
    if (!origin || !destination || !departureDate || !returnDate) {
      setError('Please complete the required trip details before searching.');
      return;
    }

    setLoading(true);
    setError(null);
    setDebugContextData(null);

    try {
      const resolvedDestination = await resolveLocation(destination);
      const resolvedOrigin = await resolveLocation(origin);
      const finalDestination = resolvedDestination?.city_name || destination;
      const finalOrigin = resolvedOrigin?.city_name || origin;

      const resolvedCompareDestination = compareDestination
        ? await resolveLocation(compareDestination)
        : null;
      const finalCompareDestination = resolvedCompareDestination?.city_name || compareDestination || '';

      const weatherSummary = await fetchWeatherForDestination(finalDestination);
      const weatherHeadline = weatherSummary?.summary?.headline || weatherSummary?.summary || '';

      const compareWeather = finalCompareDestination
        ? await fetchWeatherForDestination(finalCompareDestination)
        : null;

      const prompt = buildPrompt({
        origin: finalOrigin,
        destination: finalDestination,
        compareDestination: finalCompareDestination,
        departureDate,
        returnDate,
        travellers,
        nights: calculateNights(departureDate, returnDate),
        budgetLevel,
        selectedCurrency,
        weatherSummary: weatherHeadline,
      });

      const { guide, debugContext } = await callGemini(prompt, {
        origin,
        destinationA: destination,
        destinationB: compareDestination || undefined,
        departureDate,
        returnDate,
        travellers,
        budgetLevel,
        currency: (selectedCurrency || 'EUR').toUpperCase(),
        weatherSummary: weatherHeadline || undefined,
      });
      setGuideData(guide);
      setDebugContextData(debugContext);
      setWeatherPrimary(weatherSummary);
      setWeatherSecondary(compareWeather);
    } catch (err) {
      console.error('Guide generation failed:', err);
      setDebugContextData(null);
      setError(err instanceof Error ? err.message : 'Unable to generate the travel guide.');
    } finally {
      setLoading(false);
    }
  };

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
            handleGetGuide={handleGetGuide}
            loading={loading}
            loadingLabel={loadingLabel}
          />
        </div>

        {error && (
          <div className="TODO-error-banner" role="alert">
            {error}
          </div>
        )}

        {weatherPrimary && (
          <section className="TODO-weather-summary">
            <h3>Weather for {destination || 'your destination'}</h3>
            <p>{weatherPrimary?.summary?.headline || weatherPrimary?.summary || 'Weather available.'}</p>
          </section>
        )}

        {weatherSecondary && (
          <section className="TODO-weather-summary">
            <h3>Comparison weather for {compareDestination || 'your compare destination'}</h3>
            <p>{weatherSecondary?.summary?.headline || weatherSecondary?.summary || 'Weather available.'}</p>
          </section>
        )}

        {guideData && (
          <section className="TODO-guide-summary">
            <h3>Travel guide preview</h3>
            <p>
              Destination: {guideData?.outputViewA?.destination?.cityName || 'Unknown'}{guideData?.outputViewA?.destination?.countryName ? `, ${guideData.outputViewA.destination.countryName}` : ''}
            </p>
            <p>
              Safety Pill: {
                guideData?.outputViewA?.primaryAnchor?.safetyPill?.score != null
                  ? `${guideData.outputViewA.primaryAnchor.safetyPill.score}/100 (${guideData.outputViewA.primaryAnchor.safetyPill.level || 'n/a'})`
                  : 'Not available yet'
              }
            </p>
            <p>
              Cheapest flight option: {
                getCheapestFlightPrice(guideData) !== null
                  ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: guideData?.query?.currency || selectedCurrency || 'EUR',
                    maximumFractionDigits: 0,
                  }).format(getCheapestFlightPrice(guideData) as number)
                  : 'Not available yet'
              }
            </p>
            <p>
              Winner badge: {
                guideData?.comparison?.versusPills?.winner?.badge === 'LUMEN_WINNER'
                  ? `${guideData?.comparison?.versusPills?.winner?.destination || ''} (${guideData?.comparison?.versusPills?.winner?.reason || 'No reason provided'})`
                  : 'No winner (single destination or tie)'
              }
            </p>
            <p>
              Culinary Compass: {guideData?.outputViewA?.discoveryBlock?.culinaryCompass?.summary || 'Not available yet'}
            </p>
            <p>
              Nightlife: {guideData?.outputViewA?.discoveryBlock?.nightlife?.summary || 'Not available yet'}
            </p>
            <pre>{JSON.stringify(guideData, null, 2)}</pre>
          </section>
        )}
        {import.meta.env.DEV && debugContextData && (
          <section className="TODO-guide-summary">
            <details>
              <summary>Debug Context (dev only)</summary>
              <pre>{JSON.stringify(debugContextData, null, 2)}</pre>
            </details>
          </section>
        )}

      </main>
    </div>


  )
}

export default App
