from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from api.models import UserAll, Category, Habit


class CategoryValidationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_auth = User.objects.create_user(username='testuser', password='password123')
        self.user_all = UserAll.objects.create(auth_user=self.user_auth, name='Test User')
        self.client.force_authenticate(user=self.user_auth)

    def test_create_category_too_short(self):
        """Test that a category with 1 character is rejected"""
        url = '/api/v1/categories/'
        data = {'name': 'A'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
        self.assertEqual(response.data['name'][0], "Название категории должно содержать минимум 2 символа.")

    def test_create_category_too_long(self):
        """Test that a category with more than 20 characters is rejected"""
        url = '/api/v1/categories/'
        data = {'name': 'A' * 21}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
        self.assertEqual(response.data['name'][0], "Название категории не должно превышать 20 символов.")

    def test_create_category_valid(self):
        """Test that a valid category name is accepted"""
        url = '/api/v1/categories/'
        data = {'name': 'Work'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Category.objects.count(), 1)
        self.assertEqual(Category.objects.get().name, 'Work')

    def test_archive_category_moves_it_to_archive_list(self):
        """Archived categories should disappear from the main list and appear in the archive."""
        category = Category.objects.create(user=self.user_all, name='Health')

        archive_response = self.client.patch(f'/api/v1/categories/{category.id}/archive/')

        self.assertEqual(archive_response.status_code, status.HTTP_200_OK)
        category.refresh_from_db()
        self.assertTrue(category.is_archived)
        self.assertTrue(archive_response.data['is_archived'])

        active_response = self.client.get('/api/v1/categories/')
        archived_response = self.client.get('/api/v1/categories/archived/')

        self.assertEqual(active_response.status_code, status.HTTP_200_OK)
        self.assertEqual(archived_response.status_code, status.HTTP_200_OK)
        self.assertNotIn(category.id, [item['id'] for item in active_response.data])
        self.assertIn(category.id, [item['id'] for item in archived_response.data])

    def test_archive_category_accepts_post_method(self):
        """Archive endpoint should also work with POST for production compatibility."""
        category = Category.objects.create(user=self.user_all, name='Sport')

        archive_response = self.client.post(f'/api/v1/categories/{category.id}/archive/')

        self.assertEqual(archive_response.status_code, status.HTTP_200_OK)
        category.refresh_from_db()
        self.assertTrue(category.is_archived)
        self.assertTrue(archive_response.data['is_archived'])

    def test_archive_category_also_toggles_habits_in_it(self):
        """Archiving a category should archive its habits, and restoring should unarchive them."""
        category = Category.objects.create(user=self.user_all, name='Fitness')
        habit_in_category = Habit.objects.create(user=self.user_all, name='Run', category=category)
        other_habit = Habit.objects.create(user=self.user_all, name='Read')

        archive_response = self.client.patch(f'/api/v1/categories/{category.id}/archive/')

        self.assertEqual(archive_response.status_code, status.HTTP_200_OK)
        category.refresh_from_db()
        habit_in_category.refresh_from_db()
        other_habit.refresh_from_db()

        self.assertTrue(category.is_archived)
        self.assertTrue(habit_in_category.is_archived)
        self.assertFalse(other_habit.is_archived)

        unarchive_response = self.client.patch(f'/api/v1/categories/{category.id}/archive/')

        self.assertEqual(unarchive_response.status_code, status.HTTP_200_OK)
        category.refresh_from_db()
        habit_in_category.refresh_from_db()

        self.assertFalse(category.is_archived)
        self.assertFalse(habit_in_category.is_archived)

    def test_unarchive_category_returns_it_to_main_list(self):
        """Archiving twice should return the category back to the main list."""
        category = Category.objects.create(user=self.user_all, name='Study')

        self.client.patch(f'/api/v1/categories/{category.id}/archive/')
        unarchive_response = self.client.patch(f'/api/v1/categories/{category.id}/archive/')

        self.assertEqual(unarchive_response.status_code, status.HTTP_200_OK)
        category.refresh_from_db()
        self.assertFalse(category.is_archived)
        self.assertFalse(unarchive_response.data['is_archived'])

        active_response = self.client.get('/api/v1/categories/')
        self.assertIn(category.id, [item['id'] for item in active_response.data])
