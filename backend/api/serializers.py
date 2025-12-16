from rest_framework import serializers
from . models import Date, UserAll


class UserAllSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAll
        fields = '__all__'

class DateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Date
        fields = '__all__'
