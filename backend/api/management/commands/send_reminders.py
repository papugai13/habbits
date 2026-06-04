import json
import logging
from datetime import datetime

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from pywebpush import webpush, WebPushException

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

from api.models import PushSubscription, ReminderSettings

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Send scheduled push notifications to users'

    def handle(self, *args, **options):
        now = timezone.localtime(timezone.now())
        current_time_str = now.strftime('%H:%M')
        
        self.stdout.write(f"Checking reminders for {current_time_str}...")
        
        # Find all enabled reminder settings
        active_settings = ReminderSettings.objects.filter(enabled=True)
        
        for setting in active_settings:
            reminder_times = setting.times or []
            if not isinstance(reminder_times, list):
                reminder_times = [str(reminder_times)]

            user_tz = None
            if setting.time_zone and ZoneInfo is not None:
                try:
                    user_tz = ZoneInfo(setting.time_zone)
                except Exception:
                    user_tz = None

            if user_tz is not None:
                user_now = timezone.now().astimezone(user_tz)
                current_time_str = user_now.strftime('%H:%M')
            else:
                user_now = now

            if current_time_str in reminder_times:
                self.stdout.write(f"Sending reminder to {setting.user.name} at {current_time_str} ({setting.time_zone or 'server timezone'})")
                self.send_to_user(setting)

    def send_to_user(self, reminder_setting):
        subscriptions = PushSubscription.objects.filter(user=reminder_setting.user)
        
        payload = {
            "title": "Habbits",
            "body": reminder_setting.text,
            "icon": "/favicon.ico",
            "badge": "/favicon-96x96.png",
            "tag": f"habit-reminder-{reminder_setting.user.id}-{timezone.now().timestamp()}"
        }
        
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
                self.stdout.write(self.style.SUCCESS(f"Successfully sent to {sub.endpoint[:30]}..."))
            except WebPushException as ex:
                self.stdout.write(self.style.ERROR(f"Failed to send to {sub.endpoint[:30]}: {ex}"))
                if ex.response and ex.response.status_code in [404, 410]:
                    sub.delete()
