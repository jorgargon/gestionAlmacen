from flask import Blueprint, request, jsonify
from models import (db, Location, LotLocation, Lot, StockMovement, MovementType)

bp = Blueprint('locations', __name__, url_prefix='/api/locations')


@bp.route('', methods=['GET'])
def get_locations():
    """Get all locations"""
    active_only = request.args.get('active_only', 'true').lower() == 'true'
    
    query = Location.query
    if active_only:
        query = query.filter_by(active=True)
    
    locations = query.order_by(Location.code).all()
    return jsonify([loc.to_dict() for loc in locations])


@bp.route('/<int:location_id>', methods=['GET'])
def get_location(location_id):
    """Get a single location"""
    location = Location.query.get_or_404(location_id)
    return jsonify(location.to_dict())


@bp.route('', methods=['POST'])
def create_location():
    """Create a new location (admin only)"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('code') or not data.get('name'):
        return jsonify({'error': 'Código y nombre son requeridos'}), 400
    
    # Check if code already exists
    if Location.query.filter_by(code=data['code'].upper()).first():
        return jsonify({'error': 'Ya existe una ubicación con ese código'}), 400
    
    location = Location(
        code=data['code'].upper(),
        name=data['name'],
        is_available=data.get('is_available', False),
        active=data.get('active', True)
    )
    
    db.session.add(location)
    db.session.commit()
    
    return jsonify(location.to_dict()), 201


@bp.route('/transfer', methods=['POST'])
def transfer_stock():
    """Transfer stock between locations"""
    data = request.get_json()
    
    # Validate required fields
    required = ['lot_id', 'from_location_id', 'to_location_id', 'quantity']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    lot = Lot.query.get(data['lot_id'])
    if not lot:
        return jsonify({'error': 'Lote no encontrado'}), 404
    
    from_loc = Location.query.get(data['from_location_id'])
    to_loc = Location.query.get(data['to_location_id'])
    
    if not from_loc or not to_loc:
        return jsonify({'error': 'Ubicación no encontrada'}), 404
    
    if from_loc.id == to_loc.id:
        return jsonify({'error': 'Las ubicaciones origen y destino deben ser diferentes'}), 400
    
    quantity = float(data['quantity'])
    if quantity <= 0:
        return jsonify({'error': 'La cantidad debe ser mayor que cero'}), 400
    
    # Check stock in origin location
    from_lot_loc = LotLocation.query.filter_by(
        lot_id=lot.id,
        location_id=from_loc.id
    ).first()
    
    if not from_lot_loc or from_lot_loc.quantity < quantity:
        available = from_lot_loc.quantity if from_lot_loc else 0
        return jsonify({
            'error': f'Stock insuficiente en ubicación origen. Disponible: {available}'
        }), 400
    
    try:
        # Decrease stock in origin
        from_lot_loc.quantity -= quantity
        
        # Increase stock in destination
        to_lot_loc = LotLocation.query.filter_by(
            lot_id=lot.id,
            location_id=to_loc.id
        ).first()
        
        if to_lot_loc:
            to_lot_loc.quantity += quantity
        else:
            to_lot_loc = LotLocation(
                lot_id=lot.id,
                location_id=to_loc.id,
                quantity=quantity
            )
            db.session.add(to_lot_loc)
        
        # Create movement record
        movement = StockMovement(
            lot_id=lot.id,
            movement_type=MovementType.TRANSFER,
            quantity=quantity,
            from_location_id=from_loc.id,
            to_location_id=to_loc.id,
            notes=data.get('notes', f'Transferencia de {from_loc.name} a {to_loc.name}')
        )
        db.session.add(movement)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Transferidas {quantity} {lot.unit} de {from_loc.name} a {to_loc.name}',
            'from_location': from_lot_loc.to_dict(),
            'to_location': to_lot_loc.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error en transferencia: {str(e)}'}), 500


@bp.route('/lot/<int:lot_id>/stock', methods=['GET'])
def get_lot_stock_by_location(lot_id):
    """Get stock breakdown by location for a lot"""
    lot = Lot.query.get_or_404(lot_id)
    
    lot_locations = LotLocation.query.filter_by(lot_id=lot_id).all()
    
    return jsonify({
        'lot_id': lot_id,
        'lot_number': lot.lot_number,
        'total_quantity': lot.current_quantity,
        'unit': lot.unit,
        'locations': [ll.to_dict() for ll in lot_locations]
    })


@bp.route('/available-stock', methods=['GET'])
def get_available_stock():
    """Get stock only from available locations (for production/shipment)"""
    product_id = request.args.get('product_id', type=int)
    
    # Get the available location (LIB)
    lib_location = Location.query.filter_by(code='LIB').first()
    if not lib_location:
        return jsonify({'error': 'Ubicación LIB no encontrada'}), 404
    
    query = LotLocation.query.join(Lot).filter(
        LotLocation.location_id == lib_location.id,
        LotLocation.quantity > 0
    )
    
    if product_id:
        query = query.filter(Lot.product_id == product_id)
    
    # Sort by expiration date (FEFO)
    query = query.order_by(Lot.expiration_date.asc().nullslast())
    
    lot_locations = query.all()
    
    result = []
    for ll in lot_locations:
        lot_dict = ll.lot.to_dict(include_product=True)
        lot_dict['available_quantity'] = ll.quantity
        result.append(lot_dict)
    
    return jsonify(result)
