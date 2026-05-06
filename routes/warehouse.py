# File: routes/warehouse.py
from flask import Blueprint, request, jsonify, session
from models import db, Inventory, Order, Employee

warehouse_bp = Blueprint('warehouse', __name__)

@warehouse_bp.route('/api/warehouse/assign_task', methods=['POST'])
def assign_task():
    if session.get('role') != 'wh_supervisor': return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    order = Order.query.get(data['order_id'])
    if order and order.warehouse_location == session.get('location'):
        order.assigned_operator = data['operator_name']
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False})

@warehouse_bp.route('/api/warehouse/batch_assign', methods=['POST'])
def batch_assign():
    if session.get('role') != 'wh_supervisor': return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    order_ids = data.get('order_ids', [])
    op_name = data.get('operator_name')
    loc = session.get('location')
    
    orders = Order.query.filter(Order.id.in_(order_ids), Order.warehouse_location == loc).all()
    for o in orders:
        o.assigned_operator = op_name
    db.session.commit()
    return jsonify({"success": True})

@warehouse_bp.route('/api/warehouse/update_status', methods=['POST'])
def warehouse_update_status():
    if session.get('role') not in ['wh_supervisor', 'wh_operator']: return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    order = Order.query.get(data['order_id'])
    if order and order.warehouse_location == session.get('location'):
        order.status = data['status']
        
        # Potong stok fisik saat diserahkan ke Jasa Kirim (FIFO System)
        if data['status'] == 'Serahkan ke Jasa Kirim':
            for item in order.items:
                # Ambil semua batch produk yang ada, urutkan berdasarkan tanggal masuk (FIFO)
                batches = Inventory.query.filter_by(
                    product_name=item.product_name, 
                    warehouse_location=order.warehouse_location
                ).order_by(Inventory.inbound_date.asc()).all()
                
                remaining_to_deduct = item.qty_kg
                for batch in batches:
                    if remaining_to_deduct <= 0: break
                    
                    if batch.stock_kg >= remaining_to_deduct:
                        batch.stock_kg -= remaining_to_deduct
                        remaining_to_deduct = 0
                    else:
                        remaining_to_deduct -= batch.stock_kg
                        batch.stock_kg = 0
                
                # Opsional: Hapus batch yang stoknya 0 (kecuali mungkin yang terakhir agar rack tetap terdeteksi)
                # Di sini kita biarkan saja agar data rack tetap ada untuk UI.
                    
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False}), 403

@warehouse_bp.route('/api/warehouse/batch_update', methods=['POST'])
def warehouse_batch_update():
    role = session.get('role')
    if role not in ['admin', 'wh_supervisor', 'wh_operator']: return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    order_ids = data['order_ids']
    new_status = data['status']
    loc = session.get('location')
    
    orders = Order.query.filter(Order.id.in_(order_ids)).all()
    for o in orders:
        if role == 'admin' or o.warehouse_location == loc:
            o.status = new_status
            if new_status == 'Disetujui Admin (Siap Kirim)' and data.get('expedition') and data.get('awb_number'):
                o.expedition = data.get('expedition')
                o.awb_number = f"{data.get('awb_number')}-{o.id}"
    db.session.commit()
    return jsonify({"success": True})

@warehouse_bp.route('/api/warehouse/inbound', methods=['POST'])
def warehouse_inbound():
    # Validasi: Harus SPV atau Operator Inbound
    is_spv = session.get('role') == 'wh_supervisor'
    is_inbound = 'Inbound' in (session.get('job_role') or '')
    if not (is_spv or is_inbound):
        return jsonify({"error": "Akses ditolak. Hanya SPV atau Operator Inbound yang dapat mendaftarkan inbound baru."}), 403
    
    data = request.get_json()
    from models import InboundTask, User
    
    name = session.get('name')
    if not name and session.get('user_id'):
        user = User.query.get(session.get('user_id'))
        if user: name = user.name
    if not name: name = 'Operator'

    new_task = InboundTask(
        warehouse_location=session.get('location'),
        product_name=data['product'],
        qty_kg=float(data['qty']),
        operator_name=name,
        status='Menunggu Bongkar Muat'
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify({"success": True})

@warehouse_bp.route('/api/warehouse/update_inbound_status', methods=['POST'])
def update_inbound_status():
    # Validasi: HANYA Operator Inbound yang bisa proses status. SPV hanya input awal.
    is_inbound = 'Inbound' in (session.get('job_role') or '')
    if not is_inbound:
        return jsonify({"error": "Akses ditolak. Hanya Operator Inbound yang dapat memproses status inbound."}), 403
        
    data = request.get_json()
    from models import InboundTask
    task = InboundTask.query.get(data['task_id'])
    if task and task.warehouse_location == session.get('location'):
        if task.status != 'Selesai Inbound':  # Prevent double addition
            task.status = data['status']
            if task.status == 'Selesai Inbound':
                # Re-check capacity before finalizing (Sum all batches)
                CAPACITY = 1600.0
                total_stock = db.session.query(db.func.sum(Inventory.stock_kg)).filter_by(
                    product_name=task.product_name, 
                    warehouse_location=task.warehouse_location
                ).scalar() or 0.0
                
                if (total_stock + task.qty_kg) > CAPACITY:
                    return jsonify({"error": f"Kapasitas tidak mencukupi! Maksimal {CAPACITY} Kg."}), 400
                
                # Cari batch yang ada untuk ambil data zone/rack
                existing = Inventory.query.filter_by(
                    product_name=task.product_name, 
                    warehouse_location=task.warehouse_location
                ).first()
                
                if existing:
                    # Buat batch baru untuk FIFO
                    new_batch = Inventory(
                        warehouse_location=task.warehouse_location,
                        product_name=task.product_name,
                        zone=existing.zone,
                        rack=existing.rack,
                        stock_kg=float(task.qty_kg),
                        inbound_date=task.created_at
                    )
                    db.session.add(new_batch)
                else:
                    # Fallback jika belum ada inventory sama sekali (seharusnya di-init)
                    return jsonify({"error": "Data lokasi rak tidak ditemukan. Hubungi Supervisor."}), 400
            db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False})

@warehouse_bp.route('/api/warehouse/opname', methods=['POST'])
def warehouse_opname():
    if session.get('role') != 'wh_supervisor': return jsonify({"error": "Hanya Supervisor"}), 403
    data = request.get_json()
    from datetime import datetime
    
    # Konsolidasi: Hapus semua batch lama dan buat satu batch baru dengan angka aktual
    existing_batches = Inventory.query.filter_by(
        product_name=data['product'], 
        warehouse_location=session.get('location')
    ).all()
    
    if existing_batches:
        # Ambil metadata dari batch pertama
        meta = existing_batches[0]
        zone, rack = meta.zone, meta.rack
        
        # Hapus semua
        for b in existing_batches:
            db.session.delete(b)
        
        # Buat baru (Consolidated)
        new_inv = Inventory(
            warehouse_location=session.get('location'),
            product_name=data['product'],
            zone=zone,
            rack=rack,
            stock_kg=float(data['actual_qty']),
            inbound_date=datetime.utcnow()
        )
        db.session.add(new_inv)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False})

@warehouse_bp.route('/api/warehouse/sdm', methods=['GET', 'POST'])
def handle_sdm():
    loc = session.get('location')
    role = session.get('role')
    
    # PERBAIKAN: Operator diizinkan melakukan GET (Melihat data SDM) agar sistem tahu jabatan spesifik mereka
    if request.method == 'GET':
        if role not in ['wh_supervisor', 'wh_operator', 'admin']: return jsonify({"error": "Unauthorized"}), 401
        
        # Admin rarely gets SDM via this endpoint (they use admin/data), but just in case:
        if role == 'admin':
            emps = Employee.query.all()
        else:
            emps = Employee.query.filter_by(warehouse_location=loc).all()
        return jsonify([{"id": e.id, "name": e.name, "role": e.role, "status": e.status, "phone": e.phone, "warehouse_location": e.warehouse_location} for e in emps])
    
    # POST (Tambah/Edit) untuk Supervisor dan Admin
    if request.method == 'POST':
        if role not in ['wh_supervisor', 'admin']: return jsonify({"error": "Unauthorized"}), 401
        data = request.get_json()
        
        # Tentukan lokasi (Admin bisa set lokasi dari payload, Supervisor terikat lokasinya)
        target_loc = data.get('location', loc) if role == 'admin' else loc
        
        if data.get('id'):
            emp = Employee.query.get(data['id'])
            if emp:
                if role == 'admin' or emp.warehouse_location == loc:
                    emp.name, emp.role, emp.status, emp.phone = data['name'], data['role'], data['status'], data['phone']
                    if role == 'admin' and data.get('location'):
                        emp.warehouse_location = data['location']
        else:
            new_emp = Employee(warehouse_location=target_loc, name=data['name'], role=data['role'], status=data['status'], phone=data['phone'])
            db.session.add(new_emp)
        db.session.commit()
        return jsonify({"success": True})

@warehouse_bp.route('/api/warehouse/sdm/<int:emp_id>', methods=['DELETE'])
def delete_sdm(emp_id):
    role = session.get('role')
    if role not in ['wh_supervisor', 'admin']: return jsonify({"error": "Unauthorized"}), 401
    emp = Employee.query.get(emp_id)
    if emp:
        if role == 'admin' or emp.warehouse_location == session.get('location'):
            db.session.delete(emp)
            db.session.commit()
            return jsonify({"success": True})
    return jsonify({"success": False})

@warehouse_bp.route('/api/warehouse/reports', methods=['GET'])
def warehouse_reports():
    role = session.get('role')
    if role not in ['wh_supervisor', 'admin']: return jsonify({"error": "Unauthorized"}), 401
    
    loc = session.get('location')
    from models import InboundTask, Order
    import datetime
    import calendar
    
    month_str = request.args.get('month')
    if month_str:
        try:
            year, month = map(int, month_str.split('-'))
        except:
            now = datetime.datetime.now()
            year, month = now.year, now.month
    else:
        now = datetime.datetime.now()
        year, month = now.year, now.month
        
    start_date = datetime.datetime(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = datetime.datetime(year, month, last_day, 23, 59, 59)
    
    inbound_tasks = InboundTask.query.filter_by(warehouse_location=loc).filter(
        InboundTask.created_at >= start_date, 
        InboundTask.created_at <= end_date
    ).order_by(InboundTask.created_at.desc()).all()
    
    outbound_orders = Order.query.filter(
        Order.warehouse_location == loc, 
        Order.status.in_(['Serahkan ke Jasa Kirim', 'Selesai'])
    ).filter(
        Order.created_at >= start_date, 
        Order.created_at <= end_date
    ).order_by(Order.created_at.desc()).all()
    
    inbound_data = []
    for t in inbound_tasks:
        inbound_data.append({
            "id": t.id,
            "date": t.created_at.strftime('%d %b %Y %H:%M'),
            "product": t.product_name,
            "qty": t.qty_kg,
            "operator": t.operator_name,
            "status": t.status
        })
        
    outbound_data = []
    for o in outbound_orders:
        items = [{"product": i.product_name, "qty": i.qty_kg} for i in o.items]
        outbound_data.append({
            "id": o.id,
            "date": o.created_at.strftime('%d %b %Y %H:%M'),
            "customer": o.customer.name if o.customer else "Unknown",
            "items": items,
            "status": o.status
        })
        
    return jsonify({"success": True, "inbound": inbound_data, "outbound": outbound_data})