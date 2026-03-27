import subprocess
import os

def install_frontend():
    frontend_dir = r"c:\Users\Ilshat\habbits\frontend"
    log_file = r"c:\Users\Ilshat\habbits\frontend_install.log"
    with open(log_file, "w") as f:
        subprocess.run(["npm", "install"], cwd=frontend_dir, stdout=f, stderr=f, shell=True)

if __name__ == "__main__":
    install_frontend()
