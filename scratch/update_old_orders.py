from app import app
from models import db, Order
from datetime import datetime

with app.app_context():
    cutoff_date = datetime(2026, 4, 1)
    orders_to_update = Order.query.filter(Order.created_at < cutoff_date).all()
    count = len(orders_to_update)
    
    deleted_count = 0
    for order in orders_to_update:
        if order.status != 'Selesai':
            order.status = 'Selesai'
            deleted_count += 1
            
    db.session.commit()
    print(f"Total orders found before April 2026: {count}")
    print(f"Orders updated to 'Selesai': {deleted_count}")
