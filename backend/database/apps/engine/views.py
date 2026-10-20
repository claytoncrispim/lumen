from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.http import require_GET
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
import json
import os
import re
import unicodedata
from datetime import date, datetime

from .models import Location, SafetyIndex
from apps.utils.fetch_weather_forecast import fetch_weather_forecast
from apps.utils.generate_travel_guide import generate_travel_guide


GUIDE_SCHEMA_VERSION = "1.0.0"
ALLOWED_BUDGET_LEVELS = {"low", "medium", "high"}
ALLOWED_SAFETY_LEVELS = {"very_low", "low", "moderate", "high", "very_high"}
ALLOWED_WINNER_VALUES = {"A", "B", "none"}
ALLOWED_WINNER_BADGES = {"LUMEN_WINNER", "NONE"}
ALLOWED_METRIC_WINNERS = {"A", "B", "tie"}

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_DATE_TIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T")
_IATA_RE = re.compile(r"^[A-Z0-9]{3}$")
_COUNTRY_CODE_RE = re.compile(r"^[A-Z]{2}$")
_CURRENCY_RE = re.compile(r"^[A-Z]{3}$")


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _check_object(value, path, errors):
    if not isinstance(value, dict):
        errors.append(f"{path} must be an object.")
        return False
    return True


def _check_required_keys(value, required_keys, path, errors):
    missing = [key for key in required_keys if key not in value]
    if missing:
        errors.append(f"{path} is missing required fields: {', '.join(missing)}.")


def _check_allowed_keys(value, allowed_keys, path, errors):
    unexpected = [key for key in value.keys() if key not in allowed_keys]
    if unexpected:
        errors.append(f"{path} has unsupported fields: {', '.join(unexpected)}.")


def _check_string(value, path, errors, *, non_empty=False, pattern=None):
    if not isinstance(value, str):
        errors.append(f"{path} must be a string.")
        return
    if non_empty and not value.strip():
        errors.append(f"{path} must be a non-empty string.")
    if pattern and not pattern.match(value):
        errors.append(f"{path} has invalid format.")


def _check_int(value, path, errors, *, minimum=None, maximum=None):
    if not isinstance(value, int) or isinstance(value, bool):
        errors.append(f"{path} must be an integer.")
        return
    if minimum is not None and value < minimum:
        errors.append(f"{path} must be >= {minimum}.")
    if maximum is not None and value > maximum:
        errors.append(f"{path} must be <= {maximum}.")


def _check_number(value, path, errors, *, minimum=None, maximum=None):
    if not _is_number(value):
        errors.append(f"{path} must be a number.")
        return
    if minimum is not None and value < minimum:
        errors.append(f"{path} must be >= {minimum}.")
    if maximum is not None and value > maximum:
        errors.append(f"{path} must be <= {maximum}.")


def _check_enum(value, options, path, errors):
    if value not in options:
        errors.append(f"{path} must be one of: {', '.join(sorted(options))}.")


def _validate_iso_date(value, path, errors):
    _check_string(value, path, errors, pattern=_DATE_RE)
    if isinstance(value, str) and _DATE_RE.match(value):
        try:
            date.fromisoformat(value)
        except ValueError:
            errors.append(f"{path} must be a valid calendar date.")


def _validate_iso_datetime(value, path, errors):
    _check_string(value, path, errors, pattern=_DATE_TIME_RE)
    if isinstance(value, str) and _DATE_TIME_RE.match(value):
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            errors.append(f"{path} must be a valid ISO datetime.")


def _validate_location_ref(location, path, errors):
    if not _check_object(location, path, errors):
        return

    required = {"cityName", "countryName", "countryCode"}
    allowed = required | {"iataCode"}
    _check_required_keys(location, required, path, errors)
    _check_allowed_keys(location, allowed, path, errors)

    city_name = location.get("cityName")
    country_name = location.get("countryName")
    country_code = location.get("countryCode")
    iata_code = location.get("iataCode")

    if city_name is not None:
        _check_string(city_name, f"{path}.cityName", errors, non_empty=True)
    if country_name is not None:
        _check_string(country_name, f"{path}.countryName", errors, non_empty=True)
    if country_code is not None:
        _check_string(country_code, f"{path}.countryCode", errors, pattern=_COUNTRY_CODE_RE)
    if iata_code is not None:
        _check_string(iata_code, f"{path}.iataCode", errors, pattern=_IATA_RE)


def _validate_money(money, path, errors):
    if not _check_object(money, path, errors):
        return

    required = {"currency", "amount"}
    _check_required_keys(money, required, path, errors)
    _check_allowed_keys(money, required, path, errors)

    currency = money.get("currency")
    amount = money.get("amount")
    if currency is not None:
        _check_string(currency, f"{path}.currency", errors, pattern=_CURRENCY_RE)
    if amount is not None:
        _check_number(amount, f"{path}.amount", errors, minimum=0)


def _validate_safety_pill(safety_pill, path, errors):
    if not _check_object(safety_pill, path, errors):
        return

    required = {"score", "level", "bulletPoints"}
    allowed = required | {"source", "lastUpdated"}
    _check_required_keys(safety_pill, required, path, errors)
    _check_allowed_keys(safety_pill, allowed, path, errors)

    score = safety_pill.get("score")
    level = safety_pill.get("level")
    bullet_points = safety_pill.get("bulletPoints")
    source = safety_pill.get("source")
    last_updated = safety_pill.get("lastUpdated")

    if score is not None:
        _check_int(score, f"{path}.score", errors, minimum=0, maximum=100)
    if level is not None:
        _check_enum(level, ALLOWED_SAFETY_LEVELS, f"{path}.level", errors)
    if source is not None:
        _check_string(source, f"{path}.source", errors)
    if last_updated is not None:
        _validate_iso_date(last_updated, f"{path}.lastUpdated", errors)

    if not _check_object(bullet_points, f"{path}.bulletPoints", errors):
        return

    bullets_required = {"legalStatus", "socialVibe", "travelAlerts"}
    _check_required_keys(bullet_points, bullets_required, f"{path}.bulletPoints", errors)
    _check_allowed_keys(bullet_points, bullets_required, f"{path}.bulletPoints", errors)

    for key in bullets_required:
        value = bullet_points.get(key)
        if value is not None:
            _check_string(
                value,
                f"{path}.bulletPoints.{key}",
                errors,
                non_empty=(key != "travelAlerts"),
            )


def _validate_flight_card(flight, path, errors):
    if not _check_object(flight, path, errors):
        return

    required = {
        "rank",
        "airline",
        "flightNumber",
        "departureDate",
        "returnDate",
        "flightPricePerPerson",
        "totalFlightPrice",
        "bookingUrl",
    }
    allowed = required | {"stops", "durationMinutes", "notes"}
    _check_required_keys(flight, required, path, errors)
    _check_allowed_keys(flight, allowed, path, errors)

    rank = flight.get("rank")
    airline = flight.get("airline")
    flight_number = flight.get("flightNumber")
    departure_date = flight.get("departureDate")
    return_date = flight.get("returnDate")
    per_person = flight.get("flightPricePerPerson")
    total_price = flight.get("totalFlightPrice")
    booking_url = flight.get("bookingUrl")
    stops = flight.get("stops")
    duration_minutes = flight.get("durationMinutes")
    notes = flight.get("notes")

    if rank is not None:
        _check_int(rank, f"{path}.rank", errors, minimum=1)
    if airline is not None:
        _check_string(airline, f"{path}.airline", errors, non_empty=True)
    if flight_number is not None:
        _check_string(flight_number, f"{path}.flightNumber", errors, non_empty=True)
    if departure_date is not None:
        _validate_iso_date(departure_date, f"{path}.departureDate", errors)
    if return_date is not None:
        _validate_iso_date(return_date, f"{path}.returnDate", errors)
    if per_person is not None:
        _validate_money(per_person, f"{path}.flightPricePerPerson", errors)
    if total_price is not None:
        _validate_money(total_price, f"{path}.totalFlightPrice", errors)
    if booking_url is not None:
        _check_string(booking_url, f"{path}.bookingUrl", errors, non_empty=True)
    if stops is not None:
        _check_int(stops, f"{path}.stops", errors, minimum=0)
    if duration_minutes is not None:
        _check_int(duration_minutes, f"{path}.durationMinutes", errors, minimum=1)
    if notes is not None:
        _check_string(notes, f"{path}.notes", errors)


def _validate_hotel_card(hotel, path, errors):
    if not _check_object(hotel, path, errors):
        return

    required = {"name", "priceRange", "inclusiveNotes", "bookingUrl"}
    allowed = required | {"neighborhood"}
    _check_required_keys(hotel, required, path, errors)
    _check_allowed_keys(hotel, allowed, path, errors)

    for key in required:
        value = hotel.get(key)
        if value is not None:
            _check_string(value, f"{path}.{key}", errors, non_empty=(key != "inclusiveNotes"))

    neighborhood = hotel.get("neighborhood")
    if neighborhood is not None:
        _check_string(neighborhood, f"{path}.neighborhood", errors)


def _validate_package_card(package_card, path, errors):
    if not _check_object(package_card, path, errors):
        return

    required = {"title", "priceRange", "inclusions", "bookingUrl"}
    _check_required_keys(package_card, required, path, errors)
    _check_allowed_keys(package_card, required, path, errors)

    title = package_card.get("title")
    price_range = package_card.get("priceRange")
    inclusions = package_card.get("inclusions")
    booking_url = package_card.get("bookingUrl")

    if title is not None:
        _check_string(title, f"{path}.title", errors, non_empty=True)
    if price_range is not None:
        _check_string(price_range, f"{path}.priceRange", errors, non_empty=True)
    if booking_url is not None:
        _check_string(booking_url, f"{path}.bookingUrl", errors, non_empty=True)
    if not isinstance(inclusions, list):
        errors.append(f"{path}.inclusions must be an array.")
    else:
        for idx, item in enumerate(inclusions):
            _check_string(item, f"{path}.inclusions[{idx}]", errors)


def _validate_discovery_venue(venue, path, errors):
    if not _check_object(venue, path, errors):
        return

    required = {"name", "whyRecommended", "vetted"}
    allowed = required | {"category", "inclusiveSignals", "source"}
    _check_required_keys(venue, required, path, errors)
    _check_allowed_keys(venue, allowed, path, errors)

    name = venue.get("name")
    why_recommended = venue.get("whyRecommended")
    vetted = venue.get("vetted")
    category = venue.get("category")
    inclusive_signals = venue.get("inclusiveSignals")
    source = venue.get("source")

    if name is not None:
        _check_string(name, f"{path}.name", errors, non_empty=True)
    if why_recommended is not None:
        _check_string(why_recommended, f"{path}.whyRecommended", errors, non_empty=True)
    if not isinstance(vetted, bool):
        errors.append(f"{path}.vetted must be a boolean.")
    if category is not None:
        _check_string(category, f"{path}.category", errors)
    if source is not None:
        _check_string(source, f"{path}.source", errors)

    if inclusive_signals is not None:
        if not isinstance(inclusive_signals, list):
            errors.append(f"{path}.inclusiveSignals must be an array.")
        else:
            for idx, item in enumerate(inclusive_signals):
                _check_string(item, f"{path}.inclusiveSignals[{idx}]", errors)


def _validate_comparison_metric(metric, path, errors):
    if not _check_object(metric, path, errors):
        return

    required = {"a", "b", "winner", "rationale"}
    _check_required_keys(metric, required, path, errors)
    _check_allowed_keys(metric, required, path, errors)

    a_value = metric.get("a")
    b_value = metric.get("b")
    winner = metric.get("winner")
    rationale = metric.get("rationale")

    if a_value is not None:
        _check_number(a_value, f"{path}.a", errors, minimum=0, maximum=100)
    if b_value is not None:
        _check_number(b_value, f"{path}.b", errors, minimum=0, maximum=100)
    if winner is not None:
        _check_enum(winner, ALLOWED_METRIC_WINNERS, f"{path}.winner", errors)
    if rationale is not None:
        _check_string(rationale, f"{path}.rationale", errors, non_empty=True)


def _validate_guide_schema(guide):
    errors = []
    if not _check_object(guide, "guide", errors):
        return errors

    required_root = {"schemaVersion", "query", "outputViewA", "comparison"}
    allowed_root = required_root | {"meta", "visualTripPreview"}
    _check_required_keys(guide, required_root, "guide", errors)
    _check_allowed_keys(guide, allowed_root, "guide", errors)

    schema_version = guide.get("schemaVersion")
    if schema_version is not None and schema_version != GUIDE_SCHEMA_VERSION:
        errors.append(f"guide.schemaVersion must be '{GUIDE_SCHEMA_VERSION}'.")

    meta = guide.get("meta")
    if meta is not None:
        if _check_object(meta, "guide.meta", errors):
            meta_allowed = {"generatedAt", "model", "provider", "latencyMs", "warnings"}
            _check_allowed_keys(meta, meta_allowed, "guide.meta", errors)
            if "generatedAt" in meta:
                _validate_iso_datetime(meta.get("generatedAt"), "guide.meta.generatedAt", errors)
            if "model" in meta:
                _check_string(meta.get("model"), "guide.meta.model", errors)
            if "provider" in meta:
                _check_string(meta.get("provider"), "guide.meta.provider", errors)
            if "latencyMs" in meta:
                _check_int(meta.get("latencyMs"), "guide.meta.latencyMs", errors, minimum=0)
            if "warnings" in meta:
                warnings = meta.get("warnings")
                if not isinstance(warnings, list):
                    errors.append("guide.meta.warnings must be an array.")
                else:
                    for idx, warning in enumerate(warnings):
                        _check_string(warning, f"guide.meta.warnings[{idx}]", errors)

    query = guide.get("query")
    if _check_object(query, "guide.query", errors):
        query_required = {
            "origin",
            "destinationA",
            "dates",
            "travellers",
            "budgetLevel",
            "currency",
        }
        query_allowed = query_required | {"destinationB"}
        _check_required_keys(query, query_required, "guide.query", errors)
        _check_allowed_keys(query, query_allowed, "guide.query", errors)

        _validate_location_ref(query.get("origin"), "guide.query.origin", errors)
        _validate_location_ref(query.get("destinationA"), "guide.query.destinationA", errors)
        if "destinationB" in query and query.get("destinationB") is not None:
            _validate_location_ref(query.get("destinationB"), "guide.query.destinationB", errors)

        dates = query.get("dates")
        if _check_object(dates, "guide.query.dates", errors):
            dates_required = {"departureDate", "returnDate", "nights"}
            _check_required_keys(dates, dates_required, "guide.query.dates", errors)
            _check_allowed_keys(dates, dates_required, "guide.query.dates", errors)
            if "departureDate" in dates:
                _validate_iso_date(dates.get("departureDate"), "guide.query.dates.departureDate", errors)
            if "returnDate" in dates:
                _validate_iso_date(dates.get("returnDate"), "guide.query.dates.returnDate", errors)
            if "nights" in dates:
                _check_int(dates.get("nights"), "guide.query.dates.nights", errors, minimum=1)

        travellers = query.get("travellers")
        if _check_object(travellers, "guide.query.travellers", errors):
            traveller_required = {"adults", "youngAdults", "children", "infants", "total"}
            _check_required_keys(travellers, traveller_required, "guide.query.travellers", errors)
            _check_allowed_keys(travellers, traveller_required, "guide.query.travellers", errors)
            for key in traveller_required:
                if key in travellers:
                    minimum = 1 if key == "total" else 0
                    _check_int(travellers.get(key), f"guide.query.travellers.{key}", errors, minimum=minimum)

        budget_level = query.get("budgetLevel")
        if budget_level is not None:
            _check_enum(budget_level, ALLOWED_BUDGET_LEVELS, "guide.query.budgetLevel", errors)

        currency = query.get("currency")
        if currency is not None:
            _check_string(currency, "guide.query.currency", errors, pattern=_CURRENCY_RE)

    output_view_a = guide.get("outputViewA")
    if _check_object(output_view_a, "guide.outputViewA", errors):
        output_required = {"destination", "primaryAnchor", "resultsCards", "discoveryBlock"}
        _check_required_keys(output_view_a, output_required, "guide.outputViewA", errors)
        _check_allowed_keys(output_view_a, output_required, "guide.outputViewA", errors)

        _validate_location_ref(output_view_a.get("destination"), "guide.outputViewA.destination", errors)

        primary_anchor = output_view_a.get("primaryAnchor")
        if _check_object(primary_anchor, "guide.outputViewA.primaryAnchor", errors):
            anchor_required = {"safetyPill"}
            _check_required_keys(primary_anchor, anchor_required, "guide.outputViewA.primaryAnchor", errors)
            _check_allowed_keys(primary_anchor, anchor_required, "guide.outputViewA.primaryAnchor", errors)
            _validate_safety_pill(primary_anchor.get("safetyPill"), "guide.outputViewA.primaryAnchor.safetyPill", errors)

        results_cards = output_view_a.get("resultsCards")
        if _check_object(results_cards, "guide.outputViewA.resultsCards", errors):
            cards_required = {"flights", "hotels", "packageDeals"}
            _check_required_keys(results_cards, cards_required, "guide.outputViewA.resultsCards", errors)
            _check_allowed_keys(results_cards, cards_required, "guide.outputViewA.resultsCards", errors)

            flights = results_cards.get("flights")
            hotels = results_cards.get("hotels")
            package_deals = results_cards.get("packageDeals")

            if not isinstance(flights, list):
                errors.append("guide.outputViewA.resultsCards.flights must be an array.")
            else:
                for idx, flight in enumerate(flights):
                    _validate_flight_card(flight, f"guide.outputViewA.resultsCards.flights[{idx}]", errors)

            if not isinstance(hotels, list):
                errors.append("guide.outputViewA.resultsCards.hotels must be an array.")
            else:
                for idx, hotel in enumerate(hotels):
                    _validate_hotel_card(hotel, f"guide.outputViewA.resultsCards.hotels[{idx}]", errors)

            if not isinstance(package_deals, list):
                errors.append("guide.outputViewA.resultsCards.packageDeals must be an array.")
            else:
                for idx, package_card in enumerate(package_deals):
                    _validate_package_card(package_card, f"guide.outputViewA.resultsCards.packageDeals[{idx}]", errors)

        discovery_block = output_view_a.get("discoveryBlock")
        if _check_object(discovery_block, "guide.outputViewA.discoveryBlock", errors):
            discovery_required = {"culinaryCompass", "nightlife"}
            _check_required_keys(discovery_block, discovery_required, "guide.outputViewA.discoveryBlock", errors)
            _check_allowed_keys(discovery_block, discovery_required, "guide.outputViewA.discoveryBlock", errors)

            for key in ["culinaryCompass", "nightlife"]:
                block = discovery_block.get(key)
                block_path = f"guide.outputViewA.discoveryBlock.{key}"
                if _check_object(block, block_path, errors):
                    block_required = {"summary", "venues"}
                    _check_required_keys(block, block_required, block_path, errors)
                    _check_allowed_keys(block, block_required, block_path, errors)
                    summary = block.get("summary")
                    venues = block.get("venues")
                    if summary is not None:
                        _check_string(summary, f"{block_path}.summary", errors, non_empty=True)
                    if not isinstance(venues, list):
                        errors.append(f"{block_path}.venues must be an array.")
                    else:
                        for idx, venue in enumerate(venues):
                            _validate_discovery_venue(venue, f"{block_path}.venues[{idx}]", errors)

    comparison = guide.get("comparison")
    if _check_object(comparison, "guide.comparison", errors):
        comparison_required = {"versusPills", "matrix"}
        _check_required_keys(comparison, comparison_required, "guide.comparison", errors)
        _check_allowed_keys(comparison, comparison_required, "guide.comparison", errors)

        versus_pills = comparison.get("versusPills")
        if _check_object(versus_pills, "guide.comparison.versusPills", errors):
            versus_required = {"destinationA", "destinationB", "winner"}
            _check_required_keys(versus_pills, versus_required, "guide.comparison.versusPills", errors)
            _check_allowed_keys(versus_pills, versus_required, "guide.comparison.versusPills", errors)

            for label in ["destinationA", "destinationB"]:
                destination_data = versus_pills.get(label)
                path = f"guide.comparison.versusPills.{label}"
                if _check_object(destination_data, path, errors):
                    allowed = {"destination", "safetyScore", "isWinner"}
                    _check_required_keys(destination_data, allowed, path, errors)
                    _check_allowed_keys(destination_data, allowed, path, errors)
                    _validate_location_ref(destination_data.get("destination"), f"{path}.destination", errors)
                    if "safetyScore" in destination_data:
                        _check_int(destination_data.get("safetyScore"), f"{path}.safetyScore", errors, minimum=0, maximum=100)
                    if not isinstance(destination_data.get("isWinner"), bool):
                        errors.append(f"{path}.isWinner must be a boolean.")

            winner = versus_pills.get("winner")
            if _check_object(winner, "guide.comparison.versusPills.winner", errors):
                winner_required = {"destination", "badge", "reason"}
                _check_required_keys(winner, winner_required, "guide.comparison.versusPills.winner", errors)
                _check_allowed_keys(winner, winner_required, "guide.comparison.versusPills.winner", errors)
                if "destination" in winner:
                    _check_enum(winner.get("destination"), ALLOWED_WINNER_VALUES, "guide.comparison.versusPills.winner.destination", errors)
                if "badge" in winner:
                    _check_enum(winner.get("badge"), ALLOWED_WINNER_BADGES, "guide.comparison.versusPills.winner.badge", errors)
                if "reason" in winner:
                    _check_string(winner.get("reason"), "guide.comparison.versusPills.winner.reason", errors, non_empty=True)

        matrix = comparison.get("matrix")
        if _check_object(matrix, "guide.comparison.matrix", errors):
            matrix_required = {"destinationA", "destinationB", "metrics"}
            _check_required_keys(matrix, matrix_required, "guide.comparison.matrix", errors)
            _check_allowed_keys(matrix, matrix_required, "guide.comparison.matrix", errors)
            _validate_location_ref(matrix.get("destinationA"), "guide.comparison.matrix.destinationA", errors)
            _validate_location_ref(matrix.get("destinationB"), "guide.comparison.matrix.destinationB", errors)

            metrics = matrix.get("metrics")
            if _check_object(metrics, "guide.comparison.matrix.metrics", errors):
                metric_keys = {"price", "safety", "culinary", "nightlife", "overallValue"}
                _check_required_keys(metrics, metric_keys, "guide.comparison.matrix.metrics", errors)
                _check_allowed_keys(metrics, metric_keys, "guide.comparison.matrix.metrics", errors)
                for metric_name in metric_keys:
                    _validate_comparison_metric(metrics.get(metric_name), f"guide.comparison.matrix.metrics.{metric_name}", errors)

    return errors


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


def _resolve_location_context(query):
    raw_query = str(query or "").strip()
    if not raw_query:
        return {
            "query": "",
            "resolved": False,
            "city": None,
            "country": None,
            "countryCode": None,
            "airportIata": None,
            "airportName": None,
            "safetyScore": None,
        }

    matches = []
    for location in Location.objects.all():
        score = _location_match_score(location, raw_query)
        if score > 0:
            matches.append((score, location))

    if not matches:
        return {
            "query": raw_query,
            "resolved": False,
            "city": None,
            "country": None,
            "countryCode": None,
            "airportIata": None,
            "airportName": None,
            "safetyScore": None,
        }

    matches.sort(key=lambda item: (-item[0], (item[1].city_name or "").lower()))
    best = _serialize_location(matches[0][1])
    return {
        "query": raw_query,
        "resolved": True,
        "city": best.get("city_name"),
        "country": best.get("country_name"),
        "countryCode": best.get("country_code"),
        "airportIata": best.get("iata_code"),
        "airportName": best.get("airport_name"),
        "safetyScore": best.get("safety_score"),
    }


def _build_authoritative_location_context(trip_context):
    origin_query = str((trip_context or {}).get("origin", "")).strip()
    destination_a_query = str((trip_context or {}).get("destinationA", "")).strip()
    destination_b_query = str((trip_context or {}).get("destinationB", "")).strip()

    origin = _resolve_location_context(origin_query)
    destination_a = _resolve_location_context(destination_a_query)

    if destination_b_query:
        destination_b = _resolve_location_context(destination_b_query)
        mirrored_from_a = False
    else:
        destination_b = _resolve_location_context(destination_a_query)
        mirrored_from_a = True

    return {
        "origin": origin,
        "destinationA": destination_a,
        "destinationB": destination_b,
        "destinationBMirrorsA": mirrored_from_a,
    }


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
    trip_context = payload.get("tripContext")
    if trip_context is not None and not isinstance(trip_context, dict):
        return JsonResponse(
            {
                "error": "VALIDATION_ERROR",
                "message": "tripContext must be a JSON object when provided.",
            },
            status=400,
        )
    include_debug_context = payload.get("includeDebugContext", False)
    if not isinstance(include_debug_context, bool):
        return JsonResponse(
            {
                "error": "VALIDATION_ERROR",
                "message": "includeDebugContext must be a boolean when provided.",
            },
            status=400,
        )

    try:
        authoritative_context = _build_authoritative_location_context(trip_context or {})
        prompt_with_context = (
            f"{prompt}\n\n"
            "Authoritative location and safety context from local databases "
            "(Location + SafetyIndex):\n"
            f"{json.dumps(authoritative_context, ensure_ascii=False)}\n\n"
            "Hard rules for this context:\n"
            "- Use this object as source of truth for city/country/airport and safety values when resolved=true.\n"
            "- Do not invent safety scores when safetyScore is null.\n"
            "- If destinationBMirrorsA=true, keep comparisons neutral and avoid claiming different safety scores.\n"
        )
        guide = await generate_travel_guide(prompt_with_context)

        schema_errors = _validate_guide_schema(guide)
        if schema_errors:
            return JsonResponse(
                {
                    "error": "GEMINI_INVALID_SCHEMA",
                    "message": "Gemini response did not match the required presentation schema.",
                    "details": schema_errors,
                },
                status=502,
            )

        response = JsonResponse(guide, safe=False)
        if settings.DEBUG and include_debug_context:
            response["X-Lumen-Debug-Context"] = json.dumps(
                authoritative_context,
                ensure_ascii=False,
                separators=(",", ":"),
            )
        return response
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

def _normalize_search_text(value):
    if value is None:
        return ""

    normalized = unicodedata.normalize("NFKD", str(value).lower())
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("&", " and ")
    normalized = normalized.replace("-", " ").replace("_", " ")
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    return " ".join(normalized.split())


def _serialize_location(location):
    location_country_code = (location.country_code or "").strip().upper()
    safety = SafetyIndex.objects.filter(country_code__iexact=location_country_code).first()

    return {
        "iata_code": location.iata_code,
        "airport_name": location.airport_name,
        "city_name": (location.city_name or "").strip().title(),
        "country_name": location.country_name,
        "country_code": location_country_code,
        "safety_score": safety.score if safety else None,
    }


def _location_match_score(location, query):
    query_norm = _normalize_search_text(query)
    if not query_norm:
        return 0

    city_norm = _normalize_search_text(location.city_name)
    airport_norm = _normalize_search_text(location.airport_name)
    country_norm = _normalize_search_text(location.country_name)
    iata_norm = _normalize_search_text(location.iata_code)

    compact_query = query_norm.replace(" ", "")
    compact_city = city_norm.replace(" ", "")
    compact_airport = airport_norm.replace(" ", "")
    compact_country = country_norm.replace(" ", "")

    if query_norm == city_norm:
        return 100
    if query_norm in city_norm:
        return 90
    if query_norm == airport_norm:
        return 85
    if query_norm in airport_norm:
        return 80
    if query_norm == iata_norm:
        return 95
    if query_norm in iata_norm:
        return 70
    if query_norm == country_norm:
        return 60
    if query_norm in country_norm:
        return 55
    if compact_query == compact_city:
        return 75
    if compact_query in compact_city:
        return 65
    if compact_query in compact_airport:
        return 60
    if compact_query in compact_country:
        return 50
    return 0


@require_GET
def location_detail(request, city_name):
    locations = Location.objects.filter(city_name__iexact=city_name)
    if not locations.exists():
        return JsonResponse({"error": f"No location found for city '{city_name}'"}, status=404)

    return JsonResponse([_serialize_location(location) for location in locations], safe=False)


@require_GET
def location_airport_resolve(request, query=None):
    request_query = request.GET.get("query", "")
    raw_query = (query or request_query or "").strip()
    if not raw_query:
        return JsonResponse({"error": "QUERY_REQUIRED", "message": "A destination query is required."}, status=400)

    matches = []
    for location in Location.objects.all():
        score = _location_match_score(location, raw_query)
        if score > 0:
            matches.append((score, location))

    if not matches:
        return JsonResponse({"error": f"No location found for query '{raw_query}'"}, status=404)

    matches.sort(key=lambda item: (-item[0], (item[1].city_name or "").lower()))
    data = [_serialize_location(location) for _, location in matches[:10]]
    return JsonResponse(data, safe=False)
