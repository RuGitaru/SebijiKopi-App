# File: app.py
from flask import Flask, render_template
from models import db

# Mengimpor bagian otak server yang sudah kita pecah tadi
from routes.auth import auth_bp
from routes.customer import customer_bp
from routes.admin import admin_bp
from routes.warehouse import warehouse_bp
from routes.ai import ai_bp
from routes.profile import profile_bp

app = Flask(__name__)
app.secret_key = "sebiji_kopi_super_secure_key"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sebiji_kopi_v2.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Daftarkan semua bagian server ke aplikasi utama
app.register_blueprint(auth_bp)
app.register_blueprint(customer_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(warehouse_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(profile_bp)

# Rute khusus untuk menampilkan halaman HTML
@app.route('/')
def index(): 
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)