from .views import location_detail, locations_list
from django.urls import path

urlpatterns = [
    path('api/locations/', locations_list),
    path('api/locations/<str:city_name>/', location_detail), 
]