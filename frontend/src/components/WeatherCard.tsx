interface WeatherCardProps {
    weather: {
        location: {
            name: string;
            country: string;
        };
        summary: {
            headline: string;
            avgMax: number;
            avgMin: number;
            totalPrecipitation: number;
        };
        found: boolean;
        temperature: number;
        description: string;
        icon: string;
    };
}


const WeatherCard = ({ weather }: WeatherCardProps) => {
    if (!weather || !weather.found) return null;

    const { location, summary } = weather;
    const { name, country } = location || {};
    const { headline, avgMax, avgMin, totalPrecipitation } = summary || {};

    const hasTemps = 
        typeof avgMax === 'number' && typeof avgMin === 'number';
        
    return (
        <section className="TODO-weather-card">
            <header className="TODO-weather-card-header">
                <div>
                    <p className="TODO-weather-card-title">
                        Live weather
                    </p>
                    <h3 className="TODO-weather-card-location">
                        {name}, {country ? `, ${country}` : ""}
                    </h3>
                </div>
                <div className="TODO-weather-card-icon">
                    <img src={weather.icon} alt={weather.description} />
                </div>
            </header>

            {hasTemps && (
                <p className="TODO-weather-card-temps">
                    <span className="TODO-weather-card-temp-max">
                        {Math.round(avgMax)}°C
                    </span> 
                    {" "}
                    high ·{" "}
                    <span className="TODO-weather-card-temp-min">
                        {Math.round(avgMin)}°C
                    </span>
                    {" "}
                    low
                </p>
            )}

            {typeof totalPrecipitation === 'number' && (
                <p className="TODO-weather-card-precipitation">
                    Total rain over next 7 days:{" "}
                    <span className="TODO-weather-card-precipitation-value">
                        {totalPrecipitation.toFixed(1)} mm precipitation
                    </span>
                </p>
            )}

            {headline && (
                <p className="TODO-weather-card-headline">
                    {headline}
                </p>
            )}

            <p className="TODO-weather-card-footer">
                Powered by Open-Meteo · 7-day outlook
            </p>
        </section>
    );
}

export default WeatherCard;