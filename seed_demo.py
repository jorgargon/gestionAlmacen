#!/usr/bin/env python
"""
Demo data seed script - Contains actual data from local database
"""
from models import (db, Product, ProductType, Lot, Customer, Location, LotLocation)
from datetime import date
import os


def seed_demo_data():
    """Create demo data for the application"""
    
    # Check if data already exists
    if Product.query.first() is not None:
        print("Demo data already exists, skipping seed.")
        return False
    
    print("Seeding demo data...")
    
    # ============ LOCATIONS ============
    print("  - Creating locations...")
    loc_rec = Location(code='REC', name='Recepción', is_available=False, active=True)
    loc_lib = Location(code='LIB', name='Liberado', is_available=True, active=True)
    loc_dev = Location(code='DEV', name='Devoluciones', is_available=False, active=True)
    loc_nc = Location(code='NC', name='No Conforme', is_available=False, active=True)
    loc_fab = Location(code='FAB', name='Fabricación Pendiente', is_available=False, active=True)
    
    db.session.add_all([loc_rec, loc_lib, loc_dev, loc_nc, loc_fab])
    db.session.flush()
    
    # ============ PRODUCTS ============
    print("  - Creating products...")
    
    # Raw Materials (id=1,2,3,8)
    p1_agua = Product(code='MP-001', name='Agua destilada', type=ProductType.RAW_MATERIAL,
                      description='Agua destilada para uso cosmético', min_stock=100.0, 
                      storage_unit='l', consumption_unit='kg')
    p2_glicerina = Product(code='MP-002', name='Glicerina', type=ProductType.RAW_MATERIAL,
                           description='Glicerina vegetal', min_stock=50.0,
                           storage_unit='kg', consumption_unit='kg')
    p3_aceite = Product(code='MP-003', name='Aceite esencial', type=ProductType.RAW_MATERIAL,
                        description='Aceite esencial de lavanda', min_stock=5.0,
                        storage_unit='l', consumption_unit='kg')
    p8_dens = Product(code='MP-DENS-001', name='Materia Densa', type=ProductType.RAW_MATERIAL,
                      description='', min_stock=None, storage_unit='l', consumption_unit='kg')
    
    # Packaging (id=4,5,9)
    p4_tarro50 = Product(code='ENV-001', name='Tarro 50ml', type=ProductType.PACKAGING,
                         description='Tarro de vidrio 50ml', min_stock=500.0,
                         storage_unit='ud', consumption_unit='ud')
    p5_etiqueta = Product(code='ENV-002', name='Etiqueta', type=ProductType.PACKAGING,
                          description='Etiqueta adhesiva para tarros', min_stock=500.0,
                          storage_unit='ud', consumption_unit='ud')
    p9_tarro100 = Product(code='ENV-003', name='Tarro de 100ml', type=ProductType.PACKAGING,
                          description='', min_stock=1000.0, storage_unit='ud', consumption_unit='ud')
    
    # Finished Products (id=6,7)
    p6_crema50 = Product(code='PA-001', name='Crema Hidratante 50ml', type=ProductType.FINISHED_PRODUCT,
                         description='Crema hidratante facial 50ml', min_stock=50.0,
                         storage_unit='ud', consumption_unit='ud')
    p7_crema100 = Product(code='PA-002', name='Crema Hidratante 100ml', type=ProductType.FINISHED_PRODUCT,
                          description='', min_stock=30.0, storage_unit='ud', consumption_unit='ud')
    
    # Add in order to maintain IDs
    products = [p1_agua, p2_glicerina, p3_aceite, p4_tarro50, p5_etiqueta, 
                p6_crema50, p7_crema100, p8_dens, p9_tarro100]
    for p in products:
        db.session.add(p)
    db.session.flush()
    
    # ============ CUSTOMERS ============
    print("  - Creating customers...")
    customers = [
        Customer(code='CLI-001', name='Farmacia Central', email='farmacia@example.com',
                 phone='+34 900 123 456', address='Calle Principal 123, Barcelona'),
        Customer(code='CLI-002', name='Perfumería Lujo', email='perfumeria@example.com',
                 phone='+34 900 123 457', address='Avenida Diagonal 456, Barcelona'),
        Customer(code='CLI-003', name='Spa Wellness', email='spa@example.com',
                 phone='+34 900 123 458', address='Paseo de Gracia 789, Barcelona'),
        Customer(code='CLI-0004', name='Perfumería Comet', email=None, phone=None, address=None),
    ]
    db.session.add_all(customers)
    db.session.flush()
    
    # ============ LOTS ============
    print("  - Creating lots...")
    
    # Helper to create lots
    def create_lot(product_id, lot_number, mfg_date, exp_date, initial_qty, current_qty, unit, blocked=False):
        return Lot(
            product_id=product_id,
            lot_number=lot_number,
            manufacturing_date=date.fromisoformat(mfg_date),
            expiration_date=date.fromisoformat(exp_date) if exp_date else None,
            initial_quantity=initial_qty,
            current_quantity=current_qty,
            unit=unit,
            blocked=blocked
        )
    
    lots_data = [
        # id, product_id, lot_number, mfg_date, exp_date, initial_qty, current_qty, unit, blocked
        (1, 3, 'L182634', '2024-12-12', '2028-12-12', 15.0, 1.5, 'l', False),
        (2, 1, '344322', '2025-10-16', '2029-12-24', 20.0, 0.0, 'l', False),
        (3, 6, '121225', '2025-12-12', '2026-02-01', 20.0, 5.0, 'Ud', False),
        (4, 3, 'L197288', '2025-12-12', '2026-05-04', 20.0, 15.94, 'l', False),
        (5, 1, '998899', '2025-12-01', '2027-12-01', 100.0, 60.0, 'l', False),
        (6, 6, '131225', '2025-12-13', '2027-12-13', 60.0, 3.0, 'ud', False),
        (7, 2, '11111', '2020-11-11', '2024-11-11', 23.0, 0.0, 'kg', False),
        (8, 2, '123321', '2025-11-09', '2025-11-08', 20.0, 20.0, 'kg', False),
        (9, 2, '123322', '2025-11-09', '2027-11-09', 23.0, 3.0, 'kg', False),
        (10, 8, 'L-DENS-001', '2025-12-19', '2027-12-19', 10.0, 8.0, 'l', False),
        (11, 6, '191225', '2025-12-19', '2027-12-19', 100.0, 100.0, 'ud', False),
        (12, 7, '191225', '2025-12-19', '2027-12-19', 50.0, 50.0, 'ud', True),
        (13, 7, 'L-BASE-DENS', '2025-12-19', '2027-12-19', 10.0, 10.0, 'ud', False),
        (14, 4, 'L-TARRO-TRACE', '2025-12-19', None, 100.0, 0.0, 'ud', False),
        (15, 9, 'ENV1009988', '2025-11-15', None, 2000.0, 1800.0, 'ud', False),
        (16, 6, 'L-BASE-FINAL', '2025-12-19', '2027-12-19', 5.0, 5.0, 'ud', False),
        (17, 7, 'L-BASE-FINAL', '2025-12-19', '2027-12-19', 100.0, 100.0, 'ud', False),
        (18, 6, '191225PRUEBATRAZ', '2025-12-19', '2027-12-19', 95.0, 95.0, 'ud', False),
        (19, 7, '191225PRUEBATRAZ', '2025-12-19', '2027-12-19', 100.0, 100.0, 'ud', False),
        (20, 4, '191225', '2025-12-19', None, 2000.0, 2000.0, 'ud', False),
        (21, 2, 'L33201225', '2025-12-20', '2026-08-16', 1000.0, 1.0, 'kg', False),
        (22, 5, 'L99201225', '2025-12-20', None, 1000.0, 1000.0, 'ud', False),
        (23, 3, 'AE998100', '2025-12-21', '2027-12-12', 1.02, 1.02, 'l', False),
        (24, 1, '2059988', '2025-12-21', '2028-07-15', 100.0, 100.0, 'l', False),
        (25, 2, 'GLI3349001', '2025-12-21', '2026-03-12', 10.0, 10.0, 'kg', False),
        (26, 1, 'TEST-ERROR-CHECK', '2025-12-21', None, 100.0, 100.0, 'l', False),
        (27, 5, 'TEST-ENVASE-001', '2025-12-21', None, 500.0, 500.0, 'ud', False),
        (28, 5, '3344992', '2025-12-21', None, 250.0, 250.0, 'ud', False),
        (29, 3, 'L445999', '2025-12-21', '2027-09-09', 1000.0, 1000.0, 'l', False),
        (30, 2, 'L99763302', '2025-12-21', '2026-09-09', 50.0, 50.0, 'kg', False),
        (31, 2, 'L990033', '2025-12-21', '2029-09-09', 50.0, 50.0, 'kg', False),
        (32, 1, 'AG442232', '2025-12-22', '2027-12-22', 0.5, 0.5, 'l', False),
        (33, 3, 'AEP893345', '2025-12-22', '2026-02-28', 50.0, 50.0, 'l', False),
        (34, 4, 'POR4412993D', '2025-12-22', None, 300.0, 300.0, 'ud', False),
        (35, 3, '202512', '2025-12-23', '2025-12-23', 1.0, 1.0, 'l', False),
    ]
    
    lots = []
    for data in lots_data:
        _, prod_id, lot_num, mfg, exp, init_q, curr_q, unit, blocked = data
        lot = create_lot(prod_id, lot_num, mfg, exp, init_q, curr_q, unit, blocked)
        lots.append(lot)
        db.session.add(lot)
    db.session.flush()
    
    # ============ LOT LOCATIONS ============
    print("  - Creating lot locations...")
    
    # lot_id -> location_id -> quantity (using indexes from lots list, 0-based)
    # Location IDs: loc_rec=1, loc_lib=2, loc_dev=3, loc_nc=4, loc_fab=5
    lot_locations_data = [
        (0, 2, 1.5),      # L182634 -> LIB
        (3, 2, 15.94),    # L197288 -> LIB
        (4, 2, 60.0),     # 998899 -> LIB
        (7, 2, 20.0),     # 123321 -> LIB
        (8, 2, 3.0),      # 123322 -> LIB
        (9, 2, 8.0),      # L-DENS-001 -> LIB
        (10, 2, 100.0),   # 191225 (crema50) -> LIB
        (11, 4, 50.0),    # 191225 (crema100) -> NC (blocked)
        (12, 2, 10.0),    # L-BASE-DENS -> LIB
        (14, 2, 1800.0),  # ENV1009988 -> LIB
        (15, 2, 5.0),     # L-BASE-FINAL (crema50) -> LIB
        (16, 2, 100.0),   # L-BASE-FINAL (crema100) -> LIB
        (17, 2, 95.0),    # 191225PRUEBATRAZ (crema50) -> LIB
        (18, 2, 100.0),   # 191225PRUEBATRAZ (crema100) -> LIB
        (19, 2, 2000.0),  # 191225 (tarro50) -> LIB
        (20, 2, 1.0),     # L33201225 -> LIB
        (21, 2, 1000.0),  # L99201225 -> LIB
        (22, 2, 1.02),    # AE998100 -> LIB
        (23, 2, 100.0),   # 2059988 -> LIB
        (24, 2, 10.0),    # GLI3349001 -> LIB
        (25, 2, 100.0),   # TEST-ERROR-CHECK -> LIB
        (26, 2, 500.0),   # TEST-ENVASE-001 -> LIB
        (27, 2, 250.0),   # 3344992 -> LIB
        (28, 2, 1000.0),  # L445999 -> LIB
        (29, 2, 50.0),    # L99763302 -> LIB
        (30, 2, 50.0),    # L990033 -> LIB
        (31, 4, 0.5),     # AG442232 -> NC
        (32, 4, 25.0),    # AEP893345 -> NC (partial)
        (2, 3, 5.0),      # 121225 -> DEV
        (32, 2, 25.0),    # AEP893345 -> LIB (partial)
        (33, 1, 300.0),   # POR4412993D -> REC
        (34, 1, 0.0),     # 202512 -> REC
        (34, 2, 1.0),     # 202512 -> LIB
        (5, 3, 3.0),      # 131225 -> DEV
    ]
    
    for lot_idx, loc_id, qty in lot_locations_data:
        ll = LotLocation(lot_id=lots[lot_idx].id, location_id=loc_id, quantity=qty)
        db.session.add(ll)
    
    # ============ COMMIT ============
    db.session.commit()
    
    print("✓ Demo data seeded successfully!")
    print(f"  - {Location.query.count()} locations")
    print(f"  - {Product.query.count()} products")
    print(f"  - {Lot.query.count()} lots")
    print(f"  - {Customer.query.count()} customers")
    print(f"  - {LotLocation.query.count()} lot locations")
    
    return True


if __name__ == '__main__':
    from app import create_app
    app = create_app('development')
    with app.app_context():
        seed_demo_data()
