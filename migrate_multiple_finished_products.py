"""
Migration script to add support for multiple finished products per production order.

This script:
1. Creates the new production_order_finished_products table
2. Migrates existing production orders to the new structure
3. Keeps old columns temporarily for backwards compatibility
"""

from app import create_app, db
from models import ProductionOrder
from sqlalchemy import text

def migrate():
    app = create_app()
    
    with app.app_context():
        print("Starting migration: Multiple Finished Products per Production Order")
        
        # Step 1: Create new table
        print("\n[1/3] Creating production_order_finished_products table...")
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS production_order_finished_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                production_order_id INTEGER NOT NULL,
                finished_product_id INTEGER NOT NULL,
                lot_number VARCHAR(100) NOT NULL,
                target_quantity DECIMAL(10,2),
                produced_quantity DECIMAL(10,2),
                unit VARCHAR(20) NOT NULL DEFAULT 'ud',
                expiration_date DATE,
                lot_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (finished_product_id) REFERENCES products(id),
                FOREIGN KEY (lot_id) REFERENCES lots(id)
            )
        """))
        db.session.commit()
        print("✓ Table created successfully")
        
        # Step 2: Migrate existing data
        print("\n[2/3] Migrating existing production orders...")
        existing_orders = ProductionOrder.query.all()
        migrated_count = 0
        
        for order in existing_orders:
            # Check if already migrated
            existing = db.session.execute(text("""
                SELECT id FROM production_order_finished_products 
                WHERE production_order_id = :order_id
            """), {'order_id': order.id}).first()
            
            if not existing and hasattr(order, 'finished_product_id'):
                # Create corresponding record in new table
                db.session.execute(text("""
                    INSERT INTO production_order_finished_products (
                        production_order_id,
                        finished_product_id,
                        lot_number,
                        target_quantity,
                        produced_quantity,
                        unit,
                        expiration_date,
                        lot_id
                    ) VALUES (
                        :order_id,
                        :product_id,
                        :lot_number,
                        :target_qty,
                        :produced_qty,
                        :unit,
                        :exp_date,
                        (SELECT id FROM lots WHERE product_id = :product_id AND lot_number = :lot_number LIMIT 1)
                    )
                """), {
                    'order_id': order.id,
                    'product_id': order.finished_product_id,
                    'lot_number': order.finished_lot_number,
                    'target_qty': order.target_quantity,
                    'produced_qty': order.produced_quantity,
                    'unit': order.unit,
                    'exp_date': order.expiration_date
                })
                migrated_count += 1
        
        db.session.commit()
        print(f"✓ Migrated {migrated_count} existing orders")
        
        print("\n[3/3] Migration completed successfully!")
        print("\nNext steps:")
        print("  1. Restart the application to load the new model")
        print("  2. The old columns (finished_product_id, etc.) will remain for compatibility")
        print("  3. New orders will use the new multi-product structure")

if __name__ == '__main__':
    migrate()
