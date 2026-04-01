@echo off
echo Starting backend install...
cd backend
.venv\Scripts\python.exe -m pip install -r ..\requirements.txt
echo Backend install done.
cd ..
echo Starting frontend install...
cd frontend
npm install
echo Frontend install done.
cd ..
