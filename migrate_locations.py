"""
Database Migration Script - Add Locations System
Creates the locations and lot_locations tables, inserts default locations,
and migrates existing stock to appropriate locations.
"""

from app import create_app
from models import db, Location, LotLocation, Lot


def migrate():
    print("Starting migration: Adding Locations System...")
    
    app = create_app()
    
    with app.app_context():
        # Create all tables (this will only create new ones)
        db.create_all()
        print("✅ Tables created: locations, lot_locations")
        
        # Insert default locations if they don't exist
        default_locations = [
            {'code': 'REC', 'name': 'Recepción', 'is_available': False},
            {'code': 'LIB', 'name': 'Liberado', 'is_available': True},
            {'code': 'DEV', 'name': 'Devoluciones', 'is_available': False},
            {'code': 'NC', 'name': 'No Conforme', 'is_available': False},
        ]
        
        locations_created = 0
        for loc_data in default_locations:
            if not Location.query.filter_by(code=loc_data['code']).first():
                loc = Location(**loc_data)
                db.session.add(loc)
                locations_created += 1
                print(f"   Creada ubicación: {loc_data['code']} - {loc_data['name']}")
        
        db.session.commit()
        print(f"✅ {locations_created} ubicaciones predefinidas creadas")
        
        # Migrate existing stock to LIB (or NC if blocked)
        lib_location = Location.query.filter_by(code='LIB').first()
        nc_location = Location.query.filter_by(code='NC').first()
        
        if not lib_location:
            print("❌ Error: No se encontró ubicación LIB")
            return
        
        # Get all lots with stock
        lots_with_stock = Lot.query.filter(Lot.current_quantity > 0).all()
        
        lots_migrated = 0
        for lot in lots_with_stock:
            # Check if already has location assignments
            existing = LotLocation.query.filter_by(lot_id=lot.id).first()
            if existing:
                continue  # Already migrated
            
            # Determine location based on blocked status
            if lot.blocked and nc_location:
                target_location = nc_location
            else:
                target_location = lib_location
            
            lot_loc = LotLocation(
                lot_id=lot.id,
                location_id=target_location.id,
                quantity=lot.current_quantity
            )
            db.session.add(lot_loc)
            lots_migrated += 1
        
        db.session.commit()
        print(f"✅ {lots_migrated} lotes migrados a ubicaciones")
        print("Migration completed successfully!")


if __name__ == '__main__':
    migrate()
