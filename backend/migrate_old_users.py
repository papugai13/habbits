"""
Скрипт для создания UserAll профилей для старых пользователей Django,
у которых нет связанного UserAll профиля.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserAll

def migrate_old_users():
    """Создать UserAll профили для пользователей без них."""
    users_without_profile = User.objects.filter(user_profile__isnull=True)
    
    print(f"Найдено {users_without_profile.count()} пользователей без UserAll профиля:")
    
    for user in users_without_profile:
        print(f"  - {user.username} (ID: {user.id})")
        try:
            user_all, created = UserAll.objects.get_or_create(
                auth_user=user,
                defaults={
                    'name': user.username,
                    'age': ''
                }
            )
            if created:
                print(f"    ✓ Создан UserAll профиль для {user.username}")
            else:
                print(f"    - UserAll профиль уже существует для {user.username}")
        except Exception as e:
            print(f"    ✗ Ошибка при создании профиля для {user.username}: {e}")
    
    print("\nМиграция завершена!")

if __name__ == '__main__':
    migrate_old_users()
