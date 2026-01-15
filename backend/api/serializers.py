from rest_framework import serializers
from . models import Achievement, Date, UserAll, Habit


class HabitSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Habit
        fields = '__all__'


class UserAllSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAll
        fields = '__all__'


class DateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Date
        fields = '__all__'

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = '__all__'