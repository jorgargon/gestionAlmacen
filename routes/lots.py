from flask import Blueprint, request, jsonify
from models import db, Lot, Product, StockMovement, MovementType
from datetime import datetime
from sqlalchemy import or_

bp = Blueprint('lots', __name__, url_prefix='/api/lots')


@bp.route('', methods=['GET'])
def get_lots():
    """Get all lots with optional filters"""
    product_id = request.args.get('product_id', type=int)
    status = request.args.get('status')
    lot_number = request.args.get('lot_number')
    available_only = request.args.get('available_only', 'false').lower() == 'true'
    
    query = Lot.query
    
    # Filter by product
    if product_id:
        query = query.filter_by(product_id=product_id)
    
    # Filter by lot number
    if lot_number:
        query = query.filter(Lot.lot_number.ilike(f'%{lot_number}%'))
    
    # Combined FEFO/FIFO ordering:
    # - FEFO (First Expired First Out) for lots WITH expiration dates (raw materials)
    # - FIFO (First In First Out) for lots WITHOUT expiration dates (packaging)
    # ORDER BY: expiration_date ASC (nulls last), then created_at ASC for FIFO on nulls
    lots = query.order_by(
        Lot.expiration_date.asc().nullslast(),
        Lot.created_at.asc()  # FIFO: older lots first for items without expiration
    ).all()
    
    # Filter by status (computed property, so we filter after query)
    if status:
        lots = [lot for lot in lots if lot.status.value == status]
    
    # Filter by availability
    if available_only:
        lots = [lot for lot in lots if lot.is_available]
    
    return jsonify([lot.to_dict(include_product=True) for lot in lots])


@bp.route('/<int:lot_id>', methods=['GET'])
def get_lot(lot_id):
    """Get a single lot by ID with movements"""
    lot = Lot.query.get_or_404(lot_id)
    return jsonify(lot.to_dict(include_product=True, include_movements=True))


@bp.route('', methods=['POST'])
def create_lot():
    """Create a new lot and generate entry movement"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['product_id', 'lot_number', 'manufacturing_date', 'initial_quantity', 'unit']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    # Check if product exists
    product = Product.query.get(data['product_id'])
    if not product:
        return jsonify({'error': 'Producto no encontrado'}), 404
    
    # Check if lot number already exists for this product
    existing_lot = Lot.query.filter_by(
        product_id=data['product_id'],
        lot_number=data['lot_number']
    ).first()
    if existing_lot:
        return jsonify({'error': 'El número de lote ya existe para este producto'}), 400
    
    # Parse dates
    try:
        manufacturing_date = datetime.strptime(data['manufacturing_date'], '%Y-%m-%d').date()
        expiration_date = None
        if data.get('expiration_date'):
            expiration_date = datetime.strptime(data['expiration_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido (use YYYY-MM-DD)'}), 400
    
    # Create lot
    lot = Lot(
        product_id=data['product_id'],
        lot_number=data['lot_number'],
        manufacturing_date=manufacturing_date,
        expiration_date=expiration_date,
        initial_quantity=data['initial_quantity'],
        current_quantity=data['initial_quantity'],
        unit=data['unit']
    )
    
    db.session.add(lot)
    db.session.flush()  # Get lot ID before creating movement
    
    # Create entry movement
    movement = StockMovement(
        lot_id=lot.id,
        movement_type=MovementType.ENTRY,
        quantity=data['initial_quantity'],
        notes=data.get('notes', 'Entrada manual de lote')
    )
    
    db.session.add(movement)
    db.session.commit()
    
    return jsonify(lot.to_dict(include_product=True)), 201


@bp.route('/<int:lot_id>', methods=['PUT'])
def update_lot(lot_id):
    """Update an existing lot"""
    lot = Lot.query.get_or_404(lot_id)
    data = request.get_json()
    
    # Check if lot number is being changed and if it conflicts
    if 'lot_number' in data and data['lot_number'] != lot.lot_number:
        existing = Lot.query.filter_by(
            product_id=lot.product_id,
            lot_number=data['lot_number']
        ).first()
        if existing:
            return jsonify({'error': 'El número de lote ya existe para este producto'}), 400
        lot.lot_number = data['lot_number']
    
    # Update dates
    if 'manufacturing_date' in data:
        try:
            lot.manufacturing_date = datetime.strptime(data['manufacturing_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de fecha de fabricación inválido'}), 400
    
    if 'expiration_date' in data:
        if data['expiration_date']:
            try:
                lot.expiration_date = datetime.strptime(data['expiration_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Formato de fecha de caducidad inválido'}), 400
        else:
            lot.expiration_date = None
    
    # Note: We don't allow updating quantities directly - they're managed through movements
    
    db.session.commit()
    return jsonify(lot.to_dict(include_product=True))


@bp.route('/<int:lot_id>/movements', methods=['GET'])
def get_lot_movements(lot_id):
    """Get all movements for a specific lot"""
    lot = Lot.query.get_or_404(lot_id)
    movements = StockMovement.query.filter_by(lot_id=lot_id).order_by(StockMovement.movement_date.desc()).all()
    return jsonify([m.to_dict(include_lot=True) for m in movements])


@bp.route('/<int:lot_id>/toggle-block', methods=['POST'])
def toggle_block(lot_id):
    """Toggle the blocked status of a lot"""
    lot = Lot.query.get_or_404(lot_id)
    
    # Toggle status
    lot.blocked = not lot.blocked
    
    db.session.commit()
    
    return jsonify(lot.to_dict(include_product=True))


@bp.route('/<int:lot_id>/adjust', methods=['POST'])
def adjust_lot(lot_id):
    """Adjust stock quantity for a lot"""
    lot = Lot.query.get_or_404(lot_id)
    
    data = request.get_json()
    if 'real_quantity' not in data:
        return jsonify({'error': 'Campo requerido: real_quantity'}), 400
        
    try:
        real_quantity = float(data['real_quantity'])
        if real_quantity < 0:
            return jsonify({'error': 'La cantidad no puede ser negativa'}), 400
    except ValueError:
        return jsonify({'error': 'Cantidad inválida'}), 400
        
    # Calculate difference
    diff = real_quantity - lot.current_quantity
    
    if diff == 0:
        return jsonify({'message': 'Sin cambios'}), 200
        
    # Update lot quantity
    lot.current_quantity = real_quantity
    
    # Create adjustment movement
    movement = StockMovement(
        lot_id=lot.id,
        movement_type=MovementType.ADJUSTMENT,
        quantity=diff,
        notes=data.get('notes', 'Ajuste de inventario manual')
    )
    
    db.session.add(movement)
    db.session.commit()
    
    return jsonify(lot.to_dict(include_product=True))


@bp.route('/<int:lot_id>', methods=['DELETE'])
def delete_lot(lot_id):
    """Delete a lot and its movements"""
    lot = Lot.query.get_or_404(lot_id)
    
    # Check if lot has been used in production or shipments
    if lot.production_materials:
        return jsonify({'error': 'No se puede eliminar: el lote ha sido usado en producciones'}), 400
    if lot.shipment_details:
        return jsonify({'error': 'No se puede eliminar: el lote ha sido enviado a clientes'}), 400
    
    # Delete associated movements first
    for movement in lot.movements:
        db.session.delete(movement)
    
    db.session.delete(lot)
    db.session.commit()
    
    return jsonify({'message': 'Lote eliminado correctamente'})
