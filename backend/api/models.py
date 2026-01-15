from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify


class UserAll(models.Model):
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
        blank=True,
    )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"


class Habit(models.Model):
    CATEGORY_CHOICES = [
        ('Soul', 'Душа'),
        ('Personal', 'Личное'),
        ('Work', 'Работа'),
    ]

    user = models.ForeignKey(
        UserAll,
        on_delete=models.CASCADE,
        related_name="habit",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Название",
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='Personal',
        verbose_name="Категория"
    )

    slug = models.SlugField(
        unique=True,
        verbose_name="Слаг",
        max_length=100,
        blank=True,
    )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
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
    habit_date = models.DateField(
        verbose_name="Дата привычки",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Название",
        blank=True,
    )

    slug = models.SlugField(
        unique=True,
        verbose_name="Слаг",
        max_length=100,
        blank=True,
    )

    is_done = models.BooleanField(
        verbose_name="Сделано",
        default=False
    )

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"{self.habit.name} - {self.habit_date}"
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name

    class Meta:
        verbose_name = "Дата"
        verbose_name_plural = "Даты"