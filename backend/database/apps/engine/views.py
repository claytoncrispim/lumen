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

