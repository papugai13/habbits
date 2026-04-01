from django.contrib import admin

from .models import Achievement, Category, Date, Habit, UserAll


class UserAllAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'slug',
        'age'
    )
    list_display_links = (
        'name',
    )
    search_fields = (
        'name',
    )
    prepopulated_fields = {'slug': ('name',)}



class DateAdmin(admin.ModelAdmin):
    list_display = (
        'name',
    )
    search_fields = (
        'name',
    )
    empty_value_display = (
        '-пусто-'
    )

    prepopulated_fields = {'slug': ('name',)}


class HabitAdmin(admin.ModelAdmin):
    list_display = (
        'name',
    )
    search_fields = (
        'name',
    )
    empty_value_display = (
        '-пусто-'
    )

    prepopulated_fields = {'slug': ('name',)}



class AchievementAdmin(admin.ModelAdmin):
    list_display = (
        'name',
    )
    search_fields = (
        'name',
    )
    empty_value_display = (
        '-пусто-'
    )
    filter_vertical = ('user',)

    prepopulated_fields = {'slug': ('name',)}


admin.site.register(Achievement, AchievementAdmin)
admin.site.register(Habit, HabitAdmin)
admin.site.register(Date, DateAdmin)
admin.site.register(UserAll, UserAllAdmin)
admin.site.register(Category)
