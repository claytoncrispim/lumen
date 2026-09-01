import { Plane, ArrowRight, Info } from "lucide-react";
import currencyFormatter from "../utils/currencyFormatter";
import buildGoogleFlightsUrl from "../utils/buildGoogleFlightsUrl";

// --- COMPONENT ---
/**
 * Flight card component to display flight details.
 * 
 * Props:
 * - flight: Object containing flight data
 * - selectedCurrency: Currency code for price display
 * - origin: Origin location string
 * - destination: Destination location string
 * - departureDate: Departure date string
 * - returnDate: Return date string
 * - totalTravellers: Total number of travellers
 * 
 * Returns:
 * - JSX.Element: Rendered flight card component.
 */

interface FlightCardProps {
    flight: string;    
    selectedCurrency: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    totalTravellers: number;    
}

interface FlightData {
    flight?: string;
    airline?: string;
    flightNumber?: string;
    flightPrice?: number;
    priceEUR?: number;
    price?: number;
    flightPricePerPerson?: number;
    departureAirport?: string;
    arrivalAirport?: string;
    departureTime?: string;
    arrivalTime?: string;
    from?: string;
    to?: string;
    duration?: string;
    detail?: string;
    layoverCity?: string;
    layoverAirport?: string;
    bookingLink?: string;
}

interface PriceData {
    totalPrice?: number;
    totalPriceEUR?: number;
}

export const FlightCard: React.FC<FlightCardProps> = ({
    flight,    
    selectedCurrency,
    origin,
    destination,
    departureDate,
    returnDate,
    totalTravellers,
}) => {
    if (!flight) return null;

    console.log("FlightCard Google URL params:", {
        originName: origin,
        destinationName: destination,
        departureDate,
        returnDate,
        totalPassengers: totalTravellers,
        flight
    });

    const googleFlightsUrl = buildGoogleFlightsUrl(
        origin, 
        destination, 
        departureDate, 
        returnDate, 
        totalTravellers,
        flight
    );

    // Support both older and newer field names from Gemini
    const price = 
        (flight as FlightData).flightPrice ??
        (flight as FlightData).priceEUR ??
        (flight as FlightData).price ??
        (flight as FlightData).flightPricePerPerson ??
        0;
    
    const totalPrice =         
        (flight as PriceData).totalPrice ??
        (flight as PriceData).totalPriceEUR ??
        0;    

    const formattedPrice = currencyFormatter("en-US", selectedCurrency, price);
    const formattedTotalPrice = currencyFormatter("en-US", selectedCurrency, totalPrice);

    const hasTimes = (flight as FlightData).departureTime && (flight as FlightData).arrivalTime;

    return (
        <article className="TODO-style-flight-card">
            {/* Airline + routes + prices */}
            <header className="TODO-style-flight-card-header">
                <div className="TODO-style-flight-card-airline">
                    <div className="TODO-style-flight-card-airline-icon">
                        <Plane className="TODO-style-flight-card-airline-icon-plane" size={24} />
                    </div>
                    <div>
                        <h4 className="TODO-style-flight-card-airline-name-text">
                            {(flight as FlightData).airline || 'Flight Option'}
                        </h4>
                        {/* Flight Number */}
                        <p className="TODO-style-flight-card-airline-flight-text">
                            {(flight as FlightData).flight && <>Flight {(flight as FlightData).flight}</>}            
                        </p>
                    </div>
                </div>

                {/* Price section */}
                {price != null && (
                    <div className="TODO-style-flight-card-price">
                        <p className="TODO-style-flight-card-price-text">
                            From
                        </p>
                        <p className="TODO-style-flight-card-price-value">
                            {formattedPrice} / per person
                        </p>
                        {totalPrice != null && (
                            <p className="TODO-style-flight-card-price-total">
                                Total: {formattedTotalPrice}
                            </p>
                        )}
                    </div>
                )}            
            </header>

            {/* Flight time, duration and stops */}
            {hasTimes && (
                <>
                    <div className="TODO-style-flight-card-times">
                        <div className="TODO-style-flight-card-time">
                            <span className="TODO-style-flight-card-time-label">
                                Departure
                            </span>
                            <span className="TODO-style-flight-card-time-value">
                                {(flight as FlightData).departureTime}
                            </span>
                        </div>
                        <ArrowRight className="TODO-style-flight-card-time-arrow" size={24} />
                        <div className="TODO-style-flight-card-time">
                            <span className="TODO-style-flight-card-time-label">
                                Arrival
                            </span>
                            <span className="TODO-style-flight-card-time-value">
                                {(flight as FlightData).arrivalTime}
                            </span>
                        </div>
                    </div>
                    {(flight as FlightData).duration && (
                        <span className="TODO-style-flight-card-duration">
                            Duration: {(flight as FlightData).duration}
                        </span>
                    )}
                </>
            )}

            {((flight as FlightData).detail || (flight as FlightData).layoverCity || (flight as FlightData).layoverAirport) && (
                <>
                    {(flight as FlightData).detail && <span>{(flight as FlightData).detail}</span>}
                    {((flight as FlightData).layoverCity || (flight as FlightData).layoverAirport) && (
                        <p className="TODO-style-flight-card-extra-details">
                            {(flight as FlightData).layoverCity && <span>Layover City: {(flight as FlightData).layoverCity}</span>}
                            {(flight as FlightData).layoverAirport && <span>Layover Airport: {(flight as FlightData).layoverAirport}</span>}
                        </p>
                    )}
                </>
            )}

            {/* Booking and search actions */}
            <div className="TODO-style-flight-card-actions">
                <div>
                    {(flight as FlightData).bookingLink && (
                        <a
                            href={(flight as FlightData).bookingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="TODO-style-flight-card-booking-link"
                        >
                            View deal
                            <ArrowRight size={14} />
                        </a>
                    )}
                    <a
                        href={googleFlightsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="TODO-style-flight-card-google-flights-link"
                    >
                        Search on Google Flights                        
                    </a>
                </div>

                <span className="TODO-style-flight-card-external-site-note">
                    Opens external site in a new tab
                </span>
                
                {/* Tooltip trigger */}
                <div className="TODO-style-flight-card-tooltip-trigger">
                    <button
                        className="TODO-style-flight-card-tooltip-button"
                        aria-label="How this Google Flights link works"
                        // title="We pre-fill your route, dates and travellers where possible. Google Flights may still adjust details based on your location and availability."
                    >
                        <Info size={14} />
                    </button>

                    {/* Tooltip bubble */}
                    <div className="TODO-style-flight-card-tooltip-bubble">
                        We pre-fill your route, dates and travellers where possible. Google Flights may still adjust details based on your location and availability.
                    </div>
                </div>
            </div>
        </article>
    );
};