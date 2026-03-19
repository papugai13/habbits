from datetime import date, datetime, timedelta

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Case, F, IntegerField, Max, Sum, Value, When
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Achievement, Category, Date, Habit, UserAll
from .serializers import (
    AchievementSerializer, CategorySerializer, DateSerializer, HabitSerializer,
    LoginSerializer, RegisterSerializer, UserAllSerializer, UserSerializer
)


class AchievementViewSet(viewsets.ModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    permission_classes = [IsAuthenticated]

    @method_decorator(ensure_csrf_cookie)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    @method_decorator(ensure_csrf_cookie)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

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


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@ensure_csrf_cookie
def dates_list(request):
    print(f"DEBUG: dates_list method={request.method} user={request.user}")
    user_profile, _ = UserAll.objects.get_or_create(
        auth_user=request.user,
        defaults={'name': request.user.username, 'age': ''}
    )
    
    if request.method == 'POST':
        # Add user to request data
        data = request.data.copy()
        data['user'] = user_profile.id
            
        serializer = DateSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # GET request: filter by user
    dates = Date.objects.filter(user=user_profile)
    serializer = DateSerializer(dates, many=True)
    return Response(serializer.data)


class HabitViewSet(viewsets.ModelViewSet):
    queryset = Habit.objects.all()
    serializer_class = HabitSerializer
    permission_classes = [IsAuthenticated]

    @method_decorator(ensure_csrf_cookie)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get_queryset(self):
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=self.request.user,
            defaults={'name': self.request.user.username, 'age': ''}
        )
        qs = Habit.objects.filter(user=user_profile).order_by('order')
        if self.action == 'list':
            return qs.filter(is_archived=False)
        return qs

    def perform_create(self, serializer):
        try:
            user_profile, _ = UserAll.objects.get_or_create(
                auth_user=self.request.user,
                defaults={
                    'name': self.request.user.username,
                    'age': ''
                }
            )
            print(f"DEBUG: HabitViewSet.perform_create user_profile={user_profile}, data={self.request.data}")
            # Assign order = max existing order + 1
            max_order = Habit.objects.filter(user=user_profile).aggregate(
                max_order=Max('order')
            )['max_order'] or 0
            serializer.save(user=user_profile, order=max_order + 1)
        except Exception as e:
            import traceback
            print(f"DEBUG: perform_create EXCEPTION: {e}")
            traceback.print_exc()
            raise

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Accept [{id, order}, ...] and bulk-update habit ordering."""
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=request.user,
            defaults={'name': request.user.username, 'age': ''}
        )
        items = request.data  # list of {id, order}
        if not isinstance(items, list):
            return Response({'error': 'Expected a list'}, status=status.HTTP_400_BAD_REQUEST)
        for item in items:
            habit_id = item.get('id')
            new_order = item.get('order')
            if habit_id is not None and new_order is not None:
                Habit.objects.filter(id=habit_id, user=user_profile).update(order=new_order)
        return Response({'status': 'ok'})

    @action(detail=True, methods=['patch'])
    def archive(self, request, pk=None):
        """Toggle is_archived for a habit."""
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=request.user,
            defaults={'name': request.user.username, 'age': ''}
        )
        habit = get_object_or_404(Habit, id=pk, user=user_profile)
        habit.is_archived = not habit.is_archived
        habit.save()
        return Response(HabitSerializer(habit).data)

    @action(detail=False, methods=['get'])
    def archived(self, request):
        """Return archived habits for the current user."""
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=request.user,
            defaults={'name': request.user.username, 'age': ''}
        )
        habits = Habit.objects.filter(user=user_profile, is_archived=True).order_by('order')
        return Response(HabitSerializer(habits, many=True).data)

    @action(detail=True, methods=['get'])
    def report(self, request, pk=None):
        habit = self.get_object()
        # Return all done dates ordered chronologically
        dates = Date.objects.filter(habit=habit, is_done=True).order_by('habit_date')
        
        entries = []
        for d in dates:
            entries.append({
                "date": d.habit_date.isoformat(),
                "quantity": d.quantity,
                "comment": d.comment,
                "photo": request.build_absolute_uri(d.photo.url) if d.photo else None
            })
            
        return Response({
            "habit": {
                "id": habit.id,
                "name": habit.name,
                "category_name": habit.category.name if habit.category else None
            },
            "entries": entries
        })

    @action(detail=False, methods=['get'])
    @method_decorator(ensure_csrf_cookie)
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
        habits = Habit.objects.filter(user=user_profile, is_archived=False).order_by('order')
        
        # Determine the start of the week
        date_param = request.query_params.get('date')
        if date_param:
            try:
                reference_date = datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                reference_date = date.today()
        else:
            reference_date = date.today()
            
        days_since_monday = reference_date.weekday()
        start_date = reference_date - timedelta(days=days_since_monday)
        end_date = start_date + timedelta(days=6)
        
        result = []
        for habit in habits:
            habit_data = HabitSerializer(habit).data
            
            # Fetch latest comment within the viewed week
            latest_date_entry = Date.objects.filter(
                user=user_profile,
                habit=habit, 
                habit_date__range=[start_date, end_date],
                comment__isnull=False
            ).exclude(comment__exact='').order_by('-habit_date').first()
            
            habit_data['latest_comment'] = None
            habit_data['latest_comment_details'] = None
            if latest_date_entry:
                habit_data['latest_comment'] = latest_date_entry.comment
                habit_data['latest_comment_details'] = {
                    "id": latest_date_entry.id,
                    "date": latest_date_entry.habit_date.isoformat(),
                    "quantity": latest_date_entry.quantity,
                    "is_done": latest_date_entry.is_done,
                    "comment": latest_date_entry.comment,
                    "photo": request.build_absolute_uri(latest_date_entry.photo.url) if latest_date_entry.photo else None
                }
            
            # Fetch latest photo within the viewed week
            latest_photo_entry = Date.objects.filter(
                user=user_profile,
                habit=habit,
                habit_date__range=[start_date, end_date]
            ).exclude(photo=None).exclude(photo='').order_by('-habit_date', '-id').first()
            
            habit_data['latest_photo'] = None
            habit_data['latest_photo_details'] = None
            if latest_photo_entry:
                habit_data['latest_photo_details'] = {
                    "id": latest_photo_entry.id,
                    "date": latest_photo_entry.habit_date.isoformat(),
                    "quantity": latest_photo_entry.quantity,
                    "is_done": latest_photo_entry.is_done,
                    "comment": latest_photo_entry.comment,
                    "photo": request.build_absolute_uri(latest_photo_entry.photo.url) if latest_photo_entry.photo else None
                }
                try:
                    photo_url = latest_photo_entry.photo.url
                    # Robust check for server environment
                    if photo_url.startswith('http'):
                        habit_data['latest_photo'] = photo_url
                    else:
                        habit_data['latest_photo'] = request.build_absolute_uri(photo_url)
                except Exception as e:
                    print(f"Error generating photo URL: {e}")
            
            # Get statuses for the range (Monday to Sunday)
            statuses = []
            for i in range(7):
                current_date = start_date + timedelta(days=i)
                date_entry = Date.objects.filter(
                    user=user_profile,
                    habit=habit,
                    habit_date=current_date
                ).first()
                statuses.append({
                    "date": current_date.isoformat(),
                    "is_done": date_entry.is_done if date_entry else False,
                    "is_restored": date_entry.is_restored if date_entry else False,
                    "id": date_entry.id if date_entry else None,
                    "quantity": date_entry.quantity if date_entry else None,
                    "comment": date_entry.comment if date_entry else None,
                    "photo": (request.build_absolute_uri(date_entry.photo.url) if (date_entry and date_entry.photo) else None)
                })
            habit_data['statuses'] = statuses
            result.append(habit_data)
            
        return Response(result)

    @action(detail=False, methods=['get'])
    def summary_report(self, request):
        try:
            user_profile, _ = UserAll.objects.get_or_create(
                auth_user=request.user,
                defaults={'name': request.user.username, 'age': ''}
            )
            habits = Habit.objects.filter(user=user_profile, is_archived=False)
            
            habit_summaries = []
            total_completions = 0
            total_quantity = 0
            
            for habit in habits:
                dates = Date.objects.filter(habit=habit, is_done=True)
                habit_completions = dates.count()
                
                # Calculate quantity for this habit
                habit_quantity = dates.aggregate(
                    total=Sum(
                        Case(
                            When(quantity__isnull=True, then=Value(1)),
                            default=F('quantity'),
                            output_field=IntegerField()
                        )
                    )
                )['total'] or 0
                
                total_completions += habit_completions
                total_quantity += habit_quantity
                
                habit_summaries.append({
                    "id": habit.id,
                    "name": habit.name,
                    "category": habit.category.name if habit.category else None,
                    "completions": habit_completions,
                    "quantity": habit_quantity
                })
                
            return Response({
                "is_general": True,
                "habit": {"name": "Общий итог"},
                "total_completions": total_completions,
                "total_quantity": total_quantity,
                "habits": habit_summaries
            })
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def daily_statistics(self, request):
        """
        Возвращает статистику выполненных привычек по дням за указанный период.
        Параметры:
        - start_date: начальная дата (формат YYYY-MM-DD), по умолчанию - 7 дней назад
        - end_date: конечная дата (формат YYYY-MM-DD), по умолчанию - сегодня
        - period: предустановленный период ('week', 'month', 'year'), переопределяет start_date/end_date
        """
        # Get or create UserAll profile for authenticated user
        user_profile, created = UserAll.objects.get_or_create(
            auth_user=request.user,
            defaults={
                'name': request.user.username,
                'age': ''
            }
        )

        # Определяем период
        date_param = request.query_params.get('date')
        if date_param:
            try:
                today = datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                today = date.today()
        else:
            today = date.today()

        period = request.query_params.get('period', None)
        
        MONTHS_RU = {
            1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
            5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
            9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
        }

        if period == 'week':
            days_since_monday = today.weekday()  # 0=Пн, 6=Вс
            start_date = today - timedelta(days=days_since_monday)
            end_date = start_date + timedelta(days=6)
            label = f"{start_date.strftime('%d.%m')} - {end_date.strftime('%d.%m')}"
        elif period == 'month':
            start_date = date(today.year, today.month, 1)
            if today.month == 12:
                next_month = date(today.year + 1, 1, 1)
            else:
                next_month = date(today.year, today.month + 1, 1)
            end_date = next_month - timedelta(days=1)
            label = f"{MONTHS_RU[start_date.month]} {start_date.year}"
        elif period == 'year':
            start_date = date(today.year, 1, 1)
            end_date = date(today.year, 12, 31)
            label = f"{start_date.year}"
        else:
            # Используем параметры start_date и end_date
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            else:
                start_date = today - timedelta(days=6)
            
            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            else:
                end_date = today

        # Получаем все привычки пользователя или одну конкретную
        habit_id = request.query_params.get('habit_id')
        if habit_id:
            habits = Habit.objects.filter(user=user_profile, id=habit_id)
        else:
            habits = Habit.objects.filter(user=user_profile)
        
        # Собираем статистику по дням или агрегированным периодам
        statistics = []
        current_date = start_date
        
        if period == 'week' or not period:
            # Daily bars
            while current_date <= end_date:
                day_dates = Date.objects.filter(
                    user=user_profile,
                    habit__in=habits,
                    habit_date=current_date,
                    is_done=True
                )
                
                completed_days = day_dates.filter(is_restored=False).count()
                restored_days = day_dates.filter(is_restored=True).count()
                extra_quantity = day_dates.filter(quantity__isnull=False).aggregate(
                    total=Sum('quantity')
                )['total'] or 0

                completed_count = (
                    day_dates.filter(quantity__isnull=True).count() + 
                    extra_quantity
                )

                # Count habits that existed by this date
                habit_count = habits.filter(created_at__lte=current_date).count()
                
                statistics.append({
                    'date': current_date.isoformat(),
                    'label': str(current_date.day),
                    'days_in_period': 1,
                    'habit_count': habit_count,
                    'completed_count': completed_count,
                    'completed_days': completed_days,
                    'restored_days': restored_days,
                    'extra_quantity': extra_quantity,
                })
                current_date += timedelta(days=1)
        
        elif period == 'month':
            # Weekly bars (7 days chunks)
            while current_date <= end_date:
                period_end = min(current_date + timedelta(days=6), end_date)
                day_dates = Date.objects.filter(
                    user=user_profile,
                    habit__in=habits,
                    habit_date__range=[current_date, period_end],
                    is_done=True
                )
                
                completed_days = day_dates.filter(is_restored=False).count()
                restored_days = day_dates.filter(is_restored=True).count()
                extra_quantity = day_dates.filter(quantity__isnull=False).aggregate(
                    total=Sum('quantity')
                )['total'] or 0

                completed_count = (
                    day_dates.filter(quantity__isnull=True).count() + 
                    extra_quantity
                )
                
                days_in_period = (period_end - current_date).days + 1

                # Count habits that existed by end of this chunk
                habit_count = habits.filter(created_at__lte=period_end).count()
                
                statistics.append({
                    'date': current_date.isoformat(),
                    'label': f"{current_date.day}-{period_end.day}",
                    'days_in_period': days_in_period,
                    'habit_count': habit_count,
                    'completed_count': completed_count,
                    'completed_days': completed_days,
                    'restored_days': restored_days,
                    'extra_quantity': extra_quantity,
                })
                current_date = period_end + timedelta(days=1)

        elif period == 'year':
            # Monthly bars (calendar months)
            while current_date <= end_date:
                # Get last day of current month
                if current_date.month == 12:
                    period_end = date(current_date.year, 12, 31)
                else:
                    period_end = date(current_date.year, current_date.month + 1, 1) - timedelta(days=1)
                
                period_end = min(period_end, end_date)
                
                day_dates = Date.objects.filter(
                    user=user_profile,
                    habit__in=habits,
                    habit_date__range=[current_date, period_end],
                    is_done=True
                )
                
                completed_days = day_dates.filter(is_restored=False).count()
                restored_days = day_dates.filter(is_restored=True).count()
                extra_quantity = day_dates.filter(quantity__isnull=False).aggregate(
                    total=Sum('quantity')
                )['total'] or 0

                completed_count = (
                    day_dates.filter(quantity__isnull=True).count() + 
                    extra_quantity
                )
                
                days_in_period = (period_end - current_date).days + 1

                # Count habits that existed by end of this month
                habit_count = habits.filter(created_at__lte=period_end).count()
                
                months_ru = {
                    1: 'Янв', 2: 'Фев', 3: 'Мар', 4: 'Апр', 5: 'Май', 6: 'Июн',
                    7: 'Июл', 8: 'Авг', 9: 'Сен', 10: 'Окт', 11: 'Ноя', 12: 'Дек'
                }
                
                statistics.append({
                    'date': current_date.isoformat(),
                    'label': months_ru[current_date.month],
                    'days_in_period': days_in_period,
                    'habit_count': habit_count,
                    'completed_count': completed_count,
                    'completed_days': completed_days,
                    'restored_days': restored_days,
                    'extra_quantity': extra_quantity,
                })
                current_date = period_end + timedelta(days=1)
        
        return Response({
            'data': statistics,
            'period_label': label
        })

    @action(detail=False, methods=['get'])
    def habit_comparison(self, request):
        """
        Returns aggregated stats for each habit over the specified period.
        """
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=request.user,
            defaults={'name': request.user.username}
        )

        # Period logic
        date_param = request.query_params.get('date')
        if date_param:
            try:
                today = datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                today = date.today()
        else:
            today = date.today()

        period = request.query_params.get('period', 'week')
        
        MONTHS_RU = {
            1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
            5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
            9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
        }
        
        if period == 'week':
            days_since_monday = today.weekday()
            start_date = today - timedelta(days=days_since_monday)
            end_date = start_date + timedelta(days=6)
            month_name = MONTHS_RU[start_date.month]
            label = f"Неделя {start_date.strftime('%d')} - {end_date.strftime('%d')} {month_name}"
        elif period == 'month':
            start_date = date(today.year, today.month, 1)
            if today.month == 12:
                next_month = date(today.year + 1, 1, 1)
            else:
                next_month = date(today.year, today.month + 1, 1)
            end_date = next_month - timedelta(days=1)
            months_ru_full = {
                1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
                5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
                9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
            }
            label = f"{months_ru_full[start_date.month]} {start_date.year}"
        elif period == 'year':
            start_date = date(today.year, 1, 1)
            end_date = date(today.year, 12, 31)
            label = f"Год ({today.year})"
        else:
            start_date = today - timedelta(days=6)
            end_date = today
            label = "Произвольный период"

        habits = Habit.objects.filter(user=user_profile, is_archived=False)
        statistics = []

        for habit in habits:
            day_dates = Date.objects.filter(
                user=user_profile,
                habit=habit,
                habit_date__range=[start_date, end_date],
                is_done=True
            )
            
            # Count days
            completed_days = day_dates.filter(is_restored=False).count()
            restored_days = day_dates.filter(is_restored=True).count()
            
            # Sum quantity
            extra_quantity = day_dates.filter(quantity__isnull=False).aggregate(
                total=Sum('quantity')
            )['total'] or 0

            # Show all active habits (user request: "показывать привычку даже если она не отмечена")
            statistics.append({
                'id': habit.id,
                'name': habit.name,
                'completed_days': completed_days,
                'restored_days': restored_days,
                'extra_quantity': extra_quantity,
            })

        return Response({
            'period_label': label,
            'habits': statistics
        })

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@ensure_csrf_cookie
def api_dates_detail(request, pk):
    print(f"DEBUG: api_dates_detail pk={pk} method={request.method} user={request.user}")
    # Ensure user profile exists
    user_profile, _ = UserAll.objects.get_or_create(
        auth_user=request.user,
        defaults={'name': request.user.username, 'age': ''}
    )
    
    post = get_object_or_404(Date, id=pk)
    
    # Check ownership
    if post.user != user_profile:
        print(f"DEBUG: Ownership mismatch! post.user={post.user.id} user_profile={user_profile.id}")
        return Response(
            {"detail": "У вас нет прав для изменения этой записи."}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
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
    
    @method_decorator(ensure_csrf_cookie)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

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
    
    @method_decorator(ensure_csrf_cookie)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

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
    """Получение и обновление данных текущего пользователя"""
    permission_classes = [IsAuthenticated]
    
    @method_decorator(ensure_csrf_cookie)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

