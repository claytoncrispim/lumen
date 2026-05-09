from django.test import TestCase
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
