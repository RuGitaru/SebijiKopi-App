# File: routes/auth.py
from flask import Blueprint, request, jsonify, session
from models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username'], password=data['password']).first()
    if user:
        from models import Employee
        session.permanent = True
        session['user_id'] = user.id
        session['role'] = user.role
        session['location'] = user.location
        session['name'] = user.name
        
        # Ambil job_role spesifik dari tabel Employee (untuk wh_operator)
        job_role = ""
        emp = Employee.query.filter_by(name=user.name, warehouse_location=user.location).first()
        if emp:
            job_role = emp.role
        session['job_role'] = job_role

        return jsonify({
            "success": True, 
            "role": user.role, 
            "job_role": job_role,
            "name": user.name, 
            "location": user.location, 
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "address": user.address
        })
    return jsonify({"success": False, "message": "Username atau password salah!"}), 401

@auth_bp.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    
    # Cek apakah username sudah dipakai
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"success": False, "message": "Username sudah terdaftar! Pilih yang lain."})
    
    # Simpan user baru ke database
    new_user = User(
        username=data['username'], 
        password=data['password'], 
        role='customer', 
        name=data['name'], 
        address=data['address'], 
        phone=data['phone'],
        email=data.get('email', '') # Menyimpan email
    )
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"success": True})

@auth_bp.route('/api/session', methods=['GET'])
def api_session():
    print(f"DEBUG: Checking session. session={session}")
    if 'user_id' in session:
        from models import User, db
        user = db.session.get(User, session['user_id'])
        if user:
            print(f"DEBUG: Session found for user: {user.username}")
            return jsonify({
                "success": True,
                "role": user.role,
                "job_role": session.get('job_role', ''),
                "name": user.name,
                "location": user.location,
                "username": user.username,
                "email": user.email,
                "phone": user.phone,
                "address": user.address
            })
    print("DEBUG: No active session found.")
    return jsonify({"success": False}), 401

@auth_bp.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({"success": True})