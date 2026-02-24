from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.core.validators import MinLengthValidator


def unique_slugify(instance, slug):
    model = instance.__class__
    unique_slug = slug
    num = 1
    while model.objects.filter(slug=unique_slug).exclude(id=instance.id).exists():
        unique_slug = f'{slug}-{num}'
        num += 1
    return unique_slug


class UserAll(models.Model):
    auth_user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="user_profile",
        null=True,
        blank=True,
        verbose_name="Пользователь Django"
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name="Название"
    )

    age = models.CharField(
        max_length=100,
        verbose_name="Возраст",
        blank=True
    )

    slug = models.SlugField(
        unique=True,
        verbose_name="Слаг",
        max_length=100,
        blank=True,
    )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, slugify(self.name))
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"


class Category(models.Model):
    user = models.ForeignKey(
        UserAll,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(
        max_length=20,
        validators=[MinLengthValidator(2)],
        verbose_name="Название",
    )
    slug = models.SlugField(
        verbose_name="Слаг",
        max_length=100,
        blank=True,
    )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, slugify(self.name))
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"
        unique_together = (('user', 'name'), ('user', 'slug'))


class Habit(models.Model):
    user = models.ForeignKey(
        UserAll,
        on_delete=models.CASCADE,
        related_name="habit",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Название",
    )
    category_old = models.CharField(
        max_length=20,
        choices=[
            ('Soul', 'Душа'),
            ('Personal', 'Личное'),
            ('Work', 'Работа'),
        ],
        default='Personal',
        verbose_name="Старая категория"
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="habits",
        verbose_name="Категория"
    )

    slug = models.SlugField(
        unique=True,
        verbose_name="Слаг",
        max_length=100,
        blank=True,
    )

    order = models.IntegerField(
        default=0,
        verbose_name="Порядок",
    )

    is_archived = models.BooleanField(
        default=False,
        verbose_name="В архиве",
    )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, slugify(self.name))
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name

    class Meta:
        verbose_name = "Привычка"
        verbose_name_plural = "Привычки"
        ordering = ['order']


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
        max_length=100,
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

    quantity = models.IntegerField(
        verbose_name="Количество",
        null=True,
        blank=True,
        help_text="Количество выполненных действий (например, 30 отжиманий)"
    )

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"{self.habit.name} - {self.habit_date}"
        if not self.slug:
            self.slug = unique_slugify(self, slugify(self.name))
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name

    class Meta:
        verbose_name = "Дата"
        verbose_name_plural = "Даты"


class Achievement(models.Model):
    user = models.ManyToManyField(
        UserAll,
        related_name="achievement",
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
    def __str__(self) -> models.CharField:
        return self.name

    class Meta:
        verbose_name = "Ачивка"
        verbose_name_plural = "Ачивки"
        