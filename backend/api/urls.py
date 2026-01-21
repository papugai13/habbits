from api import views
from django.urls import path, include

from rest_framework.routers import SimpleRouter


router_v1 = SimpleRouter()
router_v1.register('v1/habits', views.HabitViewSet)
router_v1.register('v1/achievement', views.AchievementViewSet)

urlpatterns = [
    path('', views.index),
    path('v1/dates/', views.dates_list),
    path('v1/date/<int:pk>/', views.api_dates_detail),
    path('v1/userall/', views.userall_list),
    path('v1/user/<int:pk>/', views.api_userall_detail),
    # Authentication endpoints
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('', include(router_v1.urls)),
]
