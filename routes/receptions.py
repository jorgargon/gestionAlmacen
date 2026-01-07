from flask import Blueprint, request, jsonify
from models import db, Lot, Product, ProductType, StockMovement, MovementType, Location, LotLocation
from datetime import datetime
from utils.document_generator import process_reception_document

bp = Blueprint('receptions', __name__, url_prefix='/api/receptions')


@bp.route('', methods=['GET'])
def get_receptions():
    """Get all receptions (blocked lots of raw materials and packaging)"""
    reception_type = request.args.get('type')
    
    # Receptions are blocked lots of raw materials or packaging
    query = Lot.query.join(Product).filter(
        Product.type.in_([ProductType.RAW_MATERIAL, ProductType.PACKAGING])
    )
    
    if reception_type:
        try:
            product_type = ProductType(reception_type)
            query = query.filter(Product.type == product_type)
        except ValueError:
            pass
    
    lots = query.order_by(Lot.created_at.desc()).all()
    
    # Add supplier info from first entry movement
    result = []
    for lot in lots:
        lot_dict = lot.to_dict(include_product=True)
        # Get supplier from entry movement notes
        entry_movement = lot.movements.filter_by(movement_type=MovementType.ENTRY).first()
        if entry_movement and entry_movement.notes:
            # Extract supplier from notes like "Recepción - Proveedor: XXXX"
            if 'Proveedor:' in entry_movement.notes:
                lot_dict['supplier'] = entry_movement.notes.split('Proveedor:')[1].strip()
            else:
                lot_dict['supplier'] = '-'
        else:
            lot_dict['supplier'] = '-'
        
        # Add location breakdown
        lot_locations = LotLocation.query.filter_by(lot_id=lot.id).all()
        lot_dict['locations'] = [ll.to_dict() for ll in lot_locations]
        
        result.append(lot_dict)
    
    return jsonify(result)



@bp.route('', methods=['POST'])
def create_reception():
    """Create a reception - creates a lot with stock in REC location"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['product_id', 'reception_date', 'quantity', 'unit', 'lot_number']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    # Check if product exists
    product = Product.query.get(data['product_id'])
    if not product:
        return jsonify({'error': 'Producto no encontrado'}), 404
    
    # Validate product type (only raw_material and packaging allowed)
    if product.type not in [ProductType.RAW_MATERIAL, ProductType.PACKAGING]:
        return jsonify({'error': 'Solo se pueden recepcionar materias primas y envases'}), 400
    
    # Check if lot number already exists for this product
    existing_lot = Lot.query.filter_by(
        product_id=data['product_id'],
        lot_number=data['lot_number']
    ).first()
    if existing_lot:
        return jsonify({'error': 'El número de lote ya existe para este producto'}), 400
    
    # Parse dates
    try:
        reception_date = datetime.strptime(data['reception_date'], '%Y-%m-%d').date()
        expiration_date = None
        if data.get('expiration_date') and product.type == ProductType.RAW_MATERIAL:
            expiration_date = datetime.strptime(data['expiration_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido (use YYYY-MM-DD)'}), 400
    
    # Get REC location
    rec_location = Location.query.filter_by(code='REC').first()
    if not rec_location:
        return jsonify({'error': 'Ubicación REC no encontrada. Ejecute la migración.'}), 500
    
    # Convert quantity to storage unit if needed
    received_qty = float(data['quantity'])
    received_unit = data['unit'].lower()
    storage_unit = (product.storage_unit or received_unit).lower()
    storage_qty = received_qty
    density = product.density or 1  # Default density of 1 if not set
    
    # Same unit - no conversion needed
    if received_unit == storage_unit:
        storage_qty = received_qty
    # Direct unit conversions (no density needed)
    elif received_unit == 'g' and storage_unit == 'kg':
        storage_qty = received_qty / 1000
    elif received_unit == 'kg' and storage_unit == 'g':
        storage_qty = received_qty * 1000
    # Density-based conversions (L ↔ kg)
    elif received_unit == 'kg' and storage_unit == 'l':
        # kg to L: divide by density
        storage_qty = received_qty / density
    elif received_unit == 'l' and storage_unit == 'kg':
        # L to kg: multiply by density
        storage_qty = received_qty * density
    # Complex conversions (g ↔ L via kg)
    elif received_unit == 'g' and storage_unit == 'l':
        # g to L: first g to kg, then kg to L
        kg_qty = received_qty / 1000
        storage_qty = kg_qty / density
    elif received_unit == 'l' and storage_unit == 'g':
        # L to g: first L to kg, then kg to g
        kg_qty = received_qty * density
        storage_qty = kg_qty * 1000

    
    # Supplier info for movement notes
    supplier = data.get('supplier', '')
    units_reviewed = data.get('units_reviewed', '')
    
    # Create lot (not blocked - availability controlled by location)
    lot = Lot(
        product_id=data['product_id'],
        lot_number=data['lot_number'],
        manufacturing_date=reception_date,  # Use reception date as manufacturing date
        expiration_date=expiration_date,
        initial_quantity=storage_qty,
        current_quantity=storage_qty,
        unit=product.storage_unit or received_unit,
        blocked=False  # Not blocked - availability controlled by location
    )
    
    db.session.add(lot)
    db.session.flush()  # Get lot ID before creating movement and location
    
    # Create lot location in REC
    lot_location = LotLocation(
        lot_id=lot.id,
        location_id=rec_location.id,
        quantity=storage_qty
    )
    db.session.add(lot_location)
    
    # Create entry movement with location info
    movement = StockMovement(
        lot_id=lot.id,
        movement_type=MovementType.ENTRY,
        quantity=storage_qty,
        to_location_id=rec_location.id,
        notes=f'Recepción - Proveedor: {supplier}'
    )
    
    db.session.add(movement)
    db.session.commit()
    
    # Generate reception document
    doc_data = {
        'product_type': product.type.value,
        'reception_date': data['reception_date'],
        'supplier': supplier,
        'product_name': product.name,
        'quantity': received_qty,
        'unit': received_unit,
        'units_reviewed': units_reviewed,
        'lot_number': data['lot_number'],
        'expiration_date': data.get('expiration_date')
    }
    doc_result = process_reception_document(doc_data)
    
    return jsonify({
        'message': 'Recepción registrada correctamente',
        'lot': lot.to_dict(include_product=True),
        'reception_info': {
            'supplier': supplier,
            'reception_date': reception_date.isoformat(),
            'quantity_received': received_qty,
            'unit_received': received_unit,
            'quantity_stored': storage_qty,
            'unit_stored': lot.unit
        },
        'document': {
            'generated': doc_result['success'],
            'message': doc_result['message'],
            'pdf_path': doc_result.get('pdf_path')
        }
    }), 201

