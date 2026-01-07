"""
Migration script to add header fields to production_orders table
"""
import sqlite3
import os

# Database path
DB_PATH = 'instance/gestion_almacen.db'

def migrate():
    print("Starting migration: Adding header fields to production_orders")
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Database {DB_PATH} not found")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("\n[1/3] Adding base_product_name column...")
        cursor.execute('''
            ALTER TABLE production_orders 
            ADD COLUMN base_product_name VARCHAR(200)
        ''')
        print("✓ base_product_name added")
        
        print("\n[2/3] Adding base_lot_number column...")
        cursor.execute('''
            ALTER TABLE production_orders 
            ADD COLUMN base_lot_number VARCHAR(100)
        ''')
        print("✓ base_lot_number added")
        
        # Note: expiration_date already exists, just verify
        print("\n[3/3] Verifying expiration_date exists...")
        cursor.execute("PRAGMA table_info(production_orders)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'expiration_date' in columns:
            print("✓ expiration_date already exists")
        else:
            print("Adding expiration_date...")
            cursor.execute('''
                ALTER TABLE production_orders 
                ADD COLUMN expiration_date DATE
            ''')
            print("✓ expiration_date added")
        
        conn.commit()
        print("\n✓ Migration completed successfully!")
        print("\nNew header fields added:")
        print("  - base_product_name: General product name (e.g., 'Gel Hidroalcohólico')")
        print("  - base_lot_number: Base lot number shared by all products")
        print("  - expiration_date: Common expiration date for all products")
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
