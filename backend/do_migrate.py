import subprocess
import os

try:
    python_exe = os.path.join(".venv", "Scripts", "python.exe")
    out1 = subprocess.check_output([python_exe, "manage.py", "makemigrations", "api"], text=True, stderr=subprocess.STDOUT)
    print("MAKEMIGRATIONS:", out1)
    out2 = subprocess.check_output([python_exe, "manage.py", "migrate", "api"], text=True, stderr=subprocess.STDOUT)
    print("MIGRATE:", out2)
except Exception as e:
    print("ERROR:", str(e))
    if hasattr(e, 'output'):
        print("OUTPUT:", e.output)
