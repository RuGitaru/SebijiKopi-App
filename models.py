# File: models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False) 
    role = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(100), nullable=True)
    location = db.Column(db.String(50), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    email = db.Column(db.String(120), nullable=True)
    orders = db.relationship('Order', backref='customer', lazy=True)

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class Inventory(db.Model):
    __tablename__ = 'inventories'
    id = db.Column(db.Integer, primary_key=True)
    warehouse_location = db.Column(db.String(50), nullable=False)
    product_name = db.Column(db.String(100), nullable=False)
    zone = db.Column(db.String(50), nullable=False) 
    rack = db.Column(db.String(20), nullable=False) 
    stock_kg = db.Column(db.Float, default=0.0)
    inbound_date = db.Column(db.DateTime, default=datetime.utcnow)

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    warehouse_location = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(50), default='Menunggu Alokasi')
    
    # FITUR BARU: Kolom Penugasan Operator
    assigned_operator = db.Column(db.String(100), nullable=True)
    
    expedition = db.Column(db.String(50), nullable=True)
    awb_number = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_name = db.Column(db.String(100), nullable=False)
    qty_kg = db.Column(db.Float, nullable=False)

class Employee(db.Model):
    __tablename__ = 'employees'
    id = db.Column(db.Integer, primary_key=True)
    warehouse_location = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='Aktif')
    phone = db.Column(db.String(20), nullable=True)

class InboundTask(db.Model):
    __tablename__ = 'inbound_tasks'
    id = db.Column(db.Integer, primary_key=True)
    warehouse_location = db.Column(db.String(50), nullable=False)
    product_name = db.Column(db.String(100), nullable=False)
    qty_kg = db.Column(db.Float, nullable=False)
    operator_name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default='Menunggu Bongkar Muat')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)