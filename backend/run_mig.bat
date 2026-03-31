call .venv\Scripts\activate.bat
python manage.py makemigrations api > mig1.txt 2>&1
python manage.py migrate api > mig2.txt 2>&1
