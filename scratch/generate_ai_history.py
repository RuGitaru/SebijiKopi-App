import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
from datetime import datetime, timedelta
from app import app
from models import db, Order, OrderItem, InboundTask, User

with app.app_context():
    print("Generating Historical Data for AI Forecast (Jan-Mar 2026)...")
    
    products = ['Robusta Gayo', 'Arabica Mandheling', 'House Blend Espresso', 'Robusta Dampit', 'Liberica Temanggung']
    warehouses = ['Bekasi', 'Jakarta Utara', 'Cikarang']
    statuses_order = ['Selesai', 'Selesai', 'Selesai'] # Mostly done
    
    customers = User.query.filter_by(role='customer').all()
    if not customers:
        print("No customers found. Cannot generate orders.")
        exit()
        
    start_date = datetime(2026, 1, 1)
    end_date = datetime(2026, 3, 31)
    delta = end_date - start_date
    
    # Generate 150 historical orders
    for _ in range(150):
        rand_days = random.randrange(delta.days)
        order_date = start_date + timedelta(days=rand_days)
        
        # Determine trend roughly:
        # Let's say House Blend Espresso sells a lot in March, Robusta Gayo in Jan-Feb.
        
        c = random.choice(customers)
        w = random.choice(warehouses)
        
        new_order = Order(
            customer_id=c.id,
            warehouse_location=w,
            status='Selesai',
            expedition='JNE',
            awb_number=f"HIST{random.randint(10000,99999)}",
            created_at=order_date
        )
        db.session.add(new_order)
        db.session.flush() # get id
        
        # Pick 1-3 items
        for _ in range(random.randint(1, 3)):
            p = random.choice(products)
            
            # Artificial trend logic:
            if p == 'House Blend Espresso' and order_date.month == 3:
                qty = random.uniform(50, 150) # high demand in March
            elif p == 'Robusta Gayo' and order_date.month == 1:
                qty = random.uniform(40, 100) # high in Jan
            else:
                qty = random.uniform(5, 30)
                
            item = OrderItem(
                order_id=new_order.id,
                product_name=p,
                qty_kg=round(qty, 1)
            )
            db.session.add(item)
            
    db.session.commit()
    print("Data historical generated successfully tanpa mengubah inventory saat ini.")
