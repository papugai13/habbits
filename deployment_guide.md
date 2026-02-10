# Руководство по развертыванию Habits Tracker на VPS

## Предварительные требования

- VPS с Ubuntu 20.04/22.04 или Debian
- Доменное имя, указывающее на IP вашего VPS
- Root или sudo доступ

## 1. Подготовка сервера

### Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### Установка необходимых пакетов
```bash
sudo apt install -y python3 python3-pip python3-venv nginx git certbot python3-certbot-nginx
```

### Установка Node.js (для сборки React)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Подготовка приложения

### Создание директории проекта
```bash
sudo mkdir -p /var/www/habits
sudo chown $USER:$USER /var/www/habits
```

### Клонирование проекта
```bash
cd /var/www/habits
git clone <ваш-репозиторий> .
# или загрузите файлы через scp/sftp
```

## 3. Настройка Backend (Django)

### Создание виртуального окружения
```bash
cd /var/www/habits/backend
python3 -m venv venv
source venv/bin/activate
```

### Установка зависимостей
```bash
pip install -r ../requirements.txt
pip install gunicorn  # WSGI сервер для production
```

### Обновление settings.py для production
Создайте файл `backend/backend/settings_prod.py`:
```python
from .settings import *

DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']

# Обновите SECRET_KEY на безопасный
SECRET_KEY = 'your-secure-secret-key-here'

# Настройки для HTTPS
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Обновите CORS для production
CORS_ALLOWED_ORIGINS = [
    "https://your-domain.com",
    "https://www.your-domain.com",
]

CSRF_TRUSTED_ORIGINS = [
    "https://your-domain.com",
    "https://www.your-domain.com",
]

# Статические файлы
STATIC_ROOT = '/var/www/habits/backend/staticfiles/'
MEDIA_ROOT = '/var/www/habits/backend/media/'
```

### Сбор статических файлов Django
```bash
python manage.py collectstatic --noinput --settings=backend.settings_prod
```

### Миграции базы данных
```bash
python manage.py migrate --settings=backend.settings_prod
```

### Создание суперпользователя
```bash
python manage.py createsuperuser --settings=backend.settings_prod
```

## 4. Настройка Frontend (React)

### Сборка production версии
```bash
cd /var/www/habits/frontend
npm install
npm run build
```

## 5. Настройка Gunicorn (WSGI сервер для Django)

### Создание systemd сервиса
```bash
sudo nano /etc/systemd/system/habits-gunicorn.service
```

Содержимое файла:
```ini
[Unit]
Description=Habits Tracker Gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/habits/backend
Environment="PATH=/var/www/habits/backend/venv/bin"
Environment="DJANGO_SETTINGS_MODULE=backend.settings_prod"
ExecStart=/var/www/habits/backend/venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:8000 \
    --timeout 60 \
    --access-logfile /var/log/gunicorn/access.log \
    --error-logfile /var/log/gunicorn/error.log \
    backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

### Создание директории для логов
```bash
sudo mkdir -p /var/log/gunicorn
sudo chown www-data:www-data /var/log/gunicorn
```

### Настройка прав доступа
```bash
sudo chown -R www-data:www-data /var/www/habits
```

### Запуск Gunicorn
```bash
sudo systemctl start habits-gunicorn
sudo systemctl enable habits-gunicorn
sudo systemctl status habits-gunicorn
```

## 6. Настройка Nginx

### Копирование конфигурации
```bash
sudo cp /var/www/habits/nginx.conf /etc/nginx/sites-available/habits
```

### Редактирование конфигурации
```bash
sudo nano /etc/nginx/sites-available/habits
```

**Замените:**
- `your-domain.com` на ваш реальный домен
- Пути к SSL сертификатам (после получения Let's Encrypt)

### Создание симлинка
```bash
sudo ln -s /etc/nginx/sites-available/habits /etc/nginx/sites-enabled/
```

### Удаление дефолтной конфигурации
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### Проверка конфигурации
```bash
sudo nginx -t
```

## 7. Получение SSL сертификата (Let's Encrypt)

### Временно закомментируйте SSL блок в nginx.conf
Откройте `/etc/nginx/sites-available/habits` и закомментируйте весь HTTPS блок (server listening on 443).

### Перезапустите Nginx
```bash
sudo systemctl restart nginx
```

### Получите сертификат
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Раскомментируйте SSL блок
Верните HTTPS блок в конфигурацию nginx.

### Перезапустите Nginx
```bash
sudo systemctl restart nginx
```

## 8. Настройка автообновления SSL сертификата

Certbot автоматически настраивает cron задачу. Проверьте:
```bash
sudo systemctl status certbot.timer
```

## 9. Настройка Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## 10. Проверка работы

1. Откройте браузер и перейдите на `https://your-domain.com`
2. Проверьте работу API: `https://your-domain.com/api/`
3. Проверьте админ панель: `https://your-domain.com/admin/`

## Полезные команды

### Просмотр логов
```bash
# Nginx логи
sudo tail -f /var/log/nginx/habits_error.log
sudo tail -f /var/log/nginx/habits_access.log

# Gunicorn логи
sudo tail -f /var/log/gunicorn/error.log
sudo tail -f /var/log/gunicorn/access.log

# Systemd логи
sudo journalctl -u habits-gunicorn -f
```

### Перезапуск сервисов
```bash
# После изменения кода Django
sudo systemctl restart habits-gunicorn

# После изменения конфигурации Nginx
sudo nginx -t && sudo systemctl reload nginx

# После обновления frontend
cd /var/www/habits/frontend
npm run build
```

### Обновление приложения
```bash
# 1. Получите новый код
cd /var/www/habits
git pull

# 2. Обновите backend
cd backend
source venv/bin/activate
pip install -r ../requirements.txt
python manage.py migrate --settings=backend.settings_prod
python manage.py collectstatic --noinput --settings=backend.settings_prod
sudo systemctl restart habits-gunicorn

# 3. Обновите frontend
cd ../frontend
npm install
npm run build

# 4. Перезапустите Nginx
sudo systemctl reload nginx
```

## Мониторинг и обслуживание

### Настройка резервного копирования базы данных
```bash
# Создайте скрипт backup.sh
sudo nano /var/www/habits/backup.sh
```

Содержимое:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/habits"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /var/www/habits/backend/db.sqlite3 $BACKUP_DIR/db_$DATE.sqlite3

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "db_*.sqlite3" -mtime +30 -delete
```

Сделайте исполняемым и добавьте в cron:
```bash
sudo chmod +x /var/www/habits/backup.sh
sudo crontab -e
# Добавьте: 0 2 * * * /var/www/habits/backup.sh
```

## Troubleshooting

### 502 Bad Gateway
- Проверьте, запущен ли Gunicorn: `sudo systemctl status habits-gunicorn`
- Проверьте логи: `sudo journalctl -u habits-gunicorn -n 50`

### 403 Forbidden
- Проверьте права доступа: `ls -la /var/www/habits`
- Должен быть владелец `www-data:www-data`

### Статические файлы не загружаются
- Проверьте, собраны ли статические файлы: `ls /var/www/habits/backend/staticfiles/`
- Проверьте права доступа

### API не работает
- Проверьте CORS настройки в `settings_prod.py`
- Проверьте логи Gunicorn
