from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
import json
import os

from .models import Location, SafetyIndex
from apps.utils.fetch_weather_forecast import fetch_weather_forecast
from apps.utils.generate_travel_guide import generate_travel_guide


GUIDE_REQUIRED_FIELDS = {
    "destinationName": str,
    "summary": str,
    "bestTimeToVisit": str,
    "topAttractions": list,
    "foodToTry": list,
    "transportationTips": list,
    "safetyNotes": list,
    "budgetTips": list,
}


def _is_list_of_strings(value):
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def _validate_guide_schema(guide):
    if not isinstance(guide, dict):
        return "Guide response must be a JSON object."

    missing_fields = [field for field in GUIDE_REQUIRED_FIELDS if field not in guide]
    if missing_fields:
        return f"Guide response is missing required fields: {', '.join(missing_fields)}."

    for field_name, expected_type in GUIDE_REQUIRED_FIELDS.items():
        value = guide.get(field_name)
        if expected_type is list:
            if not _is_list_of_strings(value):
                return f"Field '{field_name}' must be an array of strings."
            continue

        if not isinstance(value, expected_type):
            return f"Field '{field_name}' must be a string."

    return None


@require_GET
def ping(request):
    return JsonResponse({"status": "ok"})


@require_GET
def llm_health(request):
    configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
    if not configured:
        return JsonResponse(
            {
                "status": "error",
                "error": "GEMINI_API_KEY_MISSING",
                "gemini": {"configured": False},
            },
            status=503,
        )

    return JsonResponse(
        {
            "status": "ok",
            "gemini": {"configured": True},
        }
    )


# WEATHER endpoint
@require_GET
async def get_weather(request, city_name):
    try:
        payload = await fetch_weather_forecast(city_name)
        return JsonResponse(payload, safe=False)
    except Exception as exc:
        message = str(exc)
        if message == "DESTINATION_REQUIRED":
            return JsonResponse(
                {
                    "error": "DESTINATION_REQUIRED",
                    "message": "Please provide a destination query parameter.",
                },
                status=400,
            )
        if message.startswith("LOCATION_NOT_FOUND"):
            city = message.split(":", 1)[1].strip() if ":" in message else city_name
            return JsonResponse(
                {
                    "error": "DESTINATION_NOT_FOUND",
                    "message": f"Could not find weather location for \"{city}\".",
                },
                status=404,
            )
        return JsonResponse(
            {
                "error": "WEATHER_API_ERROR",
                "message": "We had trouble fetching live weather data for this destination.",
            },
            status=500,
        )

@csrf_exempt
@require_POST
async def generate_guide(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {
                "error": "VALIDATION_ERROR",
                "message": "Request body must be valid JSON.",
            },
            status=400,
        )

    prompt = str(payload.get("prompt", "")).strip()
    if not prompt:
        return JsonResponse(
            {
                "error": "VALIDATION_ERROR",
                "message": "Prompt is required.",
            },
            status=400,
        )

    try:
        guide = await generate_travel_guide(prompt)

        schema_error = _validate_guide_schema(guide)
        if schema_error:
            return JsonResponse(
                {
                    "error": "GEMINI_INVALID_SCHEMA",
                    "message": schema_error,
                },
                status=502,
            )

        return JsonResponse(guide, safe=False)
    except Exception:
        return JsonResponse(
            {
                "error": "GEMINI_API_ERROR",
                "message": "We had trouble generating the travel guide.",
            },
            status=500,
        )


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


