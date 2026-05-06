import sqlite3
import datetime
import random
import calendar
from werkzeug.security import generate_password_hash
import master_data

# Use constants from master_data
LOCATIONS = master_data.LOCATIONS
PRODUCTS = master_data.PRODUCTS
ZONES = master_data.ZONES
CAPACITY = master_data.MAX_CAPACITY
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
    
    staff_by_loc_role = {loc: {'Supervisor': [], 'PickingPacking': [], 'Inbound': [], 'QC': []} for loc in LOCATIONS}

    for loc in LOCATIONS:
        data = master_data.STAFF_POOLS[loc]
        spv_name = data['Supervisor']
        
        # Supervisor
        staff_by_loc_role[loc]['Supervisor'].append(spv_name)
        cursor.execute("INSERT INTO employees (warehouse_location, name, role, status, phone) VALUES (?, ?, ?, ?, ?)", (loc, spv_name, 'Supervisor', 'Aktif', '081211112222'))
        
        # Mapping operators to the expected keys for fix_demo_data logic
        for i, (name, role) in enumerate(zip(data['Operators'], data['Roles'])):
            if 'Picking' in role:
                staff_by_loc_role[loc]['PickingPacking'].append(name)
                cursor.execute("INSERT INTO employees (warehouse_location, name, role, status, phone) VALUES (?, ?, ?, ?, ?)", (loc, name, 'Operator Picking & Packing', 'Aktif', '081233334444'))
            elif 'Inbound' in role:
                staff_by_loc_role[loc]['Inbound'].append(name)
                cursor.execute("INSERT INTO employees (warehouse_location, name, role, status, phone) VALUES (?, ?, ?, ?, ?)", (loc, name, 'Operator Inbound', 'Aktif', '081255556666'))
            elif 'QC' in role:
                staff_by_loc_role[loc]['QC'].append(name)
                cursor.execute("INSERT INTO employees (warehouse_location, name, role, status, phone) VALUES (?, ?, ?, ?, ?)", (loc, name, 'Staf QC (Quality Control)', 'Aktif', '081277778888'))
            else:
                # Fallback
                staff_by_loc_role[loc]['PickingPacking'].append(name)
                cursor.execute("INSERT INTO employees (warehouse_location, name, role, status, phone) VALUES (?, ?, ?, ?, ?)", (loc, name, role, 'Aktif', '081299990000'))
    
    # 2. Insert Partners (Customers) from Master Data
    cursor.execute("DELETE FROM users WHERE role = 'customer'")
    customer_ids = []
    for i, (name, phone, addr, email) in enumerate(master_data.PARTNERS):
        username = f'cust{i+1}'
        cursor.execute("INSERT INTO users (username, password, role, name, phone, address, email) VALUES (?, ?, ?, ?, ?, ?, ?)",
                       (username, '123', 'customer', name, phone, addr, email))
        customer_ids.append(cursor.lastrowid)

    print("Generating Varied Growth Data (Final Polish)...")
    
    loc_list = list(LOCATIONS.keys())
    alert_prods = random.sample(PRODUCTS, len(loc_list))
    alert_map = {loc_list[i]: alert_prods[i] for i in range(len(loc_list))}

    targets = {
        m: {
            loc: {
                prod: (random.uniform(1050, 1350) if (prod == alert_map[loc] and m == 3) else 
                       (random.uniform(220, 280) if (prod == alert_map[loc]) else random.uniform(700, 950)))
                for prod in PRODUCTS
            } for loc in LOCATIONS
        } for m in [1, 2, 3]
    }

    # Proses bulan Januari s/d April secara penuh (100% Selesai)
    for month in [1, 2, 3, 4]:
        max_days = calendar.monthrange(YEAR, month)[1]
        days_to_process = max_days
        print(f" > Finalizing month: {YEAR}-{month:02d}")
        
        for loc in LOCATIONS:
            # Frekuensi order bulk yang lebih masuk akal untuk kapasitas 1600kg
            order_count = random.randint(5, 7)
            for o_idx in range(order_count):
                day = random.randint(1, max_days)
                cursor.execute("INSERT INTO orders (customer_id, warehouse_location, status, created_at, assigned_operator) VALUES (?, ?, ?, ?, ?)",
                               (random.choice(customer_ids), loc, 'Selesai', datetime.datetime(YEAR, month, day, 14, 0).strftime('%Y-%m-%d %H:%M:%S'), random.choice(staff_by_loc_role[loc]['PickingPacking'])))
                order_id = cursor.lastrowid
                
                for prod in PRODUCTS:
                    # Kuantitas disesuaikan agar total bulanan tidak meledak melampaui kapasitas 1600kg
                    qty = random.uniform(120, 160)
                    cursor.execute("INSERT INTO order_items (order_id, product_name, qty_kg) VALUES (?, ?, ?)", (order_id, prod, qty))
                    
            for prod in PRODUCTS:
                # Inbound historis yang masuk akal
                hist_qty = random.uniform(1200, 1500)
                hist_day = random.randint(1, 5)
                cursor.execute("INSERT INTO inbound_tasks (warehouse_location, product_name, qty_kg, operator_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                               (loc, prod, hist_qty, staff_by_loc_role[loc]['Inbound'][0], 'Selesai Inbound', datetime.datetime(YEAR, month, hist_day, 9, 0).strftime('%Y-%m-%d %H:%M:%S')))

    print("Refining Stocks with Dynamic & Varied Scenarios...")
    # Skenario Variatif:
    # Bekasi: 2 produk menipis (Gayo & Robusta)
    # Jakut: 2 produk menipis tipis (Liberika & Excelsa) - Borderline 58%
    # Cikarang: 1 produk menipis (Gayo)
    
    scenarios = {
        'Bekasi': {'thin': ['Arabika Gayo Specialty', 'Robusta Dampit Premium'], 'ratio': 0.45},
        'Jakarta Utara': {'thin': ['Liberika Jambi Eksotik', 'Excelsa House Blend'], 'ratio': 0.58},
        'Cikarang': {'thin': ['Arabika Gayo Specialty'], 'ratio': 0.45}
    }

    for loc in LOCATIONS:
        config = scenarios[loc]
        for prod in PRODUCTS:
            cursor.execute("""
                SELECT SUM(oi.qty_kg) 
                FROM order_items oi 
                JOIN orders o ON oi.order_id = o.id 
                WHERE o.warehouse_location = ? AND oi.product_name = ? 
                AND o.created_at >= '2026-04-01' AND o.created_at <= '2026-04-30'
            """, (loc, prod))
            last_month_sales = cursor.fetchone()[0] or 800
            
            if prod in config['thin']:
                stock = last_month_sales * config['ratio']
            else:
                stock = min(1600, last_month_sales * 1.2)
            
            zone, rack = ZONES[prod]
            batch_count = 2
            # Split stock into two batches
            b1_qty = stock * 0.6
            b2_qty = stock * 0.4
            
            now = datetime.datetime(2026, 5, 5)
            # Batch 1: Older
            d1 = now - datetime.timedelta(days=random.randint(20, 25))
            # Batch 2: Newer
            d2 = now - datetime.timedelta(days=random.randint(5, 10))
            
            for b_idx, (b_qty, b_date) in enumerate([(b1_qty, d1), (b2_qty, d2)]):
                b_date_str = b_date.strftime('%Y-%m-%d %H:%M:%S')
                cursor.execute("INSERT INTO inventories (warehouse_location, product_name, zone, rack, stock_kg, inbound_date) VALUES (?, ?, ?, ?, ?, ?)",
                               (loc, prod, zone, rack, b_qty, b_date_str))
                cursor.execute("INSERT INTO inbound_tasks (warehouse_location, product_name, qty_kg, operator_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                               (loc, prod, b_qty, staff_by_loc_role[loc]['Inbound'][0], 'Selesai Inbound', b_date_str))

    conn.commit()
    conn.close()
    print(f"Success! Final Polish Completed.")

if __name__ == "__main__":
    generate_data()
