#!/usr/bin/env python
"""
Database initialization script
Creates tables and optionally populates with sample data
"""
from app import create_app
from models import (db, Product, ProductType, Lot, Customer, ProductionOrder, 
                    ProductionOrderStatus, ProductionOrderMaterial)
from datetime import date, timedelta
import sys


def create_sample_data():
    """Create sample data for testing"""
    print("Creando datos de ejemplo...")
    
    # Create products
    print("- Creando productos...")
    agua = Product(
        code='MP-001',
        name='Agua destilada',
        type=ProductType.RAW_MATERIAL,
        description='Agua destilada para uso cosmético',
        min_stock=100.0
    )
    
    glicerina = Product(
        code='MP-002',
        name='Glicerina',
        type=ProductType.RAW_MATERIAL,
        description='Glicerina vegetal',
        min_stock=50.0
    )
    
    aceite = Product(
        code='MP-003',
        name='Aceite esencial',
        type=ProductType.RAW_MATERIAL,
        description='Aceite esencial de lavanda',
        min_stock=5.0
    )
    
    tarro = Product(
        code='ENV-001',
        name='Tarro 50ml',
        type=ProductType.PACKAGING,
        description='Tarro de vidrio 50ml',
        min_stock=500.0
    )
    
    etiqueta = Product(
        code='ENV-002',
        name='Etiqueta',
        type=ProductType.PACKAGING,
        description='Etiqueta adhesiva para tarros',
        min_stock=500.0
    )
    
    crema = Product(
        code='PA-001',
        name='Crema Hidratante 50ml',
        type=ProductType.FINISHED_PRODUCT,
        description='Crema hidratante facial 50ml',
        min_stock=50.0
    )
    
    db.session.add_all([agua, glicerina, aceite, tarro, etiqueta, crema])
    db.session.flush()
    
    # Create customers
    print("- Creando clientes...")
    farmacia = Customer(
        code='CLI-001',
        name='Farmacia Central',
        email='farmacia@example.com',
        phone='+34 900 123 456',
        address='Calle Principal 123, Barcelona'
    )
    
    perfumeria = Customer(
        code='CLI-002',
        name='Perfumería Lujo',
        email='perfumeria@example.com',
        phone='+34 900 123 457',
        address='Avenida Diagonal 456, Barcelona'
    )
    
    spa = Customer(
        code='CLI-003',
        name='Spa Wellness',
        email='spa@example.com',
        phone='+34 900 123 458',
        address='Paseo de Gracia 789, Barcelona'
    )
    
    db.session.add_all([farmacia, perfumeria, spa])
    db.session.commit()
    
    print("✓ Datos de ejemplo creados correctamente")
    print(f"  - {Product.query.count()} productos")
    print(f"  - {Customer.query.count()} clientes")


def main():
    """Main function"""
    app = create_app('development')
    
    with app.app_context():
        print("Inicializando base de datos...")
        
        # Drop all tables if they exist (optional, for clean start)
        if len(sys.argv) > 1 and sys.argv[1] == '--reset':
            print("¡ADVERTENCIA! Eliminando todas las tablas existentes...")
            db.drop_all()
        
        # Create all tables
        db.create_all()
        print("✓ Tablas creadas correctamente")
        
        # Ask if user wants sample data
        if len(sys.argv) > 1 and sys.argv[1] == '--sample':
            create_sample_data()
        else:
            print("\nPara crear datos de ejemplo, ejecute:")
            print("  python init_db.py --sample")
            print("\nPara resetear la base de datos:")
            print("  python init_db.py --reset")
        
        print("\n✓ Base de datos inicializada correctamente")


if __name__ == '__main__':
    main()
