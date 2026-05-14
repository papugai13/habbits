import sqlite3
import os
os.chdir(r'c:\Users\Lecoo\dev\habbits')
conn = sqlite3.connect('backend/db.sqlite3')
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='api_date'")
print('api_date exists', cur.fetchone())
cur.execute('SELECT id, name FROM api_habit LIMIT 10')
habits = cur.fetchall()
print('habits', habits)
for hid, name in habits:
    cur.execute('SELECT COUNT(*) FROM api_date WHERE habit_id=? AND quantity IS NOT NULL', (hid,))
    qcount = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM api_date WHERE habit_id=? AND is_done=1 AND quantity IS NULL', (hid,))
    noqty = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM api_date WHERE habit_id=? AND is_done=1', (hid,))
    done = cur.fetchone()[0]
    print(hid, name, 'qty nonnull', qcount, 'done no qty', noqty, 'done total', done)
conn.close()