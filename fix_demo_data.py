import sqlite3
import datetime
import random
import calendar
import master_data

# Use constants from master_data
LOCATIONS = master_data.LOCATIONS
PRODUCTS = master_data.PRODUCTS
ZONES = master_data.ZONES
YEAR = 2026

def generate_data():
    conn = sqlite3.connect('instance/sebiji_kopi_v2.db')
    cursor = conn.cursor()
    
    print("Cleaning existing data...")
    cursor.execute("DELETE FROM inbound_tasks")
    cursor.execute("DELETE FROM order_items")
    cursor.execute("DELETE FROM orders")
    cursor.execute("DELETE FROM inventories")
    cursor.execute("DELETE FROM employees")
    
    # 1. Setup SDM & Customers
    staff_by_loc_role = {loc: {'Supervisor': [], 'PickingPacking': [], 'Inbound': []} for loc in LOCATIONS}
    for loc in LOCATIONS:
        data = master_data.STAFF_POOLS[loc]
        spv = data['Supervisor']
        staff_by_loc_role[loc]['Supervisor'].append(spv)
        cursor.execute("INSERT INTO employees (warehouse_location, name, role, status, phone) VALUES (?, ?, ?, ?, ?)", (loc, spv, 'Supervisor', 'Aktif', '0811'))
        for i, (name, role) in enumerate(zip(data['Operators'], data['Roles'])):
            r_name = 'Operator Picking & Packing' if 'Picking' in role else ('Operator Inbound' if 'Inbound' in role else role)
            key = 'PickingPacking' if 'Picking' in role else 'Inbound'
            if key in staff_by_loc_role[loc]: staff_by_loc_role[loc][key].append(name)
            cursor.execute("INSERT INTO employees (warehouse_location, name, role, status, phone) VALUES (?, ?, ?, ?, ?)", (loc, name, r_name, 'Aktif', '0822'))

    cursor.execute("DELETE FROM users WHERE role = 'customer'")
    customer_ids = []
    for i, (name, phone, addr, email) in enumerate(master_data.PARTNERS):
        username = f'cust{i+1}'
        cursor.execute("INSERT INTO users (username, password, role, name, phone, address, email) VALUES (?, ?, ?, ?, ?, ?, ?)", (username, '123', 'customer', name, phone, addr, email))
        customer_ids.append(cursor.lastrowid)

    print("Generating Chronological Organic Data...")
    
    scenarios = {
        'Bekasi': {'thin': ['Arabika Gayo Specialty', 'Robusta Dampit Premium'], 'ratio': 0.5},
        'Jakarta Utara': {'thin': ['Liberika Jambi Eksotik', 'Excelsa House Blend'], 'ratio': 0.58},
        'Cikarang': {'thin': ['Arabika Gayo Specialty'], 'ratio': 0.5}
    }

    running_balances = {loc: {prod: 0 for prod in PRODUCTS} for loc in LOCATIONS}
    
    all_inbound_tasks = [] # (date, loc, prod, qty)
    all_orders = [] # (date, loc, items_list)

    for month in [1, 2, 3, 4]:
        max_days = calendar.monthrange(YEAR, month)[1]
        
        for loc in LOCATIONS:
            config = scenarios.get(loc, {'thin': [], 'ratio': 1.2})
            
            # --- Tentukan Outbound Bulanan ---
            order_count = random.randint(5, 7)
            monthly_sales = {p: 0 for p in PRODUCTS}
            
            for _ in range(order_count):
                o_date = datetime.datetime(YEAR, month, random.randint(1, max_days), 14, 0)
                o_items = []
                for prod in PRODUCTS:
                    qty = random.uniform(120, 160)
                    monthly_sales[prod] += qty
                    o_items.append((prod, qty))
                all_orders.append((o_date, loc, o_items))

            # --- Tentukan Inbound Bulanan ---
            for prod in PRODUCTS:
                total_out = monthly_sales[prod]
                if month == 4:
                    target_stock = total_out * (config['ratio'] if prod in config['thin'] else 1.2)
                    if target_stock > 1600: target_stock = 1600
                else:
                    target_stock = (month * 150)
                
                needed_in = total_out + target_stock - running_balances[loc][prod]
                needed_in = max(0, needed_in)
                running_balances[loc][prod] = target_stock
                
                # Split into 2 batches
                d1 = datetime.datetime(YEAR, month, 5, 9, 0)
                d2 = datetime.datetime(YEAR, month, 15, 14, 0)
                all_inbound_tasks.append((d1, loc, prod, needed_in * 0.6))
                all_inbound_tasks.append((d2, loc, prod, needed_in * 0.4))
                
                # Physical stock for May only from April batches
                if month == 4:
                    zone, rack = ZONES[prod]
                    cursor.execute("INSERT INTO inventories (warehouse_location, product_name, zone, rack, stock_kg, inbound_date) VALUES (?, ?, ?, ?, ?, ?)",
                                   (loc, prod, zone, rack, target_stock * 0.6, d1.strftime('%Y-%m-%d %H:%M:%S')))
                    cursor.execute("INSERT INTO inventories (warehouse_location, product_name, zone, rack, stock_kg, inbound_date) VALUES (?, ?, ?, ?, ?, ?)",
                                   (loc, prod, zone, rack, target_stock * 0.4, d2.strftime('%Y-%m-%d %H:%M:%S')))

    # --- FINAL INSERT: CHRONOLOGICAL SORTING ---
    # Sort everything by date before inserting
    all_inbound_tasks.sort(key=lambda x: x[0])
    all_orders.sort(key=lambda x: x[0])

    print(" > Inserting Inbound Tasks chronologically...")
    for d, loc, prod, qty in all_inbound_tasks:
        cursor.execute("INSERT INTO inbound_tasks (warehouse_location, product_name, qty_kg, operator_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                       (loc, prod, qty, staff_by_loc_role[loc]['Inbound'][0], 'Selesai Inbound', d.strftime('%Y-%m-%d %H:%M:%S')))

    print(" > Inserting Orders chronologically...")
    for d, loc, items in all_orders:
        cursor.execute("INSERT INTO orders (customer_id, warehouse_location, status, created_at, assigned_operator) VALUES (?, ?, ?, ?, ?)",
                       (random.choice(customer_ids), loc, 'Selesai', d.strftime('%Y-%m-%d %H:%M:%S'), random.choice(staff_by_loc_role[loc]['PickingPacking'])))
        order_id = cursor.lastrowid
        for prod, qty in items:
            cursor.execute("INSERT INTO order_items (order_id, product_name, qty_kg) VALUES (?, ?, ?)", (order_id, prod, qty))

    conn.commit()
    conn.close()
    print("Success! Data is now perfectly chronological.")

if __name__ == "__main__":
    generate_data()
