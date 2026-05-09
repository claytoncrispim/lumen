from .views import locations_list
from django.urls import path

urlpatterns = [
    path('api/locations/', locations_list)
]