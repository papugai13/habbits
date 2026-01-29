from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from api.models import UserAll, Category

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
