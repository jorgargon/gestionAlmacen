from flask import Blueprint, request, jsonify
from models import (db, Shipment, ShipmentDetail, Customer, Lot, ProductType,
                    StockMovement, MovementType, Location, LotLocation)
from datetime import datetime
from sqlalchemy import or_

bp = Blueprint('shipments', __name__, url_prefix='/api/shipments')


@bp.route('', methods=['GET'])
def get_shipments():
    """Get all shipments with optional filters"""
    customer_id = request.args.get('customer_id', type=int)
    product_id = request.args.get('product_id', type=int)
    lot_number = request.args.get('lot_number')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    query = Shipment.query
    
    # Filter by customer
    if customer_id:
        query = query.filter_by(customer_id=customer_id)
    
    # Filter by date range
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
            query = query.filter(Shipment.shipment_date >= date_from_obj)
        except ValueError:
            return jsonify({'error': 'Formato de fecha desde inválido'}), 400
    
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
            query = query.filter(Shipment.shipment_date <= date_to_obj)
        except ValueError:
            return jsonify({'error': 'Formato de fecha hasta inválido'}), 400
    
    shipments = query.order_by(Shipment.shipment_date.desc()).all()
    
    # Filter by product or lot number (requires checking details)
    if product_id or lot_number:
        filtered_shipments = []
        for shipment in shipments:
            for detail in shipment.details:
                if product_id and detail.lot.product_id != product_id:
                    continue
                if lot_number and lot_number.lower() not in detail.lot.lot_number.lower():
                    continue
                filtered_shipments.append(shipment)
                break
        shipments = filtered_shipments
    
    return jsonify([s.to_dict(include_details=True) for s in shipments])


@bp.route('/<int:shipment_id>', methods=['GET'])
def get_shipment(shipment_id):
    """Get a single shipment with details"""
    shipment = Shipment.query.get_or_404(shipment_id)
    return jsonify(shipment.to_dict(include_details=True))


@bp.route('', methods=['POST'])
def create_shipment():
    """Create a new shipment with details - only ships from LIB location"""
    data = request.get_json()
    
    # Validate required fields (customer_id OR new_customer, not both required)
    required_fields = ['shipment_number', 'shipment_date', 'details']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    # Handle customer: either existing ID or create new
    customer = None
    if data.get('customer_id'):
        customer = Customer.query.get(data['customer_id'])
        if not customer:
            return jsonify({'error': 'Cliente no encontrado'}), 404
    elif data.get('new_customer'):
        # Create new customer on-the-fly
        new_customer_data = data['new_customer']
        if not new_customer_data.get('name'):
            return jsonify({'error': 'Para crear un cliente nuevo, se requiere el nombre'}), 400
        
        # Auto-generate customer code
        last_customer = Customer.query.filter(Customer.code.like('CLI-%')).order_by(Customer.id.desc()).first()
        if last_customer:
            try:
                last_num = int(last_customer.code.split('-')[1])
                new_code = f'CLI-{last_num + 1:04d}'
            except:
                new_code = f'CLI-{Customer.query.count() + 1:04d}'
        else:
            new_code = 'CLI-0001'
        
        customer = Customer(
            code=new_code,
            name=new_customer_data['name'],
            email=new_customer_data.get('email'),
            phone=new_customer_data.get('phone'),
            address=new_customer_data.get('address')
        )
        db.session.add(customer)
        db.session.flush()  # Get the ID
    else:
        return jsonify({'error': 'Debe seleccionar un cliente existente o crear uno nuevo'}), 400
    
    # Check if shipment number already exists
    if Shipment.query.filter_by(shipment_number=data['shipment_number']).first():
        return jsonify({'error': 'El número de albarán ya existe'}), 400
    
    if not data['details']:
        return jsonify({'error': 'Debe incluir al menos un detalle de envío'}), 400
    
    # Parse date
    try:
        shipment_date = datetime.strptime(data['shipment_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido (use YYYY-MM-DD)'}), 400
    
    # Get LIB location
    lib_location = Location.query.filter_by(code='LIB').first()
    if not lib_location:
        return jsonify({'error': 'Ubicación LIB no encontrada. Ejecute la migración.'}), 500
    
    try:
        # Validate all lots before creating shipment
        validated_details = []
        for detail_data in data['details']:
            if 'lot_id' not in detail_data or 'quantity' not in detail_data:
                return jsonify({'error': 'Cada detalle debe incluir lot_id y quantity'}), 400
            
            lot = Lot.query.get(detail_data['lot_id'])
            if not lot:
                return jsonify({'error': f'Lote {detail_data["lot_id"]} no encontrado'}), 404
            
            # Validate lot is available (not expired)
            if not lot.is_available:
                return jsonify({
                    'error': f'Lote {lot.lot_number} no está disponible (caducado o agotado)'
                }), 400
            
            # Validate lot is finished product
            if lot.product.type != ProductType.FINISHED_PRODUCT:
                return jsonify({
                    'error': f'Solo se pueden enviar productos acabados. Lote {lot.lot_number} es de tipo {lot.product.type.value}'
                }), 400
            
            # Check stock in LIB location
            lot_loc = LotLocation.query.filter_by(lot_id=lot.id, location_id=lib_location.id).first()
            available_in_lib = lot_loc.quantity if lot_loc else 0
            
            # Validate sufficient stock in LIB
            if available_in_lib < detail_data['quantity']:
                return jsonify({
                    'error': f'Stock insuficiente en Liberado para lote {lot.lot_number}. Disponible: {available_in_lib} {lot.unit}'
                }), 400
            
            validated_details.append({
                'lot': lot,
                'lot_loc': lot_loc,
                'quantity': detail_data['quantity'],
                'unit': detail_data.get('unit', lot.unit)
            })
        
        # Create shipment
        shipment = Shipment(
            customer_id=customer.id,
            shipment_number=data['shipment_number'],
            shipment_date=shipment_date,
            notes=data.get('notes')
        )
        db.session.add(shipment)
        db.session.flush()
        
        # Create details and movements
        for detail_info in validated_details:
            lot = detail_info['lot']
            lot_loc = detail_info['lot_loc']
            quantity = detail_info['quantity']
            
            # Create shipment detail
            detail = ShipmentDetail(
                shipment_id=shipment.id,
                lot_id=lot.id,
                quantity=quantity,
                unit=detail_info['unit']
            )
            db.session.add(detail)
            
            # Create exit movement from LIB
            movement = StockMovement(
                lot_id=lot.id,
                movement_type=MovementType.SHIPMENT,
                quantity=-quantity,  # Negative for exit
                reference_id=shipment.id,
                reference_type='shipment',
                from_location_id=lib_location.id,
                notes=f'Envío {shipment.shipment_number} a cliente {customer.name}'
            )
            db.session.add(movement)
            
            # Update lot location stock (decrease from LIB)
            if lot_loc:
                lot_loc.quantity -= quantity
            
            # Update lot total stock
            lot.current_quantity -= quantity
        
        db.session.commit()
        
        return jsonify(shipment.to_dict(include_details=True)), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al crear envío: {str(e)}'}), 500


@bp.route('/<int:shipment_id>', methods=['PUT'])
def update_shipment(shipment_id):
    """Update a shipment (limited fields, stock already affected)"""
    shipment = Shipment.query.get_or_404(shipment_id)
    data = request.get_json()
    
    # Only allow updating notes
    if 'notes' in data:
        shipment.notes = data['notes']
    
    db.session.commit()
    return jsonify(shipment.to_dict(include_details=True))
