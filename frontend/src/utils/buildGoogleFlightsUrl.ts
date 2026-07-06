const buildGoogleFlightsUrl = (
    origin: string, 
    destination: string, 
    departureDate: string, 
    returnDate: string, 
    totalTravellers: number, 
    flight: any
) => {
    
    // Try to infer origin/destination from multiple sources
    const effectiveOrigin = 
        origin ||
        flight?.departureAirport ||
        flight?.from ||
        '';

    const effectiveDestination = 
        destination ||
        flight?.arrivalAirport ||
        flight?.to ||
        '';

    let datePart = '';
    if (departureDate && returnDate) {
        datePart = ` on ${departureDate} to ${returnDate}`;
    } else if (departureDate) {
        datePart = ` on ${departureDate}`;
    }

    let travellersPart = '';
    if (typeof totalTravellers === 'number' && totalTravellers > 0) {
        travellersPart = ` for ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}`;
    }

    // Unknown origin or destination, fallback to Google Flights homepage
    if (!effectiveOrigin || !effectiveDestination) {
        return 'https://www.google.com/flights';
    }

    if (effectiveOrigin === effectiveDestination) {
        const q = encodeURIComponent(
            `Flights to ${effectiveDestination}${datePart}${travellersPart}`
        );
        return `https://www.google.com/search?q=${q}`;
    }

    // Known origin and destination, construct the Google Flights URL
    const query = `Flights from ${effectiveOrigin} to ${effectiveDestination}${datePart}${travellersPart}`;
    const encodedQuery = encodeURIComponent(query.trim());
    
    return `https://www.google.com/search?q=${encodedQuery}`;

};

export default buildGoogleFlightsUrl;
