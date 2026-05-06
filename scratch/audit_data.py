import sqlite3

conn = sqlite3.connect('instance/sebiji_kopi_v2.db')
cursor = conn.cursor()

print("--- USERS ---")
cursor.execute("SELECT username, name, role, location FROM users ORDER BY location, username")
for u in cursor.fetchall():
    print(u)

print("\n--- EMPLOYEES ---")
cursor.execute("SELECT name, role, warehouse_location FROM employees ORDER BY warehouse_location, id")
for e in cursor.fetchall():
    print(e)

conn.close()
