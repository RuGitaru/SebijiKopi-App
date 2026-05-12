# File: routes/profile.py
from flask import Blueprint, request, jsonify, session
from models import db, User, ProfileChangeRequest
from datetime import datetime

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/api/profile/request', methods=['POST'])
def submit_change_request():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    user = User.query.get(session['user_id'])
    
    if not user:
        return jsonify({"success": False, "message": "User tidak ditemukan."}), 404

    # Peran yang butuh approval
    internal_roles = ['admin', 'wh_supervisor', 'wh_operator']
    
    if user.role not in internal_roles:
        # Jika bukan internal (customer), langsung update saja (seperti sebelumnya)
        user.name = data.get('name', user.name)
        user.email = data.get('email', user.email)
        user.phone = data.get('phone', user.phone)
        user.address = data.get('address', user.address)
        if data.get('password'):
            user.password = data['password']
        db.session.commit()
        return jsonify({"success": True, "message": "Profil berhasil diperbarui langsung."})

    # Jika internal, buat request untuk tiap field yang berubah
    fields_to_check = ['name', 'email', 'phone', 'address', 'password']
    requested_fields = []
    
    for field in fields_to_check:
        new_val = data.get(field)
        if new_val is not None:
            # Khusus password, jangan bandingkan dengan old_value plain text jika ada hashing 
            # (tapi di app ini sepertinya masih plain text sederhana)
            old_val = getattr(user, field)
            
            if field == 'password' and not new_val:
                continue
                
            if str(new_val) != str(old_val):
                # Buat request baru
                req = ProfileChangeRequest(
                    user_id=user.id,
                    field_name=field,
                    old_value=str(old_val) if field != 'password' else '********',
                    new_value=str(new_val),
                    status='Menunggu'
                )
                db.session.add(req)
                requested_fields.append(field)
                
    if requested_fields:
        db.session.commit()
        return jsonify({
            "success": True, 
            "message": f"Permintaan perubahan data ({', '.join(requested_fields)}) telah dikirim ke Admin untuk disetujui.",
            "requires_approval": True
        })
    else:
        return jsonify({"success": True, "message": "Tidak ada perubahan data."})

@profile_bp.route('/api/profile/my-requests', methods=['GET'])
def get_my_requests():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    requests = ProfileChangeRequest.query.filter_by(user_id=session['user_id']).order_by(ProfileChangeRequest.requested_at.desc()).all()
    
    return jsonify([{
        "id": r.id,
        "field": r.field_name,
        "old_value": r.old_value,
        "new_value": r.new_value if r.field_name != 'password' else '********',
        "status": r.status,
        "date": r.requested_at.strftime('%Y-%m-%d %H:%M')
    } for r in requests])
