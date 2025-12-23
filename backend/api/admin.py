from django.contrib import admin
from api.models import UserAll

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


admin.site.register(UserAll, UserAllAdmin)
