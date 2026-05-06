# File: routes/utils.py
from models import db, Inventory

def format_orders_for_frontend(orders_query):
    result = []
    for o in orders_query:
        items_list = [{"product": i.product_name, "qty": i.qty_kg} for i in o.items]
        result.append({
            "id": o.id, "customer": o.customer.username, "customer_name": o.customer.name,
            "customer_address": o.customer.address, "customer_phone": o.customer.phone,
            "warehouse": o.warehouse_location, "status": o.status,
            "expedition": o.expedition, "awb_number": o.awb_number,
            "assigned_operator": o.assigned_operator,
            "date": o.created_at.strftime('%d %b %Y %H:%M'), "items": items_list
        })
    return result

def deduct_stock_fifo(location, product, qty_to_deduct):
    """
    Memotong stok berdasarkan batch tertua (FIFO).
    Menghapus batch yang sudah kosong.
    """
    batches = Inventory.query.filter_by(
        warehouse_location=location, 
        product_name=product
    ).order_by(Inventory.inbound_date.asc()).all()
    
    total_available = sum([b.stock_kg for b in batches])
    if total_available < qty_to_deduct:
        return False, f"Stok {product} tidak mencukupi. Butuh {qty_to_deduct}kg, hanya ada {total_available}kg."
    
    remaining = qty_to_deduct
    for batch in batches:
        if remaining <= 0: break
        
        if batch.stock_kg <= remaining:
            remaining -= batch.stock_kg
            db.session.delete(batch)
        else:
            batch.stock_kg -= remaining
            remaining = 0
            
    db.session.commit()
    return True, "Success"

def is_authorized_for_location(user_session, target_location):
    """Validasi: Apakah user boleh mengakses gudang ini?"""
    if not user_session: return False
    role = user_session.get('role')
    if role == 'admin': return True
    return user_session.get('location') == target_location

def validate_order_transition(current_status, target_status):
    """State Machine: Mencegah loncat status atau status mundur"""
    flow = {
        "Menunggu Alokasi": ["Diproses", "Dibatalkan"],
        "Diproses": ["Siap Dikirim", "Dibatalkan"],
        "Siap Dikirim": ["Selesai", "Dibatalkan"],
        "Selesai": [],
        "Dibatalkan": []
    }
    return target_status in flow.get(current_status, [])

def check_warehouse_capacity(location, product, add_qty):
    """Hard Cap: Maksimal 1600kg per zona"""
    MAX_CAPACITY = 1600.0
    current_stock = db.session.query(db.func.sum(Inventory.stock_kg)).filter_by(
        warehouse_location=location,
        product_name=product
    ).scalar() or 0.0
    
    return (current_stock + add_qty) <= MAX_CAPACITY