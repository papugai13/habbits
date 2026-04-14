from pathlib import Path
path = Path(r'c:\Users\Lecoo\dev\habbits\frontend\src\App.js')
text = path.read_text(encoding='utf-8')
start = '          const weeklyCount = getHabitCount(habit);'
end = '  // Close profile menu when clicking outside'
idx = text.find(start)
if idx == -1:
    raise SystemExit('START not found')
idx_end = text.find(end, idx)
if idx_end == -1:
    raise SystemExit('END not found')
path.write_text(text[:idx] + text[idx_end:], encoding='utf-8')
print('cleaned')
