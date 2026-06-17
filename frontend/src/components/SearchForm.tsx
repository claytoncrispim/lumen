import { useState} from "react";
import TravellerSelector from "./TravellerSelector";

// --- COMPONENT ---
/**
 * Search bar component for flight planning.
 * 
 * Props:
 * - origin: Origin location string.
 * - setOrigin: Function to update origin.
 * - destination: Destination location string.
 * - setDestination: Function to update destination.
 * - compareDestination: Optional second destination for comparison.
 * - setCompareDestination: Function to update compare destination.
 * - departureDate: Departure date string.
 * - setDepartureDate: Function to update departure date.
 * - returnDate: Return date string.
 * - setReturnDate: Function to update return date.
 * - passengers: Object with passenger counts (adults, youngAdults, children, infants).
 * - setPassengers: Function to update passenger counts.
 * - budgetLevel: Selected budget level string.
 * - setBudgetLevel: Function to update budget level.
 * - handleGetGuide: Function to handle form submission.
 * - loading: Boolean indicating if data is being loaded.
 * 
 * Returns:
 * - JSX.Element: Rendered search bar component.
 */

interface SearchFormProps {
    origin: string;
    setOrigin: (value: string) => void;
    destination: string;
    setDestination: (value: string) => void;
    compareDestination: string;
    setCompareDestination: (value: string) => void;
    departureDate: string;
    setDepartureDate: (value: string) => void;
    returnDate: string;
    setReturnDate: (value: string) => void;
    travellers: {
        adults: number;
        youngAdults: number;
        children: number;
        infants: number;
    };
    setTravellers: (value: {
        adults: number;
        youngAdults: number;
        children: number;
        infants: number;
    }) => void;
    budgetLevel: string;
    setBudgetLevel: (value: string) => void;
    handleGetGuide: () => void;
    loading: boolean;
    loadingLabel: string;
}


interface NewTravellers {
    adults: number;
    youngAdults: number;
    children: number;
    infants: number;
}

function SearchForm({
    origin,
    setOrigin,
    destination,
    setDestination,
    compareDestination,
    setCompareDestination,
    departureDate,
    setDepartureDate,
    returnDate,
    setReturnDate,
    travellers,
    setTravellers,
    budgetLevel,
    setBudgetLevel,
    handleGetGuide,
    loading,
    loadingLabel
}: SearchFormProps) {
    // State to control the dropdown visibility of the TravellerSelector component
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const BUDGET_OPTIONS = [
        { value: 'low', label: 'Budget' },
        { value: 'medium', label: 'Balanced' },
        { value: 'high', label: 'Comfort' },
    ];

    const handleBudgetSelection = (value: string) => {
        if (typeof setBudgetLevel === 'function') {
            setBudgetLevel(value);
        }
    };

    const handleApplyTravellers = (newTravellers: NewTravellers) => {
        setTravellers(newTravellers);
    }

    const totalTravellers = 
    travellers.adults +
    travellers.youngAdults +
    travellers.children +
    travellers.infants;

    const travellerSummary = `${totalTravellers} Traveller${
        totalTravellers !== 1 ? 's' : ''
    }`;

    return (
        <section className="TODO-search-form">
            <div className="TODO-form-container">
                {/* Header inside card */}
                <div className="TODO-form-header">
                    <div>
                        <h2 className="TODO-form-title">Plan Your Trip</h2>
                        <p className="TODO-form-subtitle">Find the best travel options for your journey.</p>
                    </div>
                </div>

                {/* Form Fields */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleGetGuide();
                    }}
                    className="TODO-form-fields"
                >
                    {/* Origin Input */}
                    <div className="TODO-form-field">
                        <label htmlFor="origin">Origin</label>
                        <input
                            type="text"
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                            placeholder="Enter origin"
                            id="origin"
                            required
                            className="TODO-input"
                        />
                    </div>

                    {/* Destination Input */}
                    <div className="TODO-form-field">
                        <label htmlFor="destination">Destination A</label>
                        <input
                            type="text"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="Enter destination"
                            id="destination"
                            required
                            className="TODO-input"
                        />
                    </div>

                    {/* Compare Destination Input (optional to the USER not the PROP) */}
                    <div className="TODO-form-field">
                        <label htmlFor="compareDestination">Destination B (optional)</label>
                        <input
                            type="text"
                            value={compareDestination}                            
                            onChange={(e) => setCompareDestination(e.target.value)}
                            placeholder="Enter compare destination"
                            id="compareDestination"
                            className="TODO-input"
                        />
                    </div>

                    {/* Departure Date Input */}
                    <div className="TODO-form-field">
                        <label htmlFor="departureDate" className="TODO-label">Departure Date</label>
                        <input
                            type="date"
                            value={departureDate}
                            onChange={(e) => setDepartureDate(e.target.value)}
                            id="departureDate"
                            className="TODO-input"
                        />
                    </div>

                    {/* Return Date Input */}
                    <div className="TODO-form-field">
                        <label htmlFor="returnDate" className="TODO-label">Return Date</label>
                        <input
                            type="date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            id="returnDate"
                            className="TODO-input"
                        />
                    </div>

                    {/* Travellers Selector */}
                    <div className="TODO-form-field">
                        <label htmlFor="travellers" className="TODO-label">Travellers</label>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="TODO-traveller-button"
                        >
                            {travellerSummary}
                        </button>
                        {isDropdownOpen && (
                            <TravellerSelector
                                initialTravellers={travellers}                                
                                onApply={handleApplyTravellers}
                                onClose={() => setIsDropdownOpen(false)}
                            />
                        )}
                    </div>

                    {/* Budget Level Selector */}
                    <div className="TODO-form-field">
                        <label htmlFor="budgetLevel" className="TODO-label">Budget</label>
                        <div className="TODO-budget-options">
                            {BUDGET_OPTIONS.map((option) => {
                                const isActive = budgetLevel === option.value;
                                return(
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleBudgetSelection(option.value)}
                                            className={[
                                                'TODO-budget-button', 
                                                isActive 
                                                ? 'TODO-active' 
                                                : 'TODO-inactive'
                                            ].join(' ')}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })
                            }
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="TODO-form-field">
                        <button
                            type="submit"
                            disabled={loading}
                            className="TODO-submit-button"
                        >
                            {loading ? (loadingLabel || "Exploring options...") : "Find destination"}
                        </button>
                    </div>
                </form>
            </div>
        </section>                    
    );
}

export default SearchForm;