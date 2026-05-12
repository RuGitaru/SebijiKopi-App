# File: routes/admin.py
from flask import Blueprint, request, jsonify, session
from models import db, Inventory, Order, User, Employee
from routes.utils import format_orders_for_frontend

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/admin/data', methods=['GET'])
def admin_data():
    if session.get('role') not in ['admin', 'wh_supervisor', 'wh_operator']: 
        return jsonify({"error": "Unauthorized"}), 401
    
    from models import OrderItem, Order
    from datetime import datetime, timedelta
    
    stock_data = {'Bekasi': {}, 'Jakarta Utara': {}, 'Cikarang': {}}
    all_inventories = Inventory.query.all()
    
    # Pre-calculate demand PER LOKASI (Benchmark April 2026)
    ref_start = datetime(2026, 4, 1, 0, 0, 0)
    ref_end = datetime(2026, 4, 30, 23, 59, 59)
    
    # Ambil penjualan per produk PER LOKASI
    loc_product_demands = {loc: {} for loc in stock_data.keys()}
    recent_sales = db.session.query(
        Order.warehouse_location, 
        OrderItem.product_name, 
        db.func.sum(OrderItem.qty_kg)
    ).join(Order).filter(
        Order.created_at >= ref_start,
        Order.created_at <= ref_end
    ).group_by(Order.warehouse_location, OrderItem.product_name).all()
    
    for loc, prod, total_qty in recent_sales:
        if loc in loc_product_demands:
            loc_product_demands[loc][prod] = total_qty
        
    for inv in all_inventories:
        if inv.product_name not in stock_data[inv.warehouse_location]:
            # Ambil demand spesifik untuk lokasi ini
            loc_demand = loc_product_demands.get(inv.warehouse_location, {}).get(inv.product_name, 800.0)
            
            stock_data[inv.warehouse_location][inv.product_name] = {
                "stock": 0, 
                "zone": inv.zone, 
                "rack": inv.rack,
                "demand": loc_demand,
                "batches": []
            }
        
        stock_data[inv.warehouse_location][inv.product_name]["stock"] += inv.stock_kg
        stock_data[inv.warehouse_location][inv.product_name]["batches"].append({
            "qty": inv.stock_kg,
            "date": inv.inbound_date.strftime('%d/%m/%y %H:%M') if inv.inbound_date else '-'
        })
        # Sort batches by date for UI
        stock_data[inv.warehouse_location][inv.product_name]["batches"].sort(key=lambda x: x['date'])
        
    from models import InboundTask
    import datetime
    import calendar

    month_str = request.args.get('month')
    if month_str:
        try:
            year, month = map(int, month_str.split('-'))
            start_date = datetime.datetime(year, month, 1)
            last_day = calendar.monthrange(year, month)[1]
            end_date = datetime.datetime(year, month, last_day, 23, 59, 59)
            
            all_orders = Order.query.filter(Order.created_at >= start_date, Order.created_at <= end_date).order_by(Order.created_at.desc()).all()
            inbound_tasks = InboundTask.query.filter(InboundTask.created_at >= start_date, InboundTask.created_at <= end_date).all()
        except:
            all_orders = Order.query.order_by(Order.created_at.desc()).all()
            inbound_tasks = InboundTask.query.all()
    else:
        all_orders = Order.query.order_by(Order.created_at.desc()).all()
        inbound_tasks = InboundTask.query.all()

    customers = User.query.filter_by(role='customer').all()
    cust_data = [{"id": c.id, "name": c.name, "username": c.username, "phone": c.phone, "address": c.address, "email": c.email} for c in customers]
    
    employees = Employee.query.all()
    emp_data = [{"id": e.id, "warehouse_location": e.warehouse_location, "name": e.name, "role": e.role, "status": e.status, "phone": e.phone} for e in employees]

    inbound_data = [{
        "id": t.id,
        "warehouse_location": t.warehouse_location,
        "product_name": t.product_name,
        "qty_kg": t.qty_kg,
        "operator_name": t.operator_name,
        "status": t.status,
        "created_at": t.created_at.strftime('%Y-%m-%d %H:%M') if t.created_at else ''
    } for t in inbound_tasks]
    
    return jsonify({
        "stocks": stock_data, 
        "orders": format_orders_for_frontend(all_orders),
        "customers": cust_data,
        "employees": emp_data,
        "inbound_tasks": inbound_data
    })

@admin_bp.route('/api/admin/assign', methods=['POST'])
def admin_assign():
    data = request.get_json()
    order = Order.query.get(data['order_id'])
    order.warehouse_location = data['warehouse']
    order.status = 'Menunggu Diproses'
    db.session.commit()
    return jsonify({"success": True})

@admin_bp.route('/api/admin/approve', methods=['POST'])
def admin_approve():
    data = request.get_json()
    order = Order.query.get(data['order_id'])
    for item in order.items:
        total_stock = db.session.query(db.func.sum(Inventory.stock_kg)).filter_by(
            product_name=item.product_name, 
            warehouse_location=order.warehouse_location
        ).scalar() or 0.0
        
        # Validasi stok tetap dilakukan (read-only) sesuai permintaan user
        if total_stock < item.qty_kg:
            return jsonify({"error": f"Stok {item.product_name} tidak mencukupi di {order.warehouse_location}"}), 400
    order.status = 'Disetujui Admin (Siap Kirim)'
    db.session.commit()
    return jsonify({"success": True})

@admin_bp.route('/api/admin/order/<int:order_id>/delete', methods=['DELETE'])
def admin_delete_order(order_id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    
    # Delete associated order items first (though cascade should handle it)
    for item in order.items:
        db.session.delete(item)
    db.session.delete(order)
    db.session.commit()
    return jsonify({"success": True})

@admin_bp.route('/api/admin/profile-requests', methods=['GET'])
def list_profile_requests():
    if session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    from models import ProfileChangeRequest
    reqs = ProfileChangeRequest.query.filter_by(status='Menunggu').order_by(ProfileChangeRequest.requested_at.desc()).all()
    
    return jsonify([{
        "id": r.id,
        "user_id": r.user_id,
        "username": r.user.username,
        "name": r.user.name,
        "role": r.user.role,
        "field": r.field_name,
        "old_value": r.old_value,
        "new_value": r.new_value if r.field_name != 'password' else '********',
        "date": r.requested_at.strftime('%Y-%m-%d %H:%M')
    } for r in reqs])

@admin_bp.route('/api/admin/profile-requests/<int:req_id>/approve', methods=['POST'])
def approve_profile_request(req_id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    from models import ProfileChangeRequest, User
    req = ProfileChangeRequest.query.get(req_id)
    if not req:
        return jsonify({"success": False, "message": "Request tidak ditemukan"}), 404
    
    user = User.query.get(req.user_id)
    if user:
        setattr(user, req.field_name, req.new_value)
        req.status = 'Disetujui'
        db.session.commit()
        return jsonify({"success": True})
    
    return jsonify({"success": False, "message": "User tidak ditemukan"}), 404

@admin_bp.route('/api/admin/profile-requests/<int:req_id>/reject', methods=['POST'])
def reject_profile_request(req_id):
    if session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 401
    
    from models import ProfileChangeRequest
    req = ProfileChangeRequest.query.get(req_id)
    if req:
        req.status = 'Ditolak'
        db.session.commit()
        return jsonify({"success": True})
    
    return jsonify({"success": False, "message": "Request tidak ditemukan"}), 404