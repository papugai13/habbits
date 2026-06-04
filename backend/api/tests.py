import json
from datetime import datetime, timezone as dt_timezone
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import PushSubscription, ReminderSettings, UserAll


class ReminderNotificationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.user_profile, _ = UserAll.objects.get_or_create(
            auth_user=self.user,
            defaults={'name': self.user.username, 'age': ''}
        )

    def test_reminder_settings_api_get_and_patch(self):
        ReminderSettings.objects.create(user=self.user_profile)

        self.client.force_login(self.user)
        response = self.client.get('/api/v1/reminders/settings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['enabled'], False)
        self.assertEqual(response.json()['times'], [])
        self.assertEqual(response.json()['time_zone'], 'UTC')

        patch_data = {
            'enabled': True,
            'text': 'Пора сделать дело',
            'times': ['09:00', '18:00'],
            'time_zone': 'Europe/Moscow'
        }
        response = self.client.patch(
            '/api/v1/reminders/settings/',
            data=patch_data,
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['enabled'], True)
        self.assertEqual(response.json()['times'], ['09:00', '18:00'])
        self.assertEqual(response.json()['time_zone'], 'Europe/Moscow')

        response = self.client.get('/api/v1/reminders/settings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['text'], 'Пора сделать дело')
        self.assertEqual(response.json()['time_zone'], 'Europe/Moscow')

    @override_settings(USE_TZ=True)
    @patch('api.management.commands.send_reminders.webpush')
    def test_send_reminders_command_sends_push_for_matching_timezone(self, mocked_webpush):
        ReminderSettings.objects.create(
            user=self.user_profile,
            enabled=True,
            text='Тест напоминания',
            times=['11:00'],
            time_zone='Europe/Moscow'
        )
        PushSubscription.objects.create(
            user=self.user_profile,
            endpoint='https://example.com/push',
            p256dh='p256dh_test',
            auth='auth_test'
        )

        mocked_time = datetime(2026, 6, 4, 8, 0, 0, tzinfo=dt_timezone.utc)
        with patch('api.management.commands.send_reminders.timezone.now', return_value=mocked_time):
            call_command('send_reminders')

        self.assertTrue(mocked_webpush.called)
        _, kwargs = mocked_webpush.call_args
        self.assertIn('subscription_info', kwargs)
        self.assertEqual(kwargs['subscription_info']['endpoint'], 'https://example.com/push')
        self.assertEqual(kwargs['subscription_info']['keys']['p256dh'], 'p256dh_test')
        self.assertEqual(kwargs['subscription_info']['keys']['auth'], 'auth_test')

        payload = json.loads(kwargs['data'])
        self.assertEqual(payload['title'], 'Habbits')
        self.assertEqual(payload['body'], 'Тест напоминания')
        self.assertEqual(payload['icon'], '/favicon.ico')
        self.assertEqual(payload['badge'], '/favicon-96x96.png')
        self.assertTrue(payload['tag'].startswith('habit-reminder-'))

    @override_settings(USE_TZ=True)
    @patch('api.management.commands.send_reminders.webpush')
    def test_send_reminders_command_skips_non_matching_time(self, mocked_webpush):
        ReminderSettings.objects.create(
            user=self.user_profile,
            enabled=True,
            text='Тест напоминания',
            times=['12:00'],
            time_zone='UTC'
        )
        PushSubscription.objects.create(
            user=self.user_profile,
            endpoint='https://example.com/push',
            p256dh='p256dh_test',
            auth='auth_test'
        )

        mocked_time = datetime(2026, 6, 4, 11, 0, 0, tzinfo=dt_timezone.utc)
        with patch('api.management.commands.send_reminders.timezone.now', return_value=mocked_time):
            call_command('send_reminders')

        self.assertFalse(mocked_webpush.called)
