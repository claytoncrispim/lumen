import { useEffect, useState } from 'react';
import { Plus, Minus, Users } from 'lucide-react';
import travellerData from '../data/TravellerData';
import type { TravellerCounts, TravellerKey } from '../types/TravellerType';

interface TravellerSelectorProps {
    initialTravellers: TravellerCounts;
    onApply: (travellers: TravellerCounts) => void;
    onClose: () => void;
}

function TravellerSelector({ initialTravellers, onApply, onClose }: TravellerSelectorProps) {
    const [localTravellers, setLocalTravellers] = useState<TravellerCounts>(initialTravellers);

    useEffect(() => {
        setLocalTravellers(initialTravellers);
    }, [initialTravellers]);

    const updateCount = (key: TravellerKey, delta: number) => {
        setLocalTravellers((prev) => {
            const newCount = Math.max(0, (prev[key] || 0) + delta);
            return { ...prev, [key]: newCount };
        });
    };

    return (
        <div className="TODO-traveller-selector">
            {/* Header */}
            <div className="TODO-header">
                <Users size={20} />
                <h3 className="TODO-title">Travellers</h3>
                <p>Optimise your travel experience.</p>
            </div>

            {/* Traveller Controls */}
            <div className="TODO-traveller-controls">
                {travellerData.map((type) => (
                    <div key={type.key} className="TODO-traveller-type">
                        <div className="TODO-type-info">
                            <p className="TODO-type-label">{type.label}</p>
                            <p className="TODO-type-description">{type.description}</p>
                        </div>
                        <div className="TODO-type-controls">
                            <button
                                type="button"
                                onClick={() => updateCount(type.key, -1)}
                                disabled={(localTravellers[type.key] || 0) === 0}
                                className="TODO-control-button"
                            >
                                <Minus size={16} />
                            </button>

                            <span className="TODO-count">
                                {localTravellers[type.key] || 0}
                            </span>

                            <button
                                type="button"
                                onClick={() => updateCount(type.key, +1)}
                                className="TODO-control-button"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action buttons */}
            <div className="TODO-actions">
                <button
                    type="button"
                    onClick={onClose}
                    className="TODO-action-button"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={() => {
                        onApply(localTravellers);
                        onClose();
                    }}
                    className="TODO-action-button-primary"
                >
                    Apply
                </button>
            </div>
        </div>
    );







}

export default TravellerSelector;