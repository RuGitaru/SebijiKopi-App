import sqlite3
import os

db_path = 'instance/sebiji_kopi_v2.db'
if not os.path.exists(db_path):
    print(f"DB NOT FOUND at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("Tables:", cursor.fetchall())
    
    cursor.execute("SELECT count(*) FROM users")
    print("User count:", cursor.fetchone()[0])
    
    cursor.execute("SELECT username, role, password FROM users")
    users = cursor.fetchall()
    print("Users in DB:")
    for u in users:
        print(f"U: {u[0]}, R: {u[1]}, P: {u[2]}")
    conn.close()
