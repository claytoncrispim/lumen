from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Location, SafetyIndex


@require_GET
def locations_list(request):
    locations = Location.objects.order_by("city_name")
    safety_by_country = {
        item.country_code.strip().upper(): item
        for item in SafetyIndex.objects.all()
        if item.country_code
    }
    
    data = []
    for location in locations:
        location_country_code = (location.country_code or "").strip().upper()
        safety = safety_by_country.get(location_country_code)
        data.append({
            "iata_code": location.iata_code,
            "airport_name": location.airport_name,
            "city_name": location.city_name,
            "country_name": location.country_name,
            "country_code": location_country_code,
            "safety_score": safety.score if safety else None,
        })

    return JsonResponse(data, safe=False)

@require_GET
def location_detail(request, city_name):
    city_name = Location.objects.filter(city_name__iexact=city_name)
    if not city_name.exists():
        return JsonResponse({"error": f"No location found for city '{city_name}'"}, status=404)
    
    data = []
    for location in city_name:
        location_city_name = (location.city_name or "").strip().capitalize()
        location_country_code = (location.country_code or "").strip().upper()
        safety = SafetyIndex.objects.filter(country_code__iexact=location_country_code).first()
        data.append({
            "iata_code": location.iata_code,
            "airport_name": location.airport_name,
            "city_name": location_city_name,
            "country_name": location.country_name,
            "country_code": location_country_code,
            "safety_score": safety.score if safety else None,
        })

    return JsonResponse(data, safe=False)