from django.contrib import admin
from api.models import Habit, Date


class HabitAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'slug',
    )
    list_display_links = (
        'name',
    )
    prepopulated_fields = {'slug': ('name',)}


class DateAdmin(admin.ModelAdmin):
    list_display = (
        'name',
    )
    search_fields = (
        'name',
        'description',
    )
    empty_value_display = (
        '-пусто-'
    )

    prepopulated_fields = {'slug': ('name',)}


admin.site.register(Habit, HabitAdmin)
admin.site.register(Date, DateAdmin)
