import sqlite3

db_path = 'instance/sebiji_kopi_v2.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Standardize role name for Picking & Packing
cursor.execute("UPDATE employees SET role = 'Operator Picking & Packing' WHERE role LIKE '%Picking%' OR role LIKE '%Packing%'")

# 2. Setup Data Mapping (based on init_db.py names and user requirements)
# User wants: op1-3: Picking & Packing, op4: Inbound, op5: QC
wh_data = {
    'Bekasi': {
        'code': 'bks',
        'spv': 'Budi Santoso',
        'ops': ['Siti Aminah', 'Agus Prayitno', 'Lestari Wahyuni', 'Deni Setiawan', 'Rian Hidayat']
    },
    'Jakarta Utara': {
        'code': 'jkt',
        'spv': 'Andi Silalahi',
        'ops': ['Tono S', 'Rudi H', 'Maya S', 'Joko P', 'Fitri M']
    },
    'Cikarang': {
        'code': 'ckr',
        'spv': 'Hendra Wijaya',
        'ops': ['Agus W', 'Lina K', 'Hadi S', 'Bambang G', 'Nina S']
    }
}

# Delete "generic" users that might have been created
cursor.execute("DELETE FROM users WHERE username LIKE 'op_%' OR username LIKE 'spv_%'")

for loc, data in wh_data.items():
    code = data['code']
    spv_name = data['spv']
    ops = data['ops']
    
    # 3. Fix Supervisor
    cursor.execute("INSERT OR REPLACE INTO users (username, password, role, name, location) VALUES (?, ?, ?, ?, ?)",
                   (f'spv_{code}', '123', 'wh_supervisor', spv_name, loc))
    cursor.execute("INSERT OR REPLACE INTO employees (warehouse_location, name, role, status, phone) VALUES (?, ?, ?, ?, ?)",
                   (loc, spv_name, 'Supervisor', 'Aktif', f'0811000{code}'))
    
    # 4. Fix Operators
    for i, name in enumerate(ops):
        username = f'op{i+1}_{code}'
        role_label = ''
        if i < 3: role_label = 'Operator Picking & Packing'
        elif i == 3: role_label = 'Operator Inbound'
        else: role_label = 'Staf QC (Quality Control)'
        
        # Update/Insert User
        cursor.execute("INSERT OR REPLACE INTO users (username, password, role, name, location) VALUES (?, ?, ?, ?, ?)",
                       (username, '123', 'wh_operator', name, loc))
        
        # Update/Insert Employee (Using INSERT OR REPLACE on name/location if unique, but here we just update or insert)
        # We check if employee exists with this name and location
        cursor.execute("SELECT id FROM employees WHERE name = ? AND warehouse_location = ?", (name, loc))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("UPDATE employees SET role = ? WHERE id = ?", (role_label, existing[0]))
        else:
            cursor.execute("INSERT INTO employees (warehouse_location, name, role, status, phone) VALUES (?, ?, ?, ?, ?)",
                           (loc, name, role_label, 'Aktif', f'0822000{code}{i+1}'))

# Remove old generic employees if they exist
cursor.execute("DELETE FROM employees WHERE name LIKE '%Inbound' OR name LIKE '%Staff%' OR name LIKE '%QC'")

conn.commit()
conn.close()
print("Sync Complete!")
