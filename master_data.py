# =================================================================
# SECTION 1: INTERNAL MASTER DATA (Company-Owned & Controlled)
# =================================================================

# 1. WAREHOUSE LOCATIONS (Aset Lokasi Perusahaan)
# Format: {'Nama Lokasi': 'Kode Username'}
LOCATIONS = {
    'Bekasi': 'bks',
    'Jakarta Utara': 'jkt',
    'Cikarang': 'ckr'
}

# 2. PRODUCT MASTER (Definisi Produk Perusahaan)
PRODUCTS = ['Arabika Gayo Specialty', 'Robusta Dampit Premium', 'Liberika Jambi Eksotik', 'Excelsa House Blend']

# 3. WMS MAPPING (Aturan Penempatan Internal)
ZONES = {
    'Arabika Gayo Specialty': ('Zona A (Suhu Sejuk)', 'A'),
    'Robusta Dampit Premium': ('Zona B (Area Kering)', 'B'),
    'Liberika Jambi Eksotik': ('Zona C (Isolasi Aroma)', 'C'),
    'Excelsa House Blend': ('Zona D (Area Blending)', 'D')
}

# 4. WAREHOUSE CAPACITY (Batasan Operasional)
MAX_CAPACITY = 1600.0

# 5. STAFF POOLS (Internal Human Resources)
STAFF_POOLS = {
    'Bekasi': {
        'Supervisor': 'Budi Santoso',
        'Operators': ['Siti Aminah', 'Andi Pratama', 'Rina Yuliana', 'Deni Setiawan', 'Ahmad F'],
        'Roles': ['Operator Picking & Packing', 'Operator Picking & Packing', 'Operator Picking & Packing', 'Operator Inbound', 'Staf QC (Quality Control)']
    },
    'Jakarta Utara': {
        'Supervisor': 'Andi Silalahi',
        'Operators': ['Tono S', 'Rudi H', 'Maya S', 'Joko P', 'Fitri M'],
        'Roles': ['Operator Picking & Packing', 'Operator Picking & Packing', 'Operator Picking & Packing', 'Operator Inbound', 'Staf QC (Quality Control)']
    },
    'Cikarang': {
        'Supervisor': 'Hendra Wijaya',
        'Operators': ['Agus W', 'Lina K', 'Hadi S', 'Bambang G', 'Nina S'],
        'Roles': ['Operator Picking & Packing', 'Operator Picking & Packing', 'Operator Picking & Packing', 'Operator Inbound', 'Staf QC (Quality Control)']
    }
}

# =================================================================
# SECTION 2: EXTERNAL ENTITIES / PARTNERS (Customer-Owned Data)
# =================================================================
# Data ini bukan milik perusahaan sepenuhnya, melainkan representasi 
# entitas luar yang melakukan transaksi dengan sistem.

PARTNERS = [
    ('Kedai Kopi Senja', '08123456789', 'Jl. Sudirman No 10, Jakarta', 'kopi.senja@gmail.com'),
    ('Point Coffee Hub', '0822222222', 'Bekasi', 'point.coffee@gmail.com'),
    ('Janji Jiwa Group', '0833333333', 'Cikarang', 'janji.jiwa@gmail.com'),
    ('Starbucks Reserve', '0844444444', 'Jakarta', 'starbucks@gmail.com'),
    ('Fore Coffee', '0855555555', 'Tangerang', 'fore@gmail.com')
]

# =================================================================
# SECTION 3: SYSTEM ROLES
# =================================================================
ROLES = {
    'ADMIN': 'admin',
    'CUSTOMER': 'customer',
    'SUPERVISOR': 'wh_supervisor',
    'OPERATOR': 'wh_operator'
}
