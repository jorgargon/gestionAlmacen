#!/usr/bin/env python
"""
Demo data seed script for production deployment
Creates sample data for demonstration purposes
"""
from models import (db, Product, ProductType, Lot, Customer, Location, LotLocation,
                    ProductionOrder, ProductionOrderStatus, ProductionOrderMaterial,
                    ProductionOrderFinishedProduct, StockMovement, MovementType)
from datetime import date, timedelta
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
    locations = [
        Location(code='A1', name='Estantería A - Nivel 1', is_available=True),
        Location(code='A2', name='Estantería A - Nivel 2', is_available=True),
        Location(code='B1', name='Estantería B - Nivel 1', is_available=True),
        Location(code='B2', name='Estantería B - Nivel 2', is_available=True),
        Location(code='CUARENTENA', name='Zona Cuarentena', is_available=False),
        Location(code='PRODUCCION', name='Zona Producción', is_available=True),
    ]
    db.session.add_all(locations)
    db.session.flush()
    
    loc_a1, loc_a2, loc_b1, loc_b2, loc_cuarentena, loc_produccion = locations
    
    # ============ PRODUCTS ============
    print("  - Creating products...")
    
    # Raw Materials
    agua = Product(
        code='MP-001',
        name='Agua destilada',
        type=ProductType.RAW_MATERIAL,
        description='Agua destilada para uso cosmético',
        min_stock=100.0,
        storage_unit='l',
        consumption_unit='l'
    )
    glicerina = Product(
        code='MP-002',
        name='Glicerina vegetal',
        type=ProductType.RAW_MATERIAL,
        description='Glicerina vegetal 99.5%',
        min_stock=50.0,
        storage_unit='kg',
        consumption_unit='g'
    )
    aceite_lavanda = Product(
        code='MP-003',
        name='Aceite esencial de lavanda',
        type=ProductType.RAW_MATERIAL,
        description='Aceite esencial de lavanda 100% puro',
        min_stock=5.0,
        storage_unit='l',
        consumption_unit='l'
    )
    aloe_vera = Product(
        code='MP-004',
        name='Extracto de Aloe Vera',
        type=ProductType.RAW_MATERIAL,
        description='Extracto concentrado de aloe vera',
        min_stock=20.0,
        storage_unit='kg',
        consumption_unit='g'
    )
    
    # Packaging
    tarro_50 = Product(
        code='ENV-001',
        name='Tarro cristal 50ml',
        type=ProductType.PACKAGING,
        description='Tarro de vidrio transparente 50ml con tapa',
        min_stock=500.0,
        storage_unit='ud',
        consumption_unit='ud'
    )
    tarro_100 = Product(
        code='ENV-002',
        name='Tarro cristal 100ml',
        type=ProductType.PACKAGING,
        description='Tarro de vidrio transparente 100ml con tapa',
        min_stock=300.0,
        storage_unit='ud',
        consumption_unit='ud'
    )
    etiqueta_crema = Product(
        code='ENV-003',
        name='Etiqueta Crema Hidratante',
        type=ProductType.PACKAGING,
        description='Etiqueta adhesiva para crema hidratante',
        min_stock=500.0,
        storage_unit='ud',
        consumption_unit='ud'
    )
    caja_individual = Product(
        code='ENV-004',
        name='Caja individual',
        type=ProductType.PACKAGING,
        description='Caja de cartón para envase individual',
        min_stock=400.0,
        storage_unit='ud',
        consumption_unit='ud'
    )
    
    # Finished Products
    crema_hidratante = Product(
        code='PA-001',
        name='Crema Hidratante Lavanda 50ml',
        type=ProductType.FINISHED_PRODUCT,
        description='Crema hidratante facial con aceite de lavanda',
        min_stock=50.0,
        storage_unit='ud',
        consumption_unit='ud'
    )
    gel_aloe = Product(
        code='PA-002',
        name='Gel Aloe Vera 100ml',
        type=ProductType.FINISHED_PRODUCT,
        description='Gel calmante de aloe vera',
        min_stock=30.0,
        storage_unit='ud',
        consumption_unit='ud'
    )
    
    all_products = [agua, glicerina, aceite_lavanda, aloe_vera, 
                    tarro_50, tarro_100, etiqueta_crema, caja_individual,
                    crema_hidratante, gel_aloe]
    db.session.add_all(all_products)
    db.session.flush()
    
    # ============ LOTS ============
    print("  - Creating lots...")
    today = date.today()
    
    # Raw material lots
    lot_agua = Lot(
        product_id=agua.id,
        lot_number='AG-2024-001',
        quantity=500.0,
        unit='l',
        supplier='Aquaservice S.L.',
        expiration_date=today + timedelta(days=365),
        reception_date=today - timedelta(days=30),
        notes='Lote inicial de agua destilada'
    )
    lot_glicerina = Lot(
        product_id=glicerina.id,
        lot_number='GLI-2024-001',
        quantity=80.0,
        unit='kg',
        supplier='QuimiFarma S.A.',
        expiration_date=today + timedelta(days=545),
        reception_date=today - timedelta(days=15)
    )
    lot_aceite = Lot(
        product_id=aceite_lavanda.id,
        lot_number='LAV-2024-001',
        quantity=10.0,
        unit='l',
        supplier='Esencias Naturales',
        expiration_date=today + timedelta(days=730),
        reception_date=today - timedelta(days=10)
    )
    lot_aloe = Lot(
        product_id=aloe_vera.id,
        lot_number='ALO-2024-001',
        quantity=45.0,
        unit='kg',
        supplier='BioExtractos',
        expiration_date=today + timedelta(days=180),
        reception_date=today - timedelta(days=20)
    )
    
    # Packaging lots
    lot_tarro_50 = Lot(
        product_id=tarro_50.id,
        lot_number='T50-2024-001',
        quantity=1200.0,
        unit='ud',
        supplier='Vidriería Industrial',
        reception_date=today - timedelta(days=45)
    )
    lot_tarro_100 = Lot(
        product_id=tarro_100.id,
        lot_number='T100-2024-001',
        quantity=600.0,
        unit='ud',
        supplier='Vidriería Industrial',
        reception_date=today - timedelta(days=45)
    )
    lot_etiqueta = Lot(
        product_id=etiqueta_crema.id,
        lot_number='ETQ-2024-001',
        quantity=2000.0,
        unit='ud',
        supplier='ImprentaRápida',
        reception_date=today - timedelta(days=60)
    )
    lot_caja = Lot(
        product_id=caja_individual.id,
        lot_number='CAJ-2024-001',
        quantity=1500.0,
        unit='ud',
        supplier='Embalajes BCN',
        reception_date=today - timedelta(days=35)
    )
    
    # Finished product lot (from previous production)
    lot_crema = Lot(
        product_id=crema_hidratante.id,
        lot_number='CR-2024-001',
        quantity=120.0,
        unit='ud',
        expiration_date=today + timedelta(days=365),
        reception_date=today - timedelta(days=5),
        notes='Lote producido internamente'
    )
    
    all_lots = [lot_agua, lot_glicerina, lot_aceite, lot_aloe,
                lot_tarro_50, lot_tarro_100, lot_etiqueta, lot_caja, lot_crema]
    db.session.add_all(all_lots)
    db.session.flush()
    
    # ============ LOT LOCATIONS ============
    print("  - Assigning lot locations...")
    lot_locations = [
        LotLocation(lot_id=lot_agua.id, location_id=loc_a1.id, quantity=500.0),
        LotLocation(lot_id=lot_glicerina.id, location_id=loc_a1.id, quantity=80.0),
        LotLocation(lot_id=lot_aceite.id, location_id=loc_a2.id, quantity=10.0),
        LotLocation(lot_id=lot_aloe.id, location_id=loc_a2.id, quantity=45.0),
        LotLocation(lot_id=lot_tarro_50.id, location_id=loc_b1.id, quantity=1200.0),
        LotLocation(lot_id=lot_tarro_100.id, location_id=loc_b1.id, quantity=600.0),
        LotLocation(lot_id=lot_etiqueta.id, location_id=loc_b2.id, quantity=2000.0),
        LotLocation(lot_id=lot_caja.id, location_id=loc_b2.id, quantity=1500.0),
        LotLocation(lot_id=lot_crema.id, location_id=loc_b2.id, quantity=120.0),
    ]
    db.session.add_all(lot_locations)
    
    # ============ CUSTOMERS ============
    print("  - Creating customers...")
    customers = [
        Customer(
            code='CLI-001',
            name='Farmacia Central',
            email='contacto@farmaciacentral.es',
            phone='+34 932 123 456',
            address='Calle Mayor 25, 08001 Barcelona'
        ),
        Customer(
            code='CLI-002',
            name='Perfumería Elegance',
            email='pedidos@elegance.com',
            phone='+34 934 567 890',
            address='Paseo de Gracia 78, 08008 Barcelona'
        ),
        Customer(
            code='CLI-003',
            name='Spa Wellness Resort',
            email='compras@wellnessresort.es',
            phone='+34 935 111 222',
            address='Av. Diagonal 450, 08036 Barcelona'
        ),
        Customer(
            code='CLI-004',
            name='Herboristería Natural',
            email='info@herbonatural.com',
            phone='+34 936 333 444',
            address='Rambla Catalunya 55, 08007 Barcelona'
        ),
    ]
    db.session.add_all(customers)
    
    # ============ COMMIT ============
    db.session.commit()
    
    print("✓ Demo data seeded successfully!")
    print(f"  - {Location.query.count()} locations")
    print(f"  - {Product.query.count()} products")
    print(f"  - {Lot.query.count()} lots")
    print(f"  - {Customer.query.count()} customers")
    
    return True


if __name__ == '__main__':
    from app import create_app
    app = create_app('development')
    with app.app_context():
        seed_demo_data()
