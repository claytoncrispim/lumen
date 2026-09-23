import FlightCard from './FlightCard';
import InfoSectionCard from './InfoSectionCard';
import formatDate from '../utils/FormatDate';
import WeatherCard from './WeatherCard';
import { Sparkles, Info } from 'lucide-react';
import InfoTooltip from '../utils/InfoTooltip';
import buildGoogleHotelsUrl from '../utils/buildGoogleHotelsUrl';
import buildGooglePackagesUrl from '../utils/buildGooglePackagesUrl';

interface DestinationGuideColumnProps {
    titlePrefix: string;
    guide: any;
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
    weather?: any;
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

    // Derived passenger count used across cards and external search URLs.
    const totalTravellers =
        (travellers?.adults ?? 0) +
        (travellers?.youngAdults ?? 0) +
        (travellers?.children ?? 0) +
        (travellers?.infants ?? 0);

    // Derived trip duration in nights when both dates are valid.
    let nights: number | undefined;
    if (departureDate && returnDate) {
        const departureD = new Date(departureDate);
        const returnD = new Date(returnDate);
        if (!Number.isNaN(departureD.getTime()) && !Number.isNaN(returnD.getTime())) {
            const diffMs = returnD.getTime() - departureD.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays > 0) nights = diffDays;
        }
    }

    // External booking/search URLs.
    const hotelsUrl = buildGoogleHotelsUrl({
        destination: guide.destinationName,
        departureDate,
        returnDate,
        totalTravelers: totalTravellers,
    });

    const packagesUrl = buildGooglePackagesUrl({
        origin: guide.originName,
        destination: guide.destinationName,
        departureDate,
        returnDate,
        nights,
        totalTravelers: totalTravellers,
    });

    return (
        <div className="TODO-DestinationGuideColumn-outter-div">
            {/* Destination header */}
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

            {/* Flight recommendations */}
            {guide?.flights?.length > 0 && (
                <section className="TODO-flights-from-gemini-section">
                    <h4 className="TODO-flights-from-gemini-title">
                        ✈️ Flight options
                        <span className="TODO-flights-from-gemini-count"> *pp (price per person)</span>
                    </h4>
                    <div className="TODO-flights-from-gemini">
                        {guide?.flights?.map((f: any, idx: number) => (
                            <FlightCard
                                key={f.id || `${f.airline}-${f.flightNumber || idx}`}
                                flight={f}
                                selectedCurrency={selectedCurrency}
                                origin={guide?.originName || ""}
                                destination={guide?.destinationName || ""}
                                departureDate={departureDate || ""}
                                returnDate={returnDate || ""}
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

            {/* Comparison insight */}
            {guide?.comparisonInfo && (
                <InfoSectionCard title="What's the best option?" emoji="⚖️">
                    {guide?.comparisonInfo}
                </InfoSectionCard>
            )}
        </div>
    )
};

export default DestinationGuideColumn;