"""WSGI entry point for production deployment"""
import os
from app import create_app, db

# Create application instance for production
app = create_app(os.getenv('FLASK_ENV', 'production'))

# Initialize database on startup
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run()
