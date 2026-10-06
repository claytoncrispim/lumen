import { useState, useEffect } from 'react';
import transformedData from '../data/CurrencyData';
import type { CurrencyOption } from '../types/CurrencyType';

/**
 * Currency selector fed by pre-normalized currency options.
 * Uses concrete class hooks so it can share the app neon theme.
 */
interface CurrencySelectorProps {
    selectedCurrency: string;
    onCurrencyChange: (code: string) => void;
}

const CurrencySelector = ({ selectedCurrency, onCurrencyChange }: CurrencySelectorProps) => {
    const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        try {
            if (Array.isArray(transformedData)) {
                setCurrencies(transformedData);
                // Default to the first currency when nothing is selected yet.
                if (!selectedCurrency && transformedData.length > 0) {
                    onCurrencyChange(transformedData[0].code);
                }

            } else {
                setCurrencies([]);
                console.warn('Transformed currency data is not an array:', transformedData);
            }
        } catch (error) {
            setCurrencies([]);
            console.error('Error loading currencies:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCurrency, onCurrencyChange]);

    if (isLoading) {
        return <div className="currency-selector-status">Loading currencies...</div>;
    }

    if (currencies.length === 0) {
        return <div className="currency-selector-status">No currencies available.</div>;
    }

    return (
        <div className="currency-select-wrap">
            <select
                value={selectedCurrency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                data-style-hook="currency-select"
                className="currency-select"
                aria-label="Select currency"
            >
                {currencies.map((currency) => (
                    <option
                        key={currency.code}
                        value={currency.code}
                        data-style-hook="currency-option"
                        className="currency-option"
                    >
                        {currency.name} ({currency.symbol})
                    </option>
                ))}
            </select>
            <span className="currency-select-chevron" aria-hidden="true">▾</span>
        </div>
    );
};

export default CurrencySelector;