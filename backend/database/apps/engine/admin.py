from django.contrib import admin
from .models import Location, SafetyIndex


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
	list_display = ("iata_code", "city_name", "country_name")
	search_fields = ("iata_code", "city_name", "country_name")


@admin.register(SafetyIndex)
class SafetyIndexAdmin(admin.ModelAdmin):
	list_display = ("country_code", "country_name", "score", "last_updated")
	search_fields = ("country_code", "country_name")
