import sqlite3

def run():
    conn = sqlite3.connect('instance/sebiji_kopi_v2.db')
    c = conn.cursor()
    
    mapping = {
        'Arabica Mandheling': 'Arabika Gayo Specialty',
        'Robusta Gayo': 'Robusta Dampit Premium',
        'Robusta Dampit': 'Robusta Dampit Premium',
        'Liberica Temanggung': 'Liberika Jambi Eksotik',
        'House Blend Espresso': 'Excelsa House Blend'
    }
    
    for old_name, new_name in mapping.items():
        c.execute("UPDATE order_items SET product_name = ? WHERE product_name = ?", (new_name, old_name))
        
    conn.commit()
    print("Database data merged successfully.")

if __name__ == '__main__':
    run()
