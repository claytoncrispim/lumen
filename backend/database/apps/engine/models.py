from django.db import models

class Location(models.Model):
    """DB 1: Local IATA Database"""
    iata_code = models.CharField(max_length=3, unique=True, primary_key=True)
    airport_name = models.CharField(max_length=150, blank=True, default='')
    city_name = models.CharField(max_length=100)
    country_name = models.CharField(max_length=100)
    country_code = models.CharField(max_length=2)
    
    def __str__(self):
        return f"{self.city_name} ({self.iata_code})"

class SafetyIndex(models.Model):
    """DB 2: Spartacus-based LGBTQ+ ratings"""
    country_code = models.CharField(max_length=2, unique=True)
    country_name = models.CharField(max_length=100)
    score = models.SmallIntegerField(default=0)
    last_updated = models.DateField(auto_now=True)
    
    # These fields will feed the 'Safety Pill' bullet points
    legal_status = models.TextField()
    social_vibe = models.TextField()
    travel_alerts = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Safety for {self.country_name}: {self.score}"