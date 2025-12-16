from api import views
from django.urls import path
from . views import dates_list, userall_list

urlpatterns = [
    path('', views.index),
    path('v1/dates/', views.dates_list),
    path('api/v1/dates/<int:pk>/', views.api_dates_detail),
    path('v1/userall/', views.userall_list),
]
