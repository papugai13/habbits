from datetime import date, datetime, timedelta

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Case, F, IntegerField, Max, Min, Sum, Value, When
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Achievement, Category, Date, Habit, UserAll, ReminderSettings, PushSubscription
from .serializers import (
    AchievementSerializer, CategorySerializer, DateSerializer, HabitSerializer,
    LoginSerializer, RegisterSerializer, UserAllSerializer, UserSerializer,
    ReminderSettingsSerializer, PushSubscriptionSerializer
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
        qs = Category.objects.filter(user=user_profile).order_by('order')
        if self.action == 'list':
            return qs.filter(is_archived=False)
        return qs

    def perform_create(self, serializer):
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=self.request.user,
            defaults={'name': self.request.user.username, 'age': ''}
        )
        max_order = Category.objects.filter(user=user_profile).aggregate(
            max_order=Max('order')
        )['max_order'] or 0
        serializer.save(user=user_profile, order=max_order + 1)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Accept [{id, order}, ...] and bulk-update category ordering."""
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=request.user,
            defaults={'name': request.user.username, 'age': ''}
        )
        items = request.data  # list of {id, order}
        if not isinstance(items, list):
            return Response({'error': 'Expected a list'}, status=status.HTTP_400_BAD_REQUEST)
        for item in items:
            category_id = item.get('id')
            new_order = item.get('order')
            if category_id is not None and new_order is not None:
                Category.objects.filter(id=category_id, user=user_profile).update(order=new_order)
        return Response({'status': 'ok'})

    @action(detail=True, methods=['patch', 'post'])
    def archive(self, request, pk=None):
        """Toggle is_archived for a category and keep its habits in sync."""
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=request.user,
            defaults={'name': request.user.username, 'age': ''}
        )
        category = get_object_or_404(Category, id=pk, user=user_profile)
        category.is_archived = not category.is_archived
        category.save(update_fields=['is_archived'])
        Habit.objects.filter(user=user_profile, category=category).update(
            is_archived=category.is_archived
        )
        return Response(CategorySerializer(category).data)

    @action(detail=False, methods=['get'])
    def archived(self, request):
        """Return archived categories for the current user."""
        user_profile, _ = UserAll.objects.get_or_create(
            auth_user=request.user,
            defaults={'name': request.user.username, 'age': ''}
        )
        categories = Category.objects.filter(user=user_profile, is_archived=True).order_by('order')
        return Response(CategorySerializer(categories, many=True).data)


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

    @action(detail=True, methods=['patch', 'post'])
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
        period = request.query_params.get('period', 'day')
        # date_param is used for the reference point (which week, which month, which year)
        date_param = request.query_params.get('date', date.today().isoformat())
        try:
            today = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            today = date.today()

        # Date ranges based on period
        if period == 'day':
            # Week range (current week)
            days_since_monday = today.weekday()
            start_date = today - timedelta(days=days_since_monday)
            end_date = start_date + timedelta(days=6)
            
            # Return daily entries (with comments/photos)
            dates = Date.objects.filter(habit=habit, habit_date__range=[start_date, end_date], is_done=True).order_by('habit_date')
            entries = []
            for d in dates:
                entries.append({
                    "date": d.habit_date.isoformat(),
                    "quantity": d.quantity,
                    "comment": d.comment,
                    "photo": request.build_absolute_uri(d.photo.url) if d.photo else None
                })
            return Response({
                "habit": {"id": habit.id, "name": habit.name},
                "period": period,
                "entries": entries
            })
            
        elif period == 'week':
            # Monthly range (current month, broken by weeks)
            start_date = date(today.year, today.month, 1)
            if today.month == 12:
                next_month = date(today.year + 1, 1, 1)
            else:
                next_month = date(today.year, today.month + 1, 1)
            end_date = next_month - timedelta(days=1)
            
            items = []
            curr = start_date
            while curr <= end_date:
                # Find Monday of this week range
                monday = curr - timedelta(days=curr.weekday())
                sunday = monday + timedelta(days=6)
                monday_in_month = max(monday, start_date)
                sunday_in_month = min(sunday, end_date)
                
                # Check if this "chunk" is already handled (if range overlaps weeks)
                # But we'll just use calendar weeks for simplicity
                week_dates = Date.objects.filter(habit=habit, habit_date__range=[monday, sunday], is_done=True)
                
                # We show week label as Mon-Sun
                label = f"{monday.strftime('%d.%m')} - {sunday.strftime('%d.%m')}"
                
                completions = week_dates.filter(is_restored=False).count()
                quantity = week_dates.aggregate(
                    total=Sum(Case(When(quantity__isnull=True, then=Value(1)), default=F('quantity'), output_field=IntegerField()))
                )['total'] or 0
                
                items.append({
                    "label": label,
                    "completions": completions,
                    "quantity": quantity
                })
                # Skip to next Monday
                curr = sunday + timedelta(days=1)
                
            return Response({"habit": {"id": habit.id, "name": habit.name}, "period": period, "items": items})

        elif period == 'month':
            # Yearly range (current year, broken by months)
            items = []
            months_ru = {1: 'Янв', 2: 'Фев', 3: 'Мар', 4: 'Апр', 5: 'Май', 6: 'Июн', 7: 'Июл', 8: 'Авг', 9: 'Сен', 10: 'Окт', 11: 'Ноя', 12: 'Дек'}
            for m in range(1, 13):
                m_start = date(today.year, m, 1)
                if m == 12:
                    m_end = date(today.year, 12, 31)
                else:
                    m_end = date(today.year, m + 1, 1) - timedelta(days=1)
                
                month_dates = Date.objects.filter(habit=habit, habit_date__range=[m_start, m_end], is_done=True)
                completions = month_dates.filter(is_restored=False).count()
                quantity = month_dates.aggregate(
                    total=Sum(Case(When(quantity__isnull=True, then=Value(1)), default=F('quantity'), output_field=IntegerField()))
                )['total'] or 0
                
                items.append({
                    "label": months_ru[m],
                    "completions": completions,
                    "quantity": quantity
                })
            return Response({"habit": {"id": habit.id, "name": habit.name}, "period": period, "items": items})

        elif period == 'year':
            # All years
            items = []
            earliest_date = Date.objects.filter(habit=habit).aggregate(Min('habit_date'))['habit_date__min']
            if not earliest_date:
                earliest_date = date.today()
            
            for y in range(earliest_date.year, date.today().year + 1):
                y_start = date(y, 1, 1)
                y_end = date(y, 12, 31)
                
                year_dates = Date.objects.filter(habit=habit, habit_date__range=[y_start, y_end], is_done=True)
                completions = year_dates.filter(is_restored=False).count()
                quantity = year_dates.aggregate(
                    total=Sum(Case(When(quantity__isnull=True, then=Value(1)), default=F('quantity'), output_field=IntegerField()))
                )['total'] or 0
                
                items.append({
                    "label": str(y),
                    "completions": completions,
                    "quantity": quantity
                })
            return Response({"habit": {"id": habit.id, "name": habit.name}, "period": period, "items": items})

        return Response({"error": "Invalid period"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    @method_decorator(ensure_csrf_cookie)
    def weekly_status(self, request):
        try:
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
            
            # Monthly range anchored to the start of the week
            start_of_month = date(start_date.year, start_date.month, 1)
            if start_date.month == 12:
                next_month = date(start_date.year + 1, 1, 1)
            else:
                next_month = date(start_date.year, start_date.month + 1, 1)
            end_of_month = next_month - timedelta(days=1)
            
            result = []
            for habit in habits:
                try:
                    habit_data = HabitSerializer(habit).data
                    
                    # Fetch latest comment within the viewed week
                    latest_date_entry = Date.objects.filter(
                        user=user_profile,
                        habit=habit,
                        habit_date__range=[start_date, end_date],
                        comment__isnull=False
                    ).exclude(comment__exact='').order_by('-habit_date').first()

                    # If no comment in current week, check previous Sunday (carry over to Monday)
                    if not latest_date_entry:
                        prev_sunday = start_date - timedelta(days=1)  # Sunday of previous week
                        latest_date_entry = Date.objects.filter(
                            user=user_profile,
                            habit=habit,
                            habit_date=prev_sunday,
                            comment__isnull=False
                        ).exclude(comment__exact='').first()

                    # Check previous week for streak continuation (Sunday and Saturday)
                    prev_sun = start_date - timedelta(days=1)
                    prev_sat = start_date - timedelta(days=2)
                    prev_fri = start_date - timedelta(days=3)
                    habit_data['prev_week_sun_done'] = Date.objects.filter(user=user_profile, habit=habit, habit_date=prev_sun, is_done=True).exists()
                    habit_data['prev_week_sat_done'] = Date.objects.filter(user=user_profile, habit=habit, habit_date=prev_sat, is_done=True).exists()
                    habit_data['prev_week_fri_done'] = Date.objects.filter(user=user_profile, habit=habit, habit_date=prev_fri, is_done=True).exists()

                    # Count previous week completions for dot transition
                    prev_week_start = start_date - timedelta(days=7)
                    habit_data['prev_week_count'] = Date.objects.filter(
                        user=user_profile,
                        habit=habit,
                        habit_date__range=[prev_week_start, prev_sun],
                        is_done=True,
                        is_restored=False
                    ).count()
                    
                    habit_data['latest_comment'] = None
                    habit_data['latest_comment_details'] = None
                    if latest_date_entry:
                        habit_data['latest_comment'] = latest_date_entry.comment
                        photo_url = None
                        if latest_date_entry.photo:
                            try:
                                photo_url = request.build_absolute_uri(latest_date_entry.photo.url)
                            except Exception:
                                pass
                                
                        habit_data['latest_comment_details'] = {
                            "id": latest_date_entry.id,
                            "date": latest_date_entry.habit_date.isoformat(),
                            "quantity": latest_date_entry.quantity,
                            "is_done": latest_date_entry.is_done,
                            "comment": latest_date_entry.comment,
                            "photo": photo_url
                        }
                    
                    # Fetch latest photo within the viewed week
                    latest_photo_entry = Date.objects.filter(
                        user=user_profile,
                        habit=habit,
                        habit_date__range=[start_date, end_date]
                    ).exclude(photo=None).exclude(photo='').order_by('-habit_date', '-id').first()

                    # If no photo in current week, check previous Sunday (carry over to Monday)
                    if not latest_photo_entry:
                        prev_sunday = start_date - timedelta(days=1)  # Sunday of previous week
                        latest_photo_entry = Date.objects.filter(
                            user=user_profile,
                            habit=habit,
                            habit_date=prev_sunday
                        ).exclude(photo=None).exclude(photo='').first()
                    
                    habit_data['latest_photo'] = None
                    habit_data['latest_photo_details'] = None
                    if latest_photo_entry:
                        photo_url = None
                        if latest_photo_entry.photo:
                            try:
                                photo_url = request.build_absolute_uri(latest_photo_entry.photo.url)
                            except Exception:
                                pass

                        habit_data['latest_photo_details'] = {
                            "id": latest_photo_entry.id,
                            "date": latest_photo_entry.habit_date.isoformat(),
                            "quantity": latest_photo_entry.quantity,
                            "is_done": latest_photo_entry.is_done,
                            "comment": latest_photo_entry.comment,
                            "photo": photo_url
                        }
                        habit_data['latest_photo'] = photo_url
                    
                    # Detect if habit has quantity tracking at all
                    has_quantity_tracking = Date.objects.filter(
                        user=user_profile,
                        habit=habit,
                        quantity__gt=0
                    ).exists()

                    # Get statuses for the range (Monday to Sunday)
                    statuses = []
                    weekly_overflow = 0
                    for i in range(7):
                        current_date = start_date + timedelta(days=i)
                        date_entry = Date.objects.filter(
                            user=user_profile,
                            habit=habit,
                            habit_date=current_date
                        ).first()
                        
                        is_done = date_entry.is_done if date_entry else False
                        qty = date_entry.quantity if date_entry else None
                        
                        if is_done and date_entry and has_quantity_tracking and qty and qty > 0:
                            weekly_overflow += qty
                        
                        photo_url = None
                        if date_entry and date_entry.photo:
                            try:
                                photo_url = request.build_absolute_uri(date_entry.photo.url)
                            except Exception:
                                pass

                        statuses.append({
                            "date": current_date.isoformat(),
                            "is_done": is_done,
                            "is_restored": date_entry.is_restored if date_entry else False,
                            "id": date_entry.id if date_entry else None,
                            "quantity": qty,
                            "comment": date_entry.comment if date_entry else None,
                            "photo": photo_url
                        })
                    habit_data['statuses'] = statuses
                    habit_data['weekly_overflow'] = weekly_overflow
                    
                    # Calculate monthly overflow (sum of positive quantities only)
                    monthly_overflow = 0
                    if has_quantity_tracking:
                        monthly_overflow = Date.objects.filter(
                            user=user_profile,
                            habit=habit,
                            habit_date__range=[start_of_month, end_of_month],
                            is_done=True,
                            quantity__gte=1
                        ).aggregate(
                            total=Sum('quantity')
                        )['total'] or 0
                    
                    # Calculate monthly total (ONLY on-time completions, daily count)
                    monthly_total = Date.objects.filter(
                        user=user_profile,
                        habit=habit,
                        habit_date__range=[start_of_month, end_of_month],
                        is_done=True,
                        is_restored=False
                    ).count()
                    
                    habit_data['monthly_overflow'] = monthly_overflow
                    habit_data['monthly_total'] = monthly_total

                    weekly_completions = Date.objects.filter(
                        user=user_profile,
                        habit=habit,
                        habit_date__range=[start_date, end_date],
                        is_done=True,
                        is_restored=False
                    ).count()

                    # Calculate crown streak (consecutive weeks of 7/7 on-time completions)
                    crown_streak = 0
                    temp_week_start = start_date
                    # Limit lookback to prevent excessive queries
                    for _ in range(100):
                        week_completions = Date.objects.filter(
                            user=user_profile,
                            habit=habit,
                            habit_date__range=[temp_week_start, temp_week_start + timedelta(days=6)],
                            is_done=True,
                            is_restored=False
                        ).count()
                        
                        if week_completions >= 7:
                            crown_streak += 1
                            temp_week_start -= timedelta(days=7)
                        else:
                            break
                    habit_data['crown_streak'] = crown_streak

                    weekly_award_streak = crown_streak if weekly_completions >= 7 else 1
                    if weekly_completions in [3, 4, 5, 6]:
                        temp_week_start = start_date - timedelta(days=7)
                        while True:
                            prev_week_completions = Date.objects.filter(
                                user=user_profile,
                                habit=habit,
                                habit_date__range=[temp_week_start, temp_week_start + timedelta(days=6)],
                                is_done=True,
                                is_restored=False
                            ).count()
                            if prev_week_completions >= 7:
                                weekly_award_streak += 1
                                temp_week_start -= timedelta(days=7)
                            else:
                                break
                    habit_data['weekly_award_streak'] = weekly_award_streak
                    
                    result.append(habit_data)
                except Exception as habit_e:
                    import traceback
                    print(f"ERROR: processing habit {habit.id}: {habit_e}")
                    traceback.print_exc()
                    # Skip problematic habit or add partial data
                    continue
                
            return Response(result)
        except Exception as e:
            import traceback
            print(f"CRITICAL ERROR in weekly_status: {e}")
            traceback.print_exc()
            return Response(
                {"error": str(e), "detail": traceback.format_exc()}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


    @action(detail=False, methods=['get'])
    def summary_report(self, request):
        try:
            user_profile, _ = UserAll.objects.get_or_create(
                auth_user=request.user,
                defaults={'name': request.user.username, 'age': ''}
            )
            period = request.query_params.get('period', 'all')
            date_param = request.query_params.get('date', date.today().isoformat())
            try:
                today = datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                today = date.today()

            habits = Habit.objects.filter(user=user_profile, is_archived=False)
            
            # Default "all" view (Original habit-based list)
            if period == 'all':
                habit_summaries = []
                total_completions = 0
                total_quantity = 0
                for habit in habits:
                    dates = Date.objects.filter(habit=habit, is_done=True)
                    habit_completions = dates.filter(is_restored=False).count()
                    habit_quantity = dates.aggregate(
                        total=Sum(Case(When(quantity__isnull=True, then=Value(1)), default=F('quantity'), output_field=IntegerField()))
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
                    "is_general": True, "period": "all",
                    "habit": {"name": "Общий итог"},
                    "total_completions": total_completions, "total_quantity": total_quantity,
                    "habits": habit_summaries
                })

            # New Period-based views (Grouped by Date/Week/Month/Year)
            items = []
            if period == 'day':
                # Last 7 days including today, or current week
                days_since_monday = today.weekday()
                start_date = today - timedelta(days=days_since_monday)
                end_date = start_date + timedelta(days=6)
                
                curr = start_date
                while curr <= end_date:
                    day_dates = Date.objects.filter(user=user_profile, habit__in=habits, habit_date=curr, is_done=True)
                    items.append({
                        "label": curr.strftime('%d.%m'),
                        "completions": day_dates.filter(is_restored=False).count(),
                        "quantity": day_dates.aggregate(total=Sum(Case(When(quantity__isnull=True, then=Value(1)), default=F('quantity'), output_field=IntegerField())))['total'] or 0
                    })
                    curr += timedelta(days=1)
            
            elif period == 'week':
                # Weeks of current month
                start_date = date(today.year, today.month, 1)
                if today.month == 12:
                    next_month = date(today.year + 1, 1, 1)
                else:
                    next_month = date(today.year, today.month + 1, 1)
                end_date = next_month - timedelta(days=1)
                
                curr = start_date
                while curr <= end_date:
                    monday = curr - timedelta(days=curr.weekday())
                    sunday = monday + timedelta(days=6)
                    week_dates = Date.objects.filter(user=user_profile, habit__in=habits, habit_date__range=[monday, sunday], is_done=True)
                    items.append({
                        "label": f"{monday.strftime('%d.%m')} - {sunday.strftime('%d.%m')}",
                        "completions": week_dates.filter(is_restored=False).count(),
                        "quantity": week_dates.aggregate(total=Sum(Case(When(quantity__isnull=True, then=Value(1)), default=F('quantity'), output_field=IntegerField())))['total'] or 0
                    })
                    curr = sunday + timedelta(days=1)

            elif period == 'month':
                months_ru = {1: 'Янв', 2: 'Фев', 3: 'Мар', 4: 'Апр', 5: 'Май', 6: 'Июн', 7: 'Июл', 8: 'Авг', 9: 'Сен', 10: 'Окт', 11: 'Ноя', 12: 'Дек'}
                for m in range(1, 13):
                    m_start = date(today.year, m, 1)
                    if m == 12:
                        m_end = date(today.year, 12, 31)
                    else:
                        m_end = date(today.year, m + 1, 1) - timedelta(days=1)
                    month_dates = Date.objects.filter(user=user_profile, habit__in=habits, habit_date__range=[m_start, m_end], is_done=True)
                    items.append({
                        "label": months_ru[m],
                        "completions": month_dates.filter(is_restored=False).count(),
                        "quantity": month_dates.aggregate(total=Sum(Case(When(quantity__isnull=True, then=Value(1)), default=F('quantity'), output_field=IntegerField())))['total'] or 0
                    })

            elif period == 'year':
                earliest_date = Date.objects.filter(user=user_profile).aggregate(Min('habit_date'))['habit_date__min'] or date.today()
                for y in range(earliest_date.year, date.today().year + 1):
                    y_start = date(y, 1, 1)
                    y_end = date(y, 12, 31)
                    year_dates = Date.objects.filter(user=user_profile, habit__in=habits, habit_date__range=[y_start, y_end], is_done=True)
                    items.append({
                        "label": str(y),
                        "completions": year_dates.filter(is_restored=False).count(),
                        "quantity": year_dates.aggregate(total=Sum(Case(When(quantity__isnull=True, then=Value(1)), default=F('quantity'), output_field=IntegerField())))['total'] or 0
                    })

            return Response({
                "is_general": True, "period": period,
                "habit": {"name": "Общий итог"},
                "items": items
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_streak_history(self, habit, start_date, end_date):
        """
        Calculates streak history for a habit.
        A streak becomes active after 2 consecutive hits.
        A streak becomes inactive after 2 consecutive misses.
        """
        # Look back at least 2 days before start_date to determine initial state
        lookback_start = habit.start_date or (start_date - timedelta(days=7))
        if lookback_start > start_date - timedelta(days=7):
            lookback_start = start_date - timedelta(days=7)
            
        dates = Date.objects.filter(user=habit.user, habit=habit, habit_date__range=[lookback_start, end_date], is_done=True).values_list('habit_date', flat=True)
        done_dates = set(dates)
        
        streak_active = False
        consecutive_hits = 0
        consecutive_misses = 0
        
        streak_history = {} # date -> bool
        
        curr = lookback_start
        while curr <= end_date:
            is_done = curr in done_dates
            if is_done:
                consecutive_hits += 1
                consecutive_misses = 0
                if consecutive_hits >= 2:
                    streak_active = True
            else:
                consecutive_hits = 0
                consecutive_misses += 1
                if consecutive_misses >= 2:
                    streak_active = False
            
            if curr >= start_date:
                streak_history[curr] = streak_active
                
            curr += timedelta(days=1)
        return streak_history

    @action(detail=False, methods=['get'])
    def daily_statistics(self, request):
        try:
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

            if period == 'day' or (not period and not request.query_params.get('start_date')):
                # Calendar week (Monday to Sunday) containing the specified date
                days_since_monday = today.weekday()
                start_date = today - timedelta(days=days_since_monday)
                end_date = start_date + timedelta(days=6)
                label = f"{start_date.strftime('%d.%m')} - {end_date.strftime('%d.%m')}"
            elif period == 'week':
                # Weeks of the month: start from Monday of the week containing the 1st
                first_of_month = date(today.year, today.month, 1)
                days_since_monday = first_of_month.weekday()
                start_date = first_of_month - timedelta(days=days_since_monday)
                if today.month == 12:
                    next_month = date(today.year + 1, 1, 1)
                else:
                    next_month = date(today.year, today.month + 1, 1)
                end_date = next_month - timedelta(days=1)
                label = f"Недели: {MONTHS_RU[today.month]} {today.year}"
            elif period == 'month':
                first_of_month = date(today.year, today.month, 1)
                days_since_monday = first_of_month.weekday()
                start_date = first_of_month - timedelta(days=days_since_monday)
                
                if today.month == 12:
                    next_month = date(today.year + 1, 1, 1)
                else:
                    next_month = date(today.year, today.month + 1, 1)
                end_date = next_month - timedelta(days=1)
                label = f"{MONTHS_RU[today.month]} {today.year}"
            elif period == 'year':
                # For yearly period, we always show last 5 years relative to the selected year
                start_date = date(today.year - 4, 1, 1)
                end_date = date(today.year, 12, 31)
                label = f"{start_date.year} - {end_date.year}"
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
            category_name = request.query_params.get('category')
            
            habits = Habit.objects.filter(user=user_profile)
            if habit_id:
                habits = habits.filter(id=habit_id)
            if category_name and category_name != 'Все':
                if category_name == 'Без категории':
                    habits = habits.filter(category__isnull=True)
                else:
                    habits = habits.filter(category__name=category_name)
            
            # Pre-calculate streaks for all selected habits
            all_streak_histories = {}
            for habit in habits:
                all_streak_histories[habit.id] = self._get_streak_history(habit, start_date, end_date)

            # Собираем статистику по дням или агрегированным периодам
            statistics = []
            current_date = start_date
            
            if period == 'day' or not period:
                # Daily bars (Showing the week containing start_date)
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
                    habit_count = habits.filter(start_date__lte=current_date).count()
                    
                    # Streak count for this day
                    streak_count = 0
                    for habit_id, history in all_streak_histories.items():
                        if history.get(current_date):
                            streak_count += 1

                    statistics.append({
                        'date': current_date.isoformat(),
                        'label': str(current_date.day),
                        'days_in_period': 1,
                        'habit_count': habit_count,
                        'completed_count': completed_count,
                        'completed_days': completed_days,
                        'restored_days': restored_days,
                        'extra_quantity': extra_quantity,
                        'streak_count': streak_count,
                    })
                    current_date += timedelta(days=1)
            
            elif period == 'week':
                # Weekly aggregation (Bars = Week groups of the month)
                while current_date <= end_date:
                    period_end = current_date + timedelta(days=6)
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
                    habit_count = habits.filter(start_date__lte=period_end).count()
                    
                    # Streak count for this week (total marks across all habits)
                    streak_count = 0
                    c_date = current_date
                    while c_date <= period_end:
                        for habit_id, history in all_streak_histories.items():
                            if history.get(c_date):
                                streak_count += 1
                        c_date += timedelta(days=1)

                    statistics.append({
                        'date': current_date.isoformat(),
                        'label': f"{current_date.day}-{period_end.day}",
                        'days_in_period': days_in_period,
                        'habit_count': habit_count,
                        'completed_count': completed_count,
                        'completed_days': completed_days,
                        'restored_days': restored_days,
                        'extra_quantity': extra_quantity,
                        'streak_count': streak_count,
                    })
                    current_date = period_end + timedelta(days=1)

            elif period == 'month':
                # Monthly aggregation (Bars = months)
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
                    habit_count = habits.filter(start_date__lte=period_end).count()
                    
                    months_ru = {
                        1: 'Янв', 2: 'Фев', 3: 'Мар', 4: 'Апр', 5: 'Май', 6: 'Июн',
                        7: 'Июл', 8: 'Авг', 9: 'Сен', 10: 'Окт', 11: 'Ноя', 12: 'Дек'
                    }
                    
                    # Streak count for this month
                    streak_count = 0
                    c_date = current_date
                    while c_date <= period_end:
                        for habit_id, history in all_streak_histories.items():
                            if history.get(c_date):
                                streak_count += 1
                        c_date += timedelta(days=1)

                    statistics.append({
                        'date': current_date.isoformat(),
                        'label': months_ru[current_date.month],
                        'days_in_period': days_in_period,
                        'habit_count': habit_count,
                        'completed_count': completed_count,
                        'completed_days': completed_days,
                        'restored_days': restored_days,
                        'extra_quantity': extra_quantity,
                        'streak_count': streak_count,
                    })
                    current_date = period_end + timedelta(days=1)

            elif period == 'year':
                # Yearly aggregation (Bars = years)
                # Show last 5 years ending in the selected year
                current_date = start_date

                while current_date <= end_date:
                    period_end = date(current_date.year, 12, 31)
                    period_end = min(period_end, end_date)
                    
                    day_dates = Date.objects.filter(
                        user=user_profile,
                        habit__in=habits,
                        habit_date__range=[current_date, period_end],
                        is_done=True
                    )
                    completed_days = day_dates.filter(is_restored=False).count()
                    restored_days = day_dates.filter(is_restored=True).count()
                    extra_quantity = day_dates.filter(quantity__isnull=False).aggregate(total=Sum('quantity'))['total'] or 0
                    completed_count = day_dates.filter(quantity__isnull=True).count() + extra_quantity
                    days_in_period = (period_end - current_date).days + 1
                    habit_count = habits.filter(start_date__lte=period_end).count()
                    
                    # Streak count for this year
                    streak_count = 0
                    c_date = current_date
                    while c_date <= period_end:
                        for habit_id, history in all_streak_histories.items():
                            if history.get(c_date):
                                streak_count += 1
                        c_date += timedelta(days=1)

                    statistics.append({
                        'date': current_date.isoformat(),
                        'label': str(current_date.year),
                        'days_in_period': days_in_period,
                        'habit_count': habit_count,
                        'completed_count': completed_count,
                        'completed_days': completed_days,
                        'restored_days': restored_days,
                        'extra_quantity': extra_quantity,
                        'streak_count': streak_count,
                    })
                    current_date = date(current_date.year + 1, 1, 1)
            
            return Response({
                'data': statistics,
                'period_label': label
            })
        except Exception as e:
            import traceback
            print(f"CRITICAL ERROR in daily_statistics: {e}")
            traceback.print_exc()
            return Response(
                {"error": str(e), "detail": traceback.format_exc()}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
        
        if period == 'day':
            start_date = today
            end_date = today
            label = f"{today.strftime('%d.%m.%Y')}"
        elif period == 'week':
            days_since_monday = today.weekday()
            start_date = today - timedelta(days=days_since_monday)
            end_date = start_date + timedelta(days=6)
            week_num = start_date.isocalendar()[1]
            label = f"{start_date.strftime('%d.%m')} - {end_date.strftime('%d.%m')} Неделя №{week_num}"
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
            label = f"{today.year}"
        else:
            # Fallback
            days_since_monday = today.weekday()
            start_date = today - timedelta(days=days_since_monday)
            end_date = start_date + timedelta(days=6)
            label = "За неделю"

        category_name = request.query_params.get('category')
        habits = Habit.objects.filter(user=user_profile, is_archived=False)
        if category_name and category_name != 'Все':
            if category_name == 'Без категории':
                habits = habits.filter(category__isnull=True)
            else:
                habits = habits.filter(category__name=category_name)
                
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

            # Streak days for this habit in the period
            # Use full week context for streaks to match daily_statistics logic
            streak_start = start_date
            streak_end = end_date
            if period == 'day':
                days_since_monday = start_date.weekday()
                streak_start = start_date - timedelta(days=days_since_monday)
                streak_end = streak_start + timedelta(days=6)
            
            streak_history = self._get_streak_history(habit, streak_start, streak_end)
            streak_days = sum(1 for d, active in streak_history.items() if active and start_date <= d <= end_date)
            
            days_in_period = (end_date - start_date).days + 1
            streak_percentage = (streak_days / days_in_period * 100) if days_in_period > 0 else 0

            # Get actual dates done in this period
            done_history = list(day_dates.values_list('habit_date', flat=True))
            done_history_str = [d.isoformat() for d in done_history]

            # Show all active habits
            statistics.append({
                'id': habit.id,
                'name': habit.name,
                'completed_days': completed_days,
                'restored_days': restored_days,
                'extra_quantity': extra_quantity,
                'streak_days': streak_days,
                'done_history': done_history_str,
                'start_date': habit.start_date.isoformat() if habit.start_date else None,
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
    authentication_classes = []  # Disable CSRF for login

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
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def reminder_settings(request):
    user_profile, _ = UserAll.objects.get_or_create(auth_user=request.user)
    settings, _ = ReminderSettings.objects.get_or_create(user=user_profile)
    
    if request.method == 'PATCH':
        serializer = ReminderSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    serializer = ReminderSettingsSerializer(settings)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_push(request):
    user_profile, _ = UserAll.objects.get_or_create(auth_user=request.user)
    serializer = PushSubscriptionSerializer(data=request.data)
    if serializer.is_valid():
        PushSubscription.objects.update_or_create(
            user=user_profile,
            endpoint=serializer.validated_data['endpoint'],
            defaults={
                'p256dh': serializer.validated_data['p256dh'],
                'auth': serializer.validated_data['auth']
            }
        )
        return Response({'status': 'subscribed'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def vapid_public_key(request):
    from django.conf import settings
    return Response({'publicKey': settings.VAPID_PUBLIC_KEY})

