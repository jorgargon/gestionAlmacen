"""
Database Migration Script - Add Unit Conversion Fields
Adds storage_unit, consumption_unit, and density fields to Product table
"""

from app import create_app
from models import db

def migrate():
    app = create_app()
    
    with app.app_context():
        # Add columns using raw SQL since we can't use Alembic
        with db.engine.connect() as conn:
            # Check if columns already exist
            result = conn.execute(db.text("PRAGMA table_info(products)"))
            columns = [row[1] for row in result]
            
            if 'storage_unit' not in columns:
                print("Adding storage_unit column...")
                conn.execute(db.text("ALTER TABLE products ADD COLUMN storage_unit VARCHAR(20)"))
                conn.commit()
            
            if 'consumption_unit' not in columns:
                print("Adding consumption_unit column...")
                conn.execute(db.text("ALTER TABLE products ADD COLUMN consumption_unit VARCHAR(20)"))
                conn.commit()
            
            if 'density' not in columns:
                print("Adding density column...")
                conn.execute(db.text("ALTER TABLE products ADD COLUMN density FLOAT"))
                conn.commit()
        
        print("✅ Migration completed successfully!")
        print("\nNote: Existing products will need to be updated with storage_unit, consumption_unit, and density values")

if __name__ == '__main__':
    migrate()
