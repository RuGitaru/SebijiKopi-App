import sqlite3
c = sqlite3.connect('instance/sebiji_kopi_v2.db').cursor()
print("order items:", c.execute("SELECT DISTINCT product_name FROM order_items").fetchall())
print("inventories:", c.execute("SELECT DISTINCT product_name FROM inventories").fetchall())
print("inbounds:", c.execute("SELECT DISTINCT product_name FROM inbound_tasks").fetchall())
