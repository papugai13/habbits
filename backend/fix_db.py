import sqlite3
import os

db_path = 'db.sqlite3'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

try:
    conn = sqlite3.connect(db_path, timeout=10)
    cursor = conn.cursor()
    
    # Check current columns
    cursor.execute("PRAGMA table_info(api_habit)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Current columns in api_habit: {columns}")
    
    if 'created_at' not in columns:
        print("Adding column created_at...")
        # Date default should be today's date
        from datetime import date
        today = date.today().isoformat()
        cursor.execute(f"ALTER TABLE api_habit ADD COLUMN created_at DATE DEFAULT '{today}'")
        conn.commit()
        print("Column created_at added successfully.")
    else:
        print("Column created_at already exists.")
        
    conn.close()
except Exception as e:
    print(f"An error occurred: {e}")
