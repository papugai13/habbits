from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from datetime import date, timedelta

from . models import Achievement, Date, Habit, UserAll, Category
from .serializers import (
    AchievementSerializer, DateSerializer, HabitSerializer, 
    UserAllSerializer, UserSerializer, RegisterSerializer, LoginSerializer,
    CategorySerializer
)


class HabitViewSet(viewsets.ModelViewSet):
    queryset = Habit.objects.all()
    serializer_class = HabitSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Get or create UserAll profile for authenticated user
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=self.request.user,
            defaults={
                'name': self.request.user.username,
                'age': ''
            }
        )
        serializer.save(user=user_profile)

    @action(detail=False, methods=['get'])
    def weekly_status(self, request):
        # Get or create UserAll profile for authenticated user
        user_profile, created = UserAll.objects.get_or_create(
            auth_user=request.user,
            defaults={
                'name': request.user.username,
                'age': ''
            }
        )

        # Get habits for this user
        habits = Habit.objects.filter(user=user_profile)
        
        # We'll return status for the last 7 days including today
        today = date.today()
        start_date = today - timedelta(days=6)
        
        result = []
        for habit in habits:
            habit_data = HabitSerializer(habit).data
            # Get statuses for the range
            statuses = []
            for i in range(7):
                current_date = start_date + timedelta(days=i)
                date_entry = Date.objects.filter(habit=habit, habit_date=current_date).first()
                statuses.append({
                    "date": current_date.isoformat(),
                    "is_done": date_entry.is_done if date_entry else False,
                    "id": date_entry.id if date_entry else None
                })
            habit_data['statuses'] = statuses
            result.append(habit_data)
            
        return Response(result)

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=self.request.user,
            defaults={'name': self.request.user.username, 'age': ''}
        )
        return Category.objects.filter(user=user_profile)

    def perform_create(self, serializer):
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=self.request.user,
            defaults={'name': self.request.user.username, 'age': ''}
        )
        serializer.save(user=user_profile)

class AchievementViewSet(viewsets.ModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer

@api_view(['GET', 'POST'])
def dates_list(request):
    if request.method == 'POST':
        # Get or create UserAll profile for authenticated user
        if request.user.is_authenticated:
            user_profile, _ = UserAll.objects.get_or_create(
                auth_user=request.user,
                defaults={
                    'name': request.user.username,
                    'age': ''
                }
            )
            # Add user to request data
            data = request.data.copy()
            data['user'] = user_profile.id
        else:
            data = request.data
            
        serializer = DateSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    cats = Date.objects.all()
    serializer = DateSerializer(cats, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def api_dates_detail(request, pk):
    post = get_object_or_404(Date, id=pk)
    if request.method == 'PUT' or request.method == 'PATCH':
        serializer = DateSerializer(post, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = DateSerializer(post)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
def userall_list(request):
    if request.method == 'POST':
        serializer = UserAllSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    usersall = UserAll.objects.all()
    serializer = UserAllSerializer(usersall, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def api_userall_detail(request, pk):
    post = get_object_or_404(UserAll, id=pk)
    if request.method == 'PUT' or request.method == 'PATCH':
        serializer = UserAllSerializer(post, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = UserAllSerializer(post)
    return Response(serializer.data)

def index(request):
    return HttpResponse('Апи работает')


# Authentication Views
class RegisterView(APIView):
    """Регистрация нового пользователя"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Автоматический вход после регистрации
            login(request, user)
            return Response(
                UserSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """Вход в систему"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return Response(
                    UserSerializer(user).data,
                    status=status.HTTP_200_OK
                )
            return Response(
                {'error': 'Неверное имя пользователя или пароль'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """Выход из системы"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logout(request)
        return Response(
            {'message': 'Успешный выход'},
            status=status.HTTP_200_OK
        )


class CurrentUserView(APIView):
    """Получение данных текущего пользователя"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

