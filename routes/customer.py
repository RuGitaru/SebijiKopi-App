# File: routes/customer.py
from flask import Blueprint, request, jsonify, session
from models import db, Order, OrderItem, User
from routes.utils import format_orders_for_frontend

customer_bp = Blueprint('customer', __name__)

@customer_bp.route('/api/customer/profile', methods=['POST'])
def update_profile():
    if 'user_id' not in session or session.get('role') != 'customer': 
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    user = User.query.get(session['user_id'])
    
    if not user:
        return jsonify({"success": False, "message": "User tidak ditemukan."}), 404
        
    user.name = data.get('name', user.name)
    user.email = data.get('email', user.email)
    user.phone = data.get('phone', user.phone)
    user.address = data.get('address', user.address)
    
    if data.get('password'):
        user.password = data['password']
        
    db.session.commit()
    
    # Update data session agar sinkron
    session['name'] = user.name
    
    return jsonify({
        "success": True, 
        "user": {
            "name": user.name, 
            "email": user.email, 
            "phone": user.phone, 
            "address": user.address,
            "username": user.username
        }
    })

@customer_bp.route('/api/customer/orders/<int:order_id>/receive', methods=['POST'])
def confirm_receive(order_id):
    if 'user_id' not in session or session.get('role') != 'customer': 
        return jsonify({"error": "Unauthorized"}), 401
    
    order = Order.query.get(order_id)
    if not order or order.customer_id != session['user_id']:
        return jsonify({"success": False, "message": "Pesanan tidak ditemukan."}), 404
        
    if order.status != 'Serahkan ke Jasa Kirim':
        return jsonify({"success": False, "message": "Pesanan belum dikirim atau sudah selesai."}), 400
        
    order.status = 'Selesai'
    db.session.commit()
    return jsonify({"success": True})

@customer_bp.route('/api/customer/orders', methods=['GET', 'POST'])
def customer_orders():
    if 'user_id' not in session or session.get('role') != 'customer': 
        return jsonify({"error": "Unauthorized"}), 401
    
    if request.method == 'POST':
        data = request.get_json()
        new_order = Order(customer_id=session['user_id'], status='Menunggu Alokasi')
        db.session.add(new_order)
        db.session.commit() 
        for item in data['items']:
            new_item = OrderItem(order_id=new_order.id, product_name=item['product'], qty_kg=float(item['qty']))
            db.session.add(new_item)
        db.session.commit()
        return jsonify({"success": True})
        
    month = request.args.get('month')
    year = request.args.get('year')
    
    query = Order.query.filter_by(customer_id=session['user_id'])
    
    if month and month != 'all':
        query = query.filter(db.extract('month', Order.created_at) == int(month))
    if year and year != 'all':
        query = query.filter(db.extract('year', Order.created_at) == int(year))
        
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify(format_orders_for_frontend(orders))