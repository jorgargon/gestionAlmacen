"""
Migration script to make legacy fields nullable in production_orders table
"""
import sqlite3
import os

# Database path
DB_PATH = 'instance/gestion_almacen.db'

def migrate():
    print("Starting migration: Making legacy fields nullable")
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Database {DB_PATH} not found")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # SQLite doesn't support ALTER COLUMN directly
        # We need to recreate the table
        
        print("\n[1/4] Creating new production_orders table with nullable fields...")
        cursor.execute('''
            CREATE TABLE production_orders_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number VARCHAR(100) NOT NULL UNIQUE,
                finished_product_id INTEGER,
                finished_lot_number VARCHAR(100),
                target_quantity FLOAT,
                produced_quantity FLOAT,
                unit VARCHAR(20),
                production_date DATE NOT NULL,
                expiration_date DATE,
                status VARCHAR(11) NOT NULL DEFAULT 'draft',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                closed_at DATETIME,
                FOREIGN KEY (finished_product_id) REFERENCES products(id)
            )
        ''')
        print("✓ New table created")
        
        print("\n[2/4] Copying data from old table...")
        cursor.execute('''
            INSERT INTO production_orders_new 
            SELECT * FROM production_orders
        ''')
        print("✓ Data copied")
        
        print("\n[3/4] Dropping old table...")
        cursor.execute('DROP TABLE production_orders')
        print("✓ Old table dropped")
        
        print("\n[4/4] Renaming new table...")
        cursor.execute('ALTER TABLE production_orders_new RENAME TO production_orders')
        print("✓ Table renamed")
        
        conn.commit()
        print("\n✓ Migration completed successfully!")
        print("\nLegacy fields (finished_product_id, finished_lot_number, target_quantity, unit) are now nullable.")
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
