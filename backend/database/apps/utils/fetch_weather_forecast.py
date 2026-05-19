import urllib.parse
import aiohttp
from django.http import JsonResponse
from django.views.decorators.http import require_GET

@require_GET
async def fetch_weather_forecast(city_name):
    if not city_name or not city_name.strip():
        raise Exception("DESTINATION_REQUIRED")
    
    # 1. Geocode the city name to get latitude and longitude
    geo_url = (f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(
        city_name
    )}&count=10&language=en&format=json")

    async with aiohttp.ClientSession() as session:
        async with session.get(geo_url) as geo_response:
            if geo_response.status != 200:
                raise Exception(f"GEOCODING_FAILED: {geo_response.status}" or "UNKNOWN_STATUS")
    
            geo_data = await geo_response.json()
            places = geo_data.get("results", [])
            if not places: # No match found for the city
                return JsonResponse(Exception(f"Could not find weather location for '{city_name}'"), safe=False, status=404)
            
            place = places[0]
            latitude = place.get("latitude")
            longitude = place.get("longitude")
            name = place.get("name")
            country = place.get("country")
            timezone = place.get("timezone")

            # 2. Get a 7-day daily forecast for that location
            forecast_url = (f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}"
                            f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7")
            
            async with session.get(forecast_url) as forecast_response:
                if forecast_response.status != 200:
                    raise Exception(f"FORECAST_FAILED: {forecast_response.status}" or "UNKNOWN_STATUS")
                
                forecast_data = await forecast_response.json()
                daily = forecast_data.get("daily", {})

                if not daily or not daily.get("time") or not daily.get("temperature_2m_max"):
                    raise Exception("FORECAST_UNEXPECTED_SHAPE")
                

                # 3. Build a small, friendly summary object  
                dates = daily.get("time", [])
                temp_max = daily.get("temperature_2m_max", [])
                temp_min = daily.get("temperature_2m_min", [])
                precipitation = daily.get("precipitation_sum", [])
                
                forecast_daily_list = []
                for i in range(len(dates)):
                    forecast_daily_list.append({
                        "date": dates[i],
                        "temp_max": temp_max[i],
                        "temp_min": temp_min[i],
                        "precipitation": precipitation[i],
                    })

                #Compute some simple stats for a headline
                sum_max = 0
                sum_min = 0
                sum_precip = 0
                count = 0

                for i in range(len(forecast_daily_list)):
                    if isinstance(temp_max[i], (int, float)):
                        sum_max += temp_max[i]
                    if isinstance(temp_min[i], (int, float)):
                        sum_min += temp_min[i]
                    if isinstance(precipitation[i], (int, float)):
                        sum_precip += precipitation[i]
                    count += 1

                avg_max = sum_max / count if count > 0 else None
                avg_min = sum_min / count if count > 0 else None               

                # Tiny heuristic for a 1-line description
                headline = "Mixed conditions expected."

                if avg_max is not None and avg_min is not None:
                    if avg_max >= 25 and sum_precip < 5:
                        headline = "Warm and mostly dry – great beach or pool weather."
                    elif avg_max >= 20 and sum_precip < 10:
                        headline = "Mild and generally pleasant with only light rain."
                    elif avg_max < 10:
                        headline = "Chilly overall – pack layers and a warm jacket."
                    elif sum_precip >= 15:
                        headline = "Expect a fair bit of rain – an umbrella is a good idea."

                return JsonResponse({
                    "found": True,
                    "provider": "Open-Meteo",
                    "location": {
                        "name": name, 
                        "country": country,
                        "latitude": latitude,
                        "longitude": longitude,
                        "timezone": timezone,
                    },
                    "summary": {
                        "headline": headline,
                        "avg_max": avg_max,
                        "avg_min": avg_min,
                        "total_precip": sum_precip,
                        },                    
                    "daily": forecast_daily_list,
                }, safe=False)