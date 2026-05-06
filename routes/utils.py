# File: routes/utils.py

def format_orders_for_frontend(orders_query):
    result = []
    for o in orders_query:
        items_list = [{"product": i.product_name, "qty": i.qty_kg} for i in o.items]
        result.append({
            "id": o.id, "customer": o.customer.username, "customer_name": o.customer.name,
            "customer_address": o.customer.address, "customer_phone": o.customer.phone,
            "warehouse": o.warehouse_location, "status": o.status,
            "expedition": o.expedition, "awb_number": o.awb_number,
            "assigned_operator": o.assigned_operator, # FITUR BARU: Baca dari database
            "date": o.created_at.strftime('%d %b %Y %H:%M'), "items": items_list
        })
    return result