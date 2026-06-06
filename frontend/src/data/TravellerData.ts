import type { TravellerTypeOption } from '../types/TravellerType';

const travellerData: TravellerTypeOption[] = [
    { key: "adults", label: "Adults", description: "Ages 18+", icon: "adult" },
    { key: "youngAdults", label: "Young Adults", description: "Ages 12–17", icon: "youngAdult" },
    { key: "children", label: "Children", description: "Ages 2–11", icon: "child" },
    { key: "infants", label: "Infants", description: "Under 2", icon: "infant" },
];

export default travellerData;