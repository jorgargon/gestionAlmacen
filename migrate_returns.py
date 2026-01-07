"""
Database Migration Script - Add Returns Tables
Creates the returns and return_details tables for the returns module
"""

from app import create_app
from models import db


def migrate():
    print("Starting migration: Adding returns tables...")
    
    app = create_app()
    
    with app.app_context():
        # Create all tables (this will only create new ones)
        db.create_all()
        print("✅ Returns tables created successfully!")
        print("Tables created: returns, return_details")


if __name__ == '__main__':
    migrate()
