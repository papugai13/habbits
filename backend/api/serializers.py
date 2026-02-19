from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from . models import Achievement, Category, Date, UserAll, Habit


class CategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        min_length=2,
        max_length=20,
        error_messages={
            "min_length": "Название категории должно содержать минимум 2 символа.",
            "max_length": "Название категории не должно превышать 20 символов."
        }
    )

    class Meta:
        model = Category
        fields = ('id', 'user', 'name', 'slug')
        read_only_fields = ('id', 'user', 'slug')


class HabitSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), required=False, allow_null=True
    )
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)

    class Meta:
        model = Habit
        fields = ('id', 'user', 'name', 'category', 'category_name', 'category_slug', 'slug')
        read_only_fields = ('id', 'user', 'slug')


class UserAllSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAll
        fields = '__all__'


class DateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Date
        fields = '__all__'  # Includes quantity field

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = '__all__'


# Authentication serializers
class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для отображения и редактирования данных пользователя"""
    age = serializers.CharField(source='user_profile.age', allow_blank=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'age')
        read_only_fields = ('id',)

    def validate_age(self, value):
        if value:
            try:
                age_int = int(value)
                if age_int < 0 or age_int > 150:
                    raise serializers.ValidationError("Возраст должен быть от 0 до 150 лет.")
            except ValueError:
                raise serializers.ValidationError("Возраст должен быть числом.")
        return value

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('user_profile', {})
        age = profile_data.get('age')

        # Update User model
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update UserAll model
        profile = instance.user_profile
        if age is not None:
            profile.age = age
        profile.name = instance.username # Keep sync if needed
        profile.save()

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации нового пользователя"""
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Пароли не совпадают"}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """Сериализатор для входа в систему"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True, 
        write_only=True,
        style={'input_type': 'password'}
    )