import json
import logging
from datetime import datetime

import pytz
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

        utc_now = timezone.now()
        self.stdout.write(f"Проверка напоминаний (UTC: {utc_now.strftime('%H:%M')})...")

        # Находим все активные настройки напоминаний
        active_settings = ReminderSettings.objects.filter(enabled=True).select_related('user')

        sent_count = 0
        for setting in active_settings:
            # Переводим текущее UTC-время в часовой пояс пользователя
            user_tz_name = setting.time_zone or 'UTC'
            try:
                user_tz = pytz.timezone(user_tz_name)
            except pytz.UnknownTimeZoneError:
                self.stdout.write(self.style.WARNING(
                    f"  Неизвестный часовой пояс '{user_tz_name}' для {setting.user.name}, используем UTC"
                ))
                user_tz = pytz.utc

            local_now = utc_now.astimezone(user_tz)
            current_time_str = local_now.strftime('%H:%M')

            # Проверяем, есть ли текущее время в списке времён пользователя
            if current_time_str in (setting.times or []):
                self.stdout.write(
                    f"Отправляем напоминание для {setting.user.name} "
                    f"(tz={user_tz_name}, local={current_time_str})"
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
            "tag": f"habit-reminder-{reminder_setting.user.id}",
            "url": "/"
        }

        sent = 0
        stale_subs = []
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
                    self.style.SUCCESS(f"  ✓ Отправлено на {sub.endpoint[:60]}...")
                )
                sent += 1
            except WebPushException as ex:
                self.stdout.write(
                    self.style.ERROR(f"  ✗ Ошибка для {sub.endpoint[:60]}: {ex}")
                )
                # 404/410 — подписка истекла, удаляем
                if ex.response and ex.response.status_code in [404, 410]:
                    stale_subs.append(sub)
                    self.stdout.write("    Устаревшая подписка помечена для удаления.")
            except Exception as ex:
                self.stdout.write(self.style.ERROR(f"  ✗ Неожиданная ошибка: {ex}"))

        # Удаляем устаревшие подписки пакетом
        for sub in stale_subs:
            sub.delete()

        return sent
