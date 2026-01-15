from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework import generics, status, viewsets
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from datetime import date, timedelta

from . models import Date, Habit, UserAll
from .serializers import DateSerializer, HabitSerializer, UserAllSerializer


class HabitViewSet(viewsets.ModelViewSet):
    queryset = Habit.objects.all()
    serializer_class = HabitSerializer

    @action(detail=False, methods=['get'])
    def weekly_status(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            # Fallback to first user for demo purposes if no user_id provided
            user = UserAll.objects.first()
        else:
            user = get_object_or_404(UserAll, id=user_id)

        if not user:
            return Response({"error": "No user found"}, status=status.HTTP_404_NOT_FOUND)

        # Get habits for this user
        habits = Habit.objects.filter(user=user)
        
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


@api_view(['GET', 'POST'])
def dates_list(request):
    if request.method == 'POST':
        serializer = DateSerializer(data=request.data)
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
