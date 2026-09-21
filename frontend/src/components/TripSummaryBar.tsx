import formatDate from "../utils/FormatDate";


interface TripSummaryBarProps {
    origin: string;
    destination: string;
    departureDate?: string;
    returnDate?: string;
    travellers: {
        adults?: number;
        youngAdults?: number;
        children?: number;
        infants?: number;
    };
    budgetLevel: string;
    onChangeTrip: () => void;
    isSaved: boolean;
}

const TripSummaryBar: React.FC<TripSummaryBarProps> = ({
    origin,
    destination,
    departureDate,
    returnDate,
    travellers,
    budgetLevel,
    onChangeTrip,
    isSaved = false,
}) => {
    const totalTravellers =
        (travellers?.adults ?? 0) +
        (travellers?.youngAdults ?? 0) +
        (travellers?.children ?? 0) +
        (travellers?.infants ?? 0);

    const budgetLabel =
        budgetLevel === "low"
            ? "Budget"
            : budgetLevel === "high"
                ? "Comfort"
                : "Balanced";

    return (
        <section className="TODO-trip-summary-bar">
            <div className="TODO-trip-summary-bar-content">
                {/* Left section: Trip details */}
                <div>
                    <p className="TODO-trip-summary-bar-suggestion-p">
                        Suggested trip
                    </p>
                    <p className="TODO-trip-summary-bar-origin-destination-p">
                        {origin
                            ? `${origin} → ${destination}`
                            : destination
                        }
                    </p>
                    <p className="TODO-trip-summary-bar-dates-p">
                        <span className="TODO-trip-summary-bar-departure-span">
                            {departureDate ? formatDate({ dateString: departureDate }) : "Flexible start"}
                        </span>{" "}
                        –{" "}
                        <span className="TODO-trip-summary-bar-return-span">
                            {returnDate ? formatDate({ dateString: returnDate }) : "Flexible end"}
                        </span>{" "}
                        . {totalTravellers} traveller{totalTravellers !== 1 ? "s" : ""}
                        . {" "}
                        {budgetLabel}
                    </p>
                </div>

                {/* Right section: Action buttons or additional info */}
                <div className="TODO-trip-summary-bar-actions">
                    {isSaved && (
                        <span className="TODO-trip-summary-bar-saved-indicator">
                            <span>★</span>
                            <span>Saved</span>
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={onChangeTrip}
                        className="TODO-trip-summary-bar-change-trip-button"
                    >
                        Change Trip
                    </button>
                </div>
            </div>
        </section>
    );
};

export default TripSummaryBar;
