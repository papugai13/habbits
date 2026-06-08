import json
import logging
from datetime import datetime

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import PushSubscription, ReminderSettings

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Отправить запланированные push-уведомления пользователям'

    def handle(self, *args, **options):
        try:
            from pywebpush import webpush, WebPushException
        except ImportError:
            self.stdout.write(self.style.ERROR(
                'pywebpush не установлен. Установите: pip install pywebpush'
            ))
            return

        now = timezone.localtime(timezone.now())
        current_time_str = now.strftime('%H:%M')

        self.stdout.write(f"Проверка напоминаний для {current_time_str}...")

        # Находим все активные настройки напоминаний
        active_settings = ReminderSettings.objects.filter(enabled=True).select_related('user')

        sent_count = 0
        for setting in active_settings:
            # Проверяем, есть ли текущее время в списке времён пользователя
            if current_time_str in setting.times:
                self.stdout.write(
                    f"Отправляем напоминание для {setting.user.name} в {current_time_str}"
                )
                sent = self._send_to_user(setting, webpush, WebPushException)
                sent_count += sent

        self.stdout.write(self.style.SUCCESS(
            f"Готово. Отправлено {sent_count} уведомлений."
        ))

    def _send_to_user(self, reminder_setting, webpush, WebPushException):
        """Отправляет push-уведомление всем подпискам пользователя."""
        subscriptions = PushSubscription.objects.filter(user=reminder_setting.user)
        if not subscriptions.exists():
            self.stdout.write(f"  Нет подписок у пользователя {reminder_setting.user.name}")
            return 0

        payload = {
            "title": "Habbits 🌱",
            "body": reminder_setting.text or "Не забудьте отметить привычки!",
            "icon": "/favicon.ico",
            "badge": "/favicon-96x96.png",
            "tag": f"habit-reminder-{reminder_setting.user.id}-{timezone.now().timestamp()}",
            "url": "/"
        }

        sent = 0
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    },
                    data=json.dumps(payload),
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={
                        "sub": settings.VAPID_ADMIN_EMAIL,
                    }
                )
                self.stdout.write(
                    self.style.SUCCESS(f"  ✓ Отправлено на {sub.endpoint[:50]}...")
                )
                sent += 1
            except WebPushException as ex:
                self.stdout.write(
                    self.style.ERROR(f"  ✗ Ошибка для {sub.endpoint[:50]}: {ex}")
                )
                # 404/410 — подписка истекла, удаляем
                if ex.response and ex.response.status_code in [404, 410]:
                    sub.delete()
                    self.stdout.write("    Устаревшая подписка удалена.")
            except Exception as ex:
                self.stdout.write(self.style.ERROR(f"  ✗ Неожиданная ошибка: {ex}"))

        return sent
