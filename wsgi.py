"""WSGI entry point for production deployment"""
import os
from app import create_app, db

# Create application instance for production
app = create_app(os.getenv('FLASK_ENV', 'production'))

# Initialize database and seed demo data on startup
with app.app_context():
    db.create_all()
    
    # Seed demo data if enabled
    if os.getenv('SEED_DEMO_DATA', 'true').lower() == 'true':
        from seed_demo import seed_demo_data
        seed_demo_data()

if __name__ == '__main__':
    app.run()
