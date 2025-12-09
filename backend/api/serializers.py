from rest_framework import serializers

from .models import UserAll


class UserAllSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAll
        fields = '__all__'
