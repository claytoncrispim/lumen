from django.test import TestCase
from unittest.mock import AsyncMock, patch

from .models import Location, SafetyIndex


class EngineModelsSmokeTest(TestCase):
	def test_can_create_location(self):
		location = Location.objects.create(
			iata_code="LHR",
			airport_name="Heathrow Airport",
			city_name="London",
			country_name="United Kingdom",
			country_code="GB",
		)

		self.assertEqual(location.iata_code, "LHR")
		self.assertEqual(location.country_code, "GB")
		self.assertEqual(str(location), "London (LHR)")

	def test_can_create_country_level_safety_index(self):
		safety = SafetyIndex.objects.create(
			country_code="GB",
			country_name="United Kingdom",
			score=78,
			legal_status="Marriage equality and anti-discrimination protections exist.",
			social_vibe="Large visible community and venues.",
			travel_alerts="",
		)

		self.assertEqual(safety.country_code, "GB")
		self.assertIn("United Kingdom", str(safety))


class EngineApiTest(TestCase):
	def test_ping_returns_ok(self):
		response = self.client.get("/api/ping/")
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload["status"], "ok")

	def test_ping_rejects_post_method(self):
		response = self.client.post("/api/ping/")
		self.assertEqual(response.status_code, 405)

	@patch.dict("os.environ", {"GEMINI_API_KEY": "test-key"}, clear=False)
	def test_llm_health_returns_ok_when_key_is_configured(self):
		response = self.client.get("/api/health/llm/")
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload["status"], "ok")
		self.assertTrue(payload["gemini"]["configured"])

	@patch.dict("os.environ", {}, clear=True)
	def test_llm_health_returns_503_when_key_is_missing(self):
		response = self.client.get("/api/health/llm/")
		self.assertEqual(response.status_code, 503)
		payload = response.json()
		self.assertEqual(payload["status"], "error")
		self.assertEqual(payload["error"], "GEMINI_API_KEY_MISSING")
		self.assertFalse(payload["gemini"]["configured"])

	def test_locations_list_includes_country_safety_score(self):
		Location.objects.create(
			iata_code="LHR",
			airport_name="Heathrow Airport",
			city_name="London",
			country_name="United Kingdom",
			country_code="gb",
		)
		Location.objects.create(
			iata_code="EZE",
			airport_name="Ezeiza International Airport",
			city_name="Buenos Aires",
			country_name="Argentina",
			country_code="AR",
		)
		SafetyIndex.objects.create(
			country_code="GB",
			country_name="United Kingdom",
			score=10,
			legal_status="Strong legal framework.",
			social_vibe="High acceptance in major urban areas.",
			travel_alerts="",
		)

		response = self.client.get("/api/locations/")
		self.assertEqual(response.status_code, 200)

		payload = response.json()
		self.assertEqual(len(payload), 2)

		london = next(item for item in payload if item["iata_code"] == "LHR")
		buenos_aires = next(item for item in payload if item["iata_code"] == "EZE")

		self.assertEqual(london["country_code"], "GB")
		self.assertEqual(london["safety_score"], 10)
		self.assertIsNone(buenos_aires["safety_score"])

	def test_locations_list_rejects_post_method(self):
		response = self.client.post("/api/locations/", data={"dummy": "value"})
		self.assertEqual(response.status_code, 405)

	@patch("apps.engine.views.fetch_weather_forecast", new_callable=AsyncMock)
	def test_get_weather_returns_payload(self, mock_fetch_weather_forecast):
		mock_fetch_weather_forecast.return_value = {
			"found": True,
			"provider": "Open-Meteo",
			"location": {"name": "London", "country": "United Kingdom"},
			"summary": {"headline": "Mild and generally pleasant."},
			"daily": [],
		}

		response = self.client.get("/api/weather/London/")
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload["provider"], "Open-Meteo")
		self.assertTrue(payload["found"])

	@patch("apps.engine.views.fetch_weather_forecast", new_callable=AsyncMock)
	def test_get_weather_returns_404_for_unknown_location(self, mock_fetch_weather_forecast):
		mock_fetch_weather_forecast.side_effect = Exception("LOCATION_NOT_FOUND: Atlantis")

		response = self.client.get("/api/weather/Atlantis/")
		self.assertEqual(response.status_code, 404)
		payload = response.json()
		self.assertEqual(payload["error"], "DESTINATION_NOT_FOUND")
		self.assertEqual(payload["message"], "Could not find weather location for \"Atlantis\".")

	@patch("apps.engine.views.fetch_weather_forecast", new_callable=AsyncMock)
	def test_get_weather_returns_400_for_missing_destination(self, mock_fetch_weather_forecast):
		mock_fetch_weather_forecast.side_effect = Exception("DESTINATION_REQUIRED")

		response = self.client.get("/api/weather/London/")
		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertEqual(payload["error"], "DESTINATION_REQUIRED")
		self.assertEqual(payload["message"], "Please provide a destination query parameter.")

	@patch("apps.engine.views.fetch_weather_forecast", new_callable=AsyncMock)
	def test_get_weather_returns_500_for_upstream_failure(self, mock_fetch_weather_forecast):
		mock_fetch_weather_forecast.side_effect = Exception("GEOCODING_FAILED: 503")

		response = self.client.get("/api/weather/London/")
		self.assertEqual(response.status_code, 500)
		payload = response.json()
		self.assertEqual(payload["error"], "WEATHER_API_ERROR")
		self.assertEqual(
			payload["message"],
			"We had trouble fetching live weather data for this destination.",
		)

	@patch("apps.engine.views.generate_travel_guide", new_callable=AsyncMock)
	def test_generate_guide_returns_payload(self, mock_generate_travel_guide):
		mock_generate_travel_guide.return_value = {
			"destinationName": "Lisbon",
			"summary": "Sunny and pleasant.",
		}

		response = self.client.post(
			"/api/generate-guide/",
			data='{"prompt":"Build a travel guide for Lisbon"}',
			content_type="application/json",
		)
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload["destinationName"], "Lisbon")

	def test_generate_guide_rejects_invalid_json(self):
		response = self.client.post(
			"/api/generate-guide/",
			data="not-json",
			content_type="application/json",
		)
		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertEqual(payload["error"], "VALIDATION_ERROR")

	def test_generate_guide_rejects_missing_prompt(self):
		response = self.client.post(
			"/api/generate-guide/",
			data='{"prompt":"   "}',
			content_type="application/json",
		)
		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertEqual(payload["error"], "VALIDATION_ERROR")

	@patch("apps.engine.views.generate_travel_guide", new_callable=AsyncMock)
	def test_generate_guide_returns_500_for_upstream_failure(self, mock_generate_travel_guide):
		mock_generate_travel_guide.side_effect = Exception("GEMINI_UPSTREAM_ERROR: 500")

		response = self.client.post(
			"/api/generate-guide/",
			data='{"prompt":"Build a travel guide for Lisbon"}',
			content_type="application/json",
		)
		self.assertEqual(response.status_code, 500)
		payload = response.json()
		self.assertEqual(payload["error"], "GEMINI_API_ERROR")
