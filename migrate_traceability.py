from app import create_app, db
from sqlalchemy import text
import sqlite3
import os

def migrate():
    print("Starting migration: Adding traceability fields...")
    
    app = create_app()
    
    with app.app_context():
        # Get database path
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        if db_uri.startswith('sqlite:///'):
            db_path = db_uri.replace('sqlite:///', '')
            # Handle absolute/relative paths
            if not os.path.isabs(db_path):
                db_path = os.path.join(app.instance_path, db_path.replace('instance/', ''))
        else:
            print("Migration only supports SQLite for now")
            return

        print(f"Database path: {db_path}")
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check if column already exists
            cursor.execute("PRAGMA table_info(production_order_materials)")
            columns = [info[1] for info in cursor.fetchall()]
            
            if 'related_finished_product_id' not in columns:
                print("Adding related_finished_product_id column...")
                cursor.execute("ALTER TABLE production_order_materials ADD COLUMN related_finished_product_id INTEGER REFERENCES production_order_finished_products(id)")
                print("Column added successfully.")
            else:
                print("Column related_finished_product_id already exists.")
            
            conn.commit()
            conn.close()
            print("Migration completed successfully.")
            
        except Exception as e:
            print(f"Error during migration: {str(e)}")

if __name__ == '__main__':
    migrate()
