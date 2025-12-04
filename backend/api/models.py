from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User


class UserAll(models.Model):
    """Model for goods category."""

    name = models.CharField(
        max_length=100,
        verbose_name="Название"
    )

    age = models.CharField(
        max_length=100,
        verbose_name="Возраст"
    )

    slug = models.SlugField(
        unique=True,
        verbose_name="Слаг",
        max_length=100,
    )

    def str(self) -> models.CharField:
        return self.name

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"


class Habit(models.Model):

    user = models.ForeignKey(
        UserAll,
        on_delete=models.CASCADE,
        related_name="habit",
        )

    habit_date = models.CharField(
        max_length=100,
        verbose_name="Дата привычки",
    )

    name = models.CharField(
        max_length=100,
        verbose_name="Название",
    )

    slug = models.SlugField(
        unique=True,
        verbose_name="Слаг",
        max_length=100,
    )

    def str(self) -> models.CharField:
        return self.name

    class Meta:
        verbose_name = "Привычка"
        verbose_name_plural = "Привычки"


class Date(models.Model):
   
    user = models.ForeignKey(
        UserAll,
        on_delete=models.CASCADE,
        related_name="date",
    )
    habit = models.ForeignKey(
        Habit,
        on_delete=models.CASCADE,
        related_name="date",
    )

    name = models.CharField(
        max_length=100,
        verbose_name="Название",
    )

    slug = models.SlugField(
        unique=True,
        verbose_name="Слаг",
        max_length=100,
    )

    is_done = models.BooleanField(
        verbose_name="Сделано"
    )

    def str(self) -> models.CharField:
        return self.name

    class Meta:
        verbose_name = "Дата"
        verbose_name_plural = "Даты"