from rest_framework import serializers
from . models import Date, UserAll, Habit


class HabitSerializer(serializers.ModelSerializer):
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
