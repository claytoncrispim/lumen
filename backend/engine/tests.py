from django.test import TestCase
from .models import Location, SafetyIndex


class EngineModelsSmokeTest(TestCase):
	def test_can_create_location(self):
		location = Location.objects.create(
			iata_code="LHR",
			city_name="London",
			country_name="United Kingdom",
		)

		self.assertEqual(location.iata_code, "LHR")
		self.assertEqual(str(location), "London (LHR)")

	def test_can_create_safety_index_for_location(self):
		location = Location.objects.create(
			iata_code="JFK",
			city_name="New York",
			country_name="United States",
		)

		safety = SafetyIndex.objects.create(
			location=location,
			score=78,
			legal_status="Marriage equality and anti-discrimination protections exist.",
			social_vibe="Large visible community and venues.",
			travel_alerts="",
		)

		self.assertEqual(safety.location, location)
		self.assertIn("New York", str(safety))

	def test_location_has_one_safety_index(self):
		location = Location.objects.create(
			iata_code="AMS",
			city_name="Amsterdam",
			country_name="Netherlands",
		)

		SafetyIndex.objects.create(
			location=location,
			score=90,
			legal_status="Strong legal framework.",
			social_vibe="High acceptance in central areas.",
			travel_alerts="",
		)

		safety = SafetyIndex.objects.get(location=location)
		self.assertEqual(safety.score, 90)
