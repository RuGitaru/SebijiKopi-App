import sqlite3
import os

db_path = 'instance/sebiji_kopi_v2.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check for cust1
cursor.execute("SELECT username, password, role FROM users WHERE username = 'cust1'")
user = cursor.fetchone()

if user:
    print(f"User 'cust1' found. Role: {user[2]}")
    # Update password to '123' (plain text)
    cursor.execute("UPDATE users SET password = '123' WHERE username = 'cust1'")
    print("Updated password for 'cust1' to '123'")
else:
    print("User 'cust1' not found. Creating it...")
    cursor.execute("INSERT INTO users (username, password, role, name) VALUES ('cust1', '123', 'customer', 'Kedai Kopi Senja')")
    print("Created user 'cust1' with password '123'")

# Also check for other customers if fix_demo_data.py was run
cursor.execute("SELECT username, password FROM users WHERE role = 'customer'")
customers = cursor.fetchall()
print("All customers in DB:")
for c in customers:
    print(f"Username: {c[0]}, Password (first 10 chars): {c[1][:10]}")
    # If it looks like a hash, fix it to 'partner123' plain text
    if c[1].startswith('scrypt:') or c[1].startswith('pbkdf2:'):
         cursor.execute("UPDATE users SET password = 'partner123' WHERE username = ?", (c[0],))
         print(f"Updated {c[0]} password to plain text 'partner123'")

conn.commit()
conn.close()
