import pytest
from app import app, db
from models import User, Inventory, Order
from routes.utils import validate_order_transition, check_warehouse_capacity, is_authorized_for_location

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()

# --- 1. TES KEAMANAN LOKASI ---
def test_location_security(client):
    """Tes: User Bekasi tidak boleh akses Jakarta"""
    user_bekasi = {'name': 'Budi', 'location': 'Bekasi', 'role': 'wh_operator'}
    
    # Harus True jika akses Bekasi
    assert is_authorized_for_location(user_bekasi, "Bekasi") is True
    # Harus False jika akses Jakarta
    assert is_authorized_for_location(user_bekasi, "Jakarta Utara") is False

# --- 2. TES VALIDASI STATUS ORDER ---
def test_order_status_flow(client):
    """Tes: Alur status harus urut (Menunggu -> Diproses -> Siap -> Selesai)"""
    
    # Valid: Menunggu ke Diproses
    assert validate_order_transition("Menunggu Alokasi", "Diproses") is True
    # Valid: Siap Dikirim ke Selesai
    assert validate_order_transition("Siap Dikirim", "Selesai") is True
    
    # ILLEGAL: Menunggu langsung ke Selesai (Loncat)
    assert validate_order_transition("Menunggu Alokasi", "Selesai") is False
    # ILLEGAL: Mundur status (Selesai ke Diproses)
    assert validate_order_transition("Selesai", "Diproses") is False

# --- 3. TES KAPASITAS GUDANG ---
def test_warehouse_capacity_limit(client):
    """Tes: Tidak boleh melebihi 1600kg per zona"""
    with app.app_context():
        loc = "Bekasi"
        prod = "Arabika Gayo Specialty"
        
        # Isi stok awal 1000kg
        inv = Inventory(warehouse_location=loc, product_name=prod, stock_kg=1000, zone="A", rack="1")
        db.session.add(inv)
        db.session.commit()
        
        # Coba tambah 500kg (Total 1500 < 1600) -> Harus BOLEH
        assert check_warehouse_capacity(loc, prod, 500) is True
        
        # Coba tambah 700kg (Total 1700 > 1600) -> Harus DITOLAK
        assert check_warehouse_capacity(loc, prod, 700) is False
