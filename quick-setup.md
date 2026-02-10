# Быстрая настройка Nginx (минимальная)

## 1. Установка Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

## 2. Подготовка директорий

```bash
# Создайте директорию проекта
sudo mkdir -p /var/www/habits

# Скопируйте ваш проект
sudo cp -r /путь/к/вашему/проекту/* /var/www/habits/

# Установите права
sudo chown -R www-data:www-data /var/www/habits
```

## 3. Сборка Frontend

```bash
cd /var/www/habits/frontend
npm install
npm run build
```

## 4. Настройка Backend

```bash
cd /var/www/habits/backend

# Создайте виртуальное окружение
python3 -m venv venv
source venv/bin/activate

# Установите зависимости
pip install -r ../requirements.txt
pip install gunicorn

# Создайте директории для статики
mkdir -p staticfiles media

# Соберите статические файлы
python manage.py collectstatic --noinput

# Примените миграции
python manage.py migrate
```

## 5. Запуск Backend (Gunicorn)

```bash
# Запустите Gunicorn вручную для теста
cd /var/www/habits/backend
source venv/bin/activate
gunicorn --bind 127.0.0.1:8000 backend.wsgi:application
```

**Или создайте systemd сервис для автозапуска:**

```bash
sudo nano /etc/systemd/system/habits.service
```

Содержимое:
```ini
[Unit]
Description=Habits Django App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/habits/backend
Environment="PATH=/var/www/habits/backend/venv/bin"
ExecStart=/var/www/habits/backend/venv/bin/gunicorn --bind 127.0.0.1:8000 backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

Запустите сервис:
```bash
sudo systemctl start habits
sudo systemctl enable habits
```

## 6. Настройка Nginx

```bash
# Скопируйте конфигурацию
sudo cp /var/www/habits/nginx-simple.conf /etc/nginx/sites-available/habits

# Создайте симлинк
sudo ln -s /etc/nginx/sites-available/habits /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (опционально)
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl restart nginx
```

## 7. Проверка

Откройте браузер и перейдите:
- Frontend: `http://ваш-ip-или-localhost/`
- API: `http://ваш-ip-или-localhost/api/`
- Admin: `http://ваш-ip-или-localhost/admin/`

## Полезные команды

```bash
# Просмотр логов Nginx
sudo tail -f /var/log/nginx/habits_error.log

# Перезапуск сервисов
sudo systemctl restart habits
sudo systemctl restart nginx

# Проверка статуса
sudo systemctl status habits
sudo systemctl status nginx
```

## Структура путей

Убедитесь, что пути в конфигурации соответствуют вашей структуре:

```
/var/www/habits/
├── backend/
│   ├── venv/
│   ├── manage.py
│   ├── backend/
│   │   └── wsgi.py
│   ├── staticfiles/     # Django static files
│   └── media/           # Uploaded files
└── frontend/
    └── build/           # React production build
        ├── index.html
        ├── static/
        └── ...
```
