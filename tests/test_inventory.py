import pytest
from app import app, db
from models import Inventory, Order, OrderItem
from datetime import datetime, timedelta

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()

def test_fifo_deduction_logic(client):
    """
    Skenario:
    1. Ada 2 batch Arabika Gayo:
       - Batch A: 100kg (Masuk 1 April) -> HARUS DIAMBIL DULU
       - Batch B: 100kg (Masuk 10 April)
    2. Ada order 150kg.
    3. Hasil akhir harusnya:
       - Batch A: Habis (0kg)
       - Batch B: Sisa 50kg
    """
    with app.app_context():
        # Setup Data
        loc = "Bekasi"
        prod = "Arabika Gayo Specialty"
        
        batch_a = Inventory(warehouse_location=loc, product_name=prod, stock_kg=100, 
                            inbound_date=datetime(2026, 4, 1), zone="A", rack="1")
        batch_b = Inventory(warehouse_location=loc, product_name=prod, stock_kg=100, 
                            inbound_date=datetime(2026, 4, 10), zone="A", rack="2")
        db.session.add(batch_a)
        db.session.add(batch_b)
        db.session.commit()

        # Eksekusi Fungsi (Yang akan kita buat)
        from routes.utils import deduct_stock_fifo
        success, message = deduct_stock_fifo(loc, prod, 150)

        # Verifikasi
        assert success is True
        
        # Cek sisa stok di DB
        updated_a = Inventory.query.get(batch_a.id)
        updated_b = Inventory.query.get(batch_b.id)
        
        # Batch A harusnya dihapus atau jadi 0
        assert updated_a is None or updated_a.stock_kg == 0
        # Batch B harusnya sisa 50
        assert updated_b.stock_kg == 50
