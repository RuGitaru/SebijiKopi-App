import sqlite3
import os

db_path = 'instance/sebiji_kopi_v2.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT username, password, role FROM users WHERE username = 'cust1'")
    user = cursor.fetchone()
    if user:
        print(f"Found user: {user}")
    else:
        print("User 'cust1' not found.")
        cursor.execute("SELECT username, role FROM users")
        print("Existing users:", cursor.fetchall())
    conn.close()
