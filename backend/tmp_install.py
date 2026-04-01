import subprocess
import sys
import os

def install_requirements():
    req_path = r"c:\Users\Ilshat\habbits\requirements.txt"
    log_path = r"c:\Users\Ilshat\habbits\backend_install.log"
    venv_python = sys.executable
    print(f"Installing from {req_path} to log {log_path} using {venv_python}")
    with open(log_path, "w") as f:
        subprocess.run([venv_python, "-m", "pip", "install", "-r", req_path], stdout=f, stderr=f)

if __name__ == "__main__":
    install_requirements()
