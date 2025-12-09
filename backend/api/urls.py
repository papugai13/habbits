from api import views

from django.urls import path

from .views import userall_list

urlpatterns = [
    path('', views.index),
    path('userall', userall_list)
]
