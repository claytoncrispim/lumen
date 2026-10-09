from .views import get_weather, llm_health, location_detail, locations_list, ping, location_airport_resolve
from django.urls import path
from .views import generate_guide

urlpatterns = [
    path('api/ping/', ping),
    path('api/health/llm/', llm_health),
    path('api/locations/', locations_list),
    path('api/locations/resolve/query=<str:query>/', location_airport_resolve),
    path('api/locations/<str:city_name>/', location_detail), 
    path('api/weather/<str:city_name>/', get_weather), 
    path('api/generate-guide/', generate_guide),
]