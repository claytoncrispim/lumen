import { useState } from 'react';
import FlightCard from './FlightCard';
import InfoSectionCard from './InfoSectionCard';
import formatDate from '../utils/FormatDate';
import WeatherCard from './WeatherCard';
import { Sparkles, Info } from 'lucide-react';
import InfoTooltip from '../utils/InfoTooltip';
import currencyFormatter from '../utils/currencyFormatter';
import buildGoogleHotelUrl from '../utils/buildGoogleHotelUrl';
import buildGooglePackagesUrl from '../utils/buildGooglePackagesUrl';

// --- COMPONENT ---
/**
 * A column displaying a destination guide with flights, hotels, packages, and comparison info.
 *
 * Props:
 * - titlePrefix: A string prefix for the title (e.g., "Recommended Trip")
 * - guide: An object containing destination guide data
 * - departureDate: The departure date as a string (optional)
 * - returnDate: The return date as a string (optional)
 * - selectedCurrency: The selected currency code (e.g., "USD")
 * - travellers: An object with passenger counts (adults, youngAdults, children, infants)
 * - showHeader: Boolean to control header visibility (default: true)
 * - isBestValue: Boolean to indicate if this destination is the best value (default: false)
 * - weather: An object containing live weather data (optional)
 *
 * Returns:
 * - TSX.Element: The rendered destination guide column component.
 */

interface DestinationGuideColumnProps {
    titlePrefix: string;
    guide: any; // Replace 'any' with the actual type of the guide object
    departureDate?: string;
    returnDate?: string;
    selectedCurrency: string;
    travellers: {
        adults: number;
        youngAdults: number;
        children: number;
        infants: number;
    };
    showHeader?: boolean;
    isBestValue?: boolean;
    weather?: any; // Replace 'any' with the actual type of the weather object
}

const DestinationGuideColumn = ({
    titlePrefix,
    guide,
    departureDate,
    returnDate,
    selectedCurrency,
    travellers,
    showHeader = true,
    isBestValue = false,
    weather,
}: DestinationGuideColumnProps) => {

    if (!guide) return null;

    const totalTravellers =
        (travellers?.adults ?? 0) + // adults or 0 if undefined
        (travellers?.youngAdults ?? 0) + // young adults or 0 if undefined
        (travellers?.children ?? 0) + // children or 0 if undefined
        (travellers?.infants ?? 0); // infants or 0 if undefined

    // Calculate the number of nights (if both are valid dates)
    let nights: number | null = null;
    if (departureDate && returnDate) {
        const departureD = new Date(departureDate);
        const returnD = new Date(returnDate);
        if (!Number.isNaN(departureD.getTime()) && !Number.isNaN(returnD.getTime())) {
            const diffMs = returnD.getTime() - departureD.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays > 0) nights = diffDays;
        }
    }

    // Build accomodation package URLs with the helpers
    const hotelsUrl = buildGoogleHotelUrl({
        destinationName: guide.destinationName,
        departureDate,
        returnDate,
        totalTravellers,
    });

    const packagesUrl = buildGooglePackageUrl({
        originName: guide.originName,
        destinationName: guide.destinationName,
        departureDate,
        returnDate,
        nights,
        totalTravellers,
    });

    return (
        <div className="TODO-DestinationGuideColumn-outter-div">
            {/* Destination Header */}
            {showHeader && (
                <div className="TODO-DestinationGuideColumn-header-outter-div">
                    <div className="TODO-DestinationGuideColumn-header-inner-div">
                        <div>
                            <p className="TODO-title-prefix">
                                {titlePrefix}
                            </p>
                            <h3 className="TODO-origin-name">
                                {guide.originName
                                    ? `${guide.originName} → ${guide.destinationName}`
                                    : guide.destinationName
                                }
                            </h3>
                            {departureDate && returnDate && (
                                <p className="TODO-dates">
                                    {formatDate({ dateString: departureDate })} - {formatDate({ dateString: returnDate })}
                                </p>
                            )}
                        </div>

                        {isBestValue && (
                            <div className="TODO-best-value">
                                {/* Best value badge or indicator goes here */}
                                <div className="TODO-best-value-badge">
                                    <Sparkles size={12} className="TODO-sparkles-icon" />
                                    <span>Best value</span>

                                    <button
                                        type="button"
                                        className="TODO-best-value-button"
                                        aria-label="What does Best value mean?"
                                    >
                                        <Info size={11} />
                                    </button>
                                </div>

                                {/* Tooltip */}
                                <div className="TODO-best-value-tooltip">
                                    <p className="TODO-best-value-tooltip-title">How we pick "Best value"</p>
                                    <p className="TODO-best-value-tooltip-content">
                                        We compare the lowest total flight price returned for each destination.
                                        The destination with the cheaper flight price gets the "Best value" badge.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Flights from Gemini */}
            {guide?.flights?.length > 0 && (
                <section className="TODO-flights-from-gemini-section">
                    <h4 className="TODO-flights-from-gemini-title">
                        ✈️ Flight options
                        <span className="TODO-flights-from-gemini-count"> *pp (price per person)</span>
                    </h4>
                    <div className="TODO-flights-from-gemini">
                        {/* Render flight details here */}
                        {guide?.flights?.map((f: any, idx: number) => (
                            <FlightCard
                                key={f.id || `${f.airline}-${f.flightNumber || idx}`}
                                flight={f}
                                selectedCurrency={selectedCurrency}
                                originName={guide?.originName || origin || ""}
                                destinationName={guide?.destinationName || ""}
                                departureDate={departureDate}
                                returnDate={returnDate}
                                totalTravellers={totalTravellers}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Live weather */}
            {weather && <WeatherCard weather={weather} />}

            {/* Hotels */}
            {guide?.hotelInfo && (
                <div className="TODO-hotels-section">
                    <InfoSectionCard title="Where to stay" emoji="🏨" >
                        {guide?.hotelInfo}
                        <div className="TODO-hotel-info">
                            <a
                                href={hotelsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="TODO-hotel-link"
                            >
                                Search hotels in {guide?.destinationName}
                            </a>
                            <span className="TODO-hotel-note">
                                *Prices are subject to change
                                (Booking.com)
                            </span>
                            <InfoTooltip label="How the hotel search link works">
                                We open a generic hotel search for {guide.destinationName}.
                                You can adjust dates, guests and filters directly on the booking site.
                            </InfoTooltip>
                        </div>
                    </InfoSectionCard>
                </div>
            )}

            {/* Packages */}
            {guide?.travelPackages && (
                <div className="TODO-packages-section">
                    <InfoSectionCard title="Travel Packages" emoji="🧳">
                        {guide?.travelPackages}
                        <div className="TODO-travel-packages">
                            <a
                                href={packagesUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="TODO-travel-packages-link"
                            >
                                Search travel packages for {guide?.destinationName}
                            </a>
                            <span className="TODO-travel-packages-note">
                                *Prices are subject to change
                                (External package providers)
                            </span>
                            <InfoTooltip label="How the travel packages search link works">
                                We open a generic travel packages search for {guide.destinationName}.
                                Results and availability depend on each travel provider.
                            </InfoTooltip>
                        </div>
                    </InfoSectionCard>
                </div>
            )}

            {/* Comparison Mode */}
            {guide?.comparisonInfo && (
                <InfoSectionCard title="What's the best option?" emoji="⚖️">
                    {guide?.comparisonInfo}
                </InfoSectionCard>              
            )}
        </div>
    )
};

export default DestinationGuideColumn;