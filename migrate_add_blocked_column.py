from app import create_app, db
from sqlalchemy import text

app = create_app()

def migrate():
    with app.app_context():
        try:
            # Add blocked column to lots table
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE lots ADD COLUMN blocked BOOLEAN DEFAULT 0 NOT NULL"))
                conn.commit()
            print("Successfully added blocked column to lots table")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("Column blocked already exists")
            else:
                print(f"Error adding column: {e}")

if __name__ == '__main__':
    migrate()
