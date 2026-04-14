from pathlib import Path
p=Path(r'c:\Users\Lecoo\dev\habbits\frontend\src\App.js')
lines=p.read_text(encoding='utf-8').splitlines()
for i in range(790, 810):
    print(f'{i+1}: {lines[i]}')
