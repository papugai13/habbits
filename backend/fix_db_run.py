import sqlite3
import traceback

def fix_db():
    try:
        print("Connecting to db.sqlite3...")
        conn = sqlite3.connect('db.sqlite3', timeout=10)
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(api_category)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'order' not in columns:
            print("Adding 'order' column to api_category...")
            cursor.execute('ALTER TABLE api_category ADD COLUMN "order" integer NOT NULL DEFAULT 0;')
            conn.commit()
            print("Column added successfully.")
        else:
            print("Column 'order' already exists.")
            
        # Also need to add ordering metadata for django migrations
    except Exception as e:
        print(f"Failed to fix db: {e}")
        traceback.print_exc()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    with open("fix_db_output.txt", "w") as f:
        import sys
        sys.stdout = f
        sys.stderr = f
        fix_db()
