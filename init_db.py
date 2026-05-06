# File: init_db.py
from app import app
from models import db, User, Product, Inventory, Employee
import master_data
from datetime import datetime, timedelta

def setup_database():
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("Membangun ulang database menggunakan Master Data...")

        # 1. Internal Master: Admin Pusat
        db.session.add(User(username='admin1', password='123', role='admin', name='Admin Pusat', email='admin@sebiji.com'))

        # 2. External Entities: Customers (Data dikelola mandiri oleh Partner)
        for i, (name, phone, addr, email) in enumerate(master_data.PARTNERS):
            db.session.add(User(
                username=f'cust{i+1}', 
                password='123', 
                role='customer', 
                name=name, 
                phone=phone, 
                address=addr, 
                email=email
            ))

        # 3. Internal Master: Karyawan & Akun Gudang (Aset SDM Perusahaan)
        for loc, code in master_data.LOCATIONS.items():
            data = master_data.STAFF_POOLS[loc]
            
            # Supervisor
            spv_name = data['Supervisor']
            db.session.add(User(username=f'spv_{code}', password='123', role='wh_supervisor', name=spv_name, location=loc))
            db.session.add(Employee(warehouse_location=loc, name=spv_name, role='Kepala Gudang (Supervisor)', phone=f'0811000{code}'))
            
            # Operators
            for i, (nama, role) in enumerate(zip(data['Operators'], data['Roles'])):
                db.session.add(User(username=f'op{i+1}_{code}', password='123', role='wh_operator', name=nama, location=loc))
                db.session.add(Employee(warehouse_location=loc, name=nama, role=role, phone=f'0822000{code}{i+1}'))

        # 4. Tambah Master Produk
        for name in master_data.PRODUCTS: 
            db.session.add(Product(name=name))

        # 5. Tambah Dummy Stocks (Initial Seed)
        dummy_stocks = {
            'Bekasi': [350, 480, 100, 250], 
            'Jakarta Utara': [120, 100, 20, 80], 
            'Cikarang': [50, 500, 10, 200]
        }

        for loc in master_data.LOCATIONS:
            stocks = dummy_stocks.get(loc, [100, 100, 100, 100])
            for i, prod_name in enumerate(master_data.PRODUCTS):
                zone_name, block_prefix = master_data.ZONES[prod_name]
                total_stock = stocks[i]
                
                # Batch 1 (Old)
                db.session.add(Inventory(
                    warehouse_location=loc, product_name=prod_name, 
                    stock_kg=total_stock * 0.6, 
                    zone=zone_name, rack=block_prefix,
                    inbound_date=datetime.now() - timedelta(days=10)
                ))
                # Batch 2 (New)
                db.session.add(Inventory(
                    warehouse_location=loc, product_name=prod_name, 
                    stock_kg=total_stock * 0.4, 
                    zone=zone_name, rack=block_prefix,
                    inbound_date=datetime.now() - timedelta(days=2)
                ))

        db.session.commit()
        print("Selesai! Database telah diinisialisasi dengan Master Data terpusat.")

if __name__ == '__main__':
    setup_database()