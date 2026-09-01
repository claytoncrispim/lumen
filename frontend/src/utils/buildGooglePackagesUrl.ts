interface BuildGooglePackagesUrlProps {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    nights: number;
    totalTravelers: number;
}

export const buildGooglePackagesUrl = ({ origin, destination, departureDate, returnDate, nights, totalTravelers }: BuildGooglePackagesUrlProps): string => {
    if (!origin || !destination)
        return "https://www.google.com/search?q=package+holidays";

    let datePart = "";
    if (departureDate && returnDate) {
        datePart = `?depart=${departureDate}&return=${returnDate}`;
    } else if (departureDate) {
        datePart = `?depart=${departureDate}`;
    }

    let nightsPart = "";
    if (typeof nights === "number" && nights > 0) {
        nightsPart = ` for ${nights} night${nights > 1 ? 's' : ''}`;
    }

    let travelersPart = "";
    if (typeof totalTravelers === "number" && totalTravelers > 0) {
        travelersPart = ` for ${totalTravelers} traveler${totalTravelers > 1 ? 's' : ''}`;
    }

    const query = `Packages from ${origin} to ${destination} for ${travelersPart}${nightsPart}${datePart}`;
    const encodedQuery = encodeURIComponent(query.trim());

    return `https://www.google.com/travel/packages?q=${encodedQuery}`;
}