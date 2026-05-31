from .views import get_weather, location_detail, locations_list
from django.urls import path

urlpatterns = [
    path('api/locations/', locations_list),
    path('api/locations/<str:city_name>/', location_detail), 
    path('api/weather/<str:city_name>/', get_weather),  # Future endpoint for weather data
]