from api import views
from django.urls import path
from . views import dates_list

urlpatterns = [
    path('', views.index),
    path('v1/dates/', views.dates_list),
]
