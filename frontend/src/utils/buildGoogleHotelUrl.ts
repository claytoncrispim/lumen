interface BuildGoogleHotelUrlProps {
    destination: string;
    departureDate: string;
    returnDate: string;
    totalTravelers: number;
}

export const buildGoogleHotelUrl = ({ destination, departureDate, returnDate, totalTravelers }: BuildGoogleHotelUrlProps): string => {
    if (!destination)
        return "https://www.google.com/travel/hotels";    

    let travelersPart = "";
    if (typeof totalTravelers === "number" && totalTravelers > 0) {
        travelersPart = ` for ${totalTravelers} guests${totalTravelers > 1 ? 's' : ''}`;
    }

    let datePart=""
    if (departureDate && returnDate) {
        datePart = `?checkin=${departureDate}&checkout=${returnDate}`;
    } else if (departureDate) {
        datePart = `?checkin=${departureDate}`;
    }

    const query = `Hotels in ${destination} ${travelersPart} ${datePart}`
    const encodedQuery = encodeURIComponent(query.trim());

    return `https://www.google.com/travel/hotels/${destination}?q=${encodedQuery}`;
}