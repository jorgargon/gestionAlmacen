from flask import Blueprint, request, jsonify
from models import (db, ProductionOrder, ProductionOrderMaterial, ProductionOrderFinishedProduct,
                    ProductionOrderStatus, Lot, Product, ProductType, StockMovement, MovementType,
                    Location, LotLocation)
from datetime import datetime

bp = Blueprint('production_orders', __name__, url_prefix='/api/production-orders')


@bp.route('/next-number', methods=['GET'])
def get_next_order_number():
    """Generate the next production order number: YYYY-XXX"""
    current_year = datetime.now().year
    prefix = f"{current_year}-"
    
    # Find the last order number with the current year prefix
    last_order = ProductionOrder.query.filter(
        ProductionOrder.order_number.like(f"{prefix}%")
    ).order_by(ProductionOrder.order_number.desc()).first()
    
    if last_order:
        try:
            # Extract the counter part (assuming format YYYY-XXX)
            parts = last_order.order_number.split('-')
            if len(parts) >= 2:
                last_counter = int(parts[-1])
                next_counter = last_counter + 1
            else:
                next_counter = 1
        except ValueError:
            next_counter = 1
    else:
        next_counter = 1
        
    next_number = f"{prefix}{next_counter:03d}"
    return jsonify({'next_number': next_number})


@bp.route('', methods=['GET'])
def get_production_orders():
    """Get all production orders with optional filters"""
    status = request.args.get('status')
    
    query = ProductionOrder.query
    
    # Filter by status
    if status:
        try:
            query = query.filter_by(status=ProductionOrderStatus(status))
        except ValueError:
            return jsonify({'error': 'Estado inválido'}), 400
    
    orders = query.order_by(ProductionOrder.created_at.desc()).all()
    return jsonify([o.to_dict(include_materials=True) for o in orders])


@bp.route('/<int:order_id>', methods=['GET'])
def get_production_order(order_id):
    """Get a single production order with materials"""
    order = ProductionOrder.query.get_or_404(order_id)
    return jsonify(order.to_dict(include_materials=True, include_finished_products=True))


@bp.route('', methods=['POST'])
def create_production_order():
    """Create a new production order with multiple finished products"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['order_number', 'production_date', 'base_product_name', 'base_lot_number']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    # Check if order number already exists
    if ProductionOrder.query.filter_by(order_number=data['order_number']).first():
        return jsonify({'error': 'El número de orden ya existe'}), 400
    
    # Check if using new format (finished_products array) or old format
    if 'finished_products' in data:
        # New format: multiple products
        if not data['finished_products'] or len(data['finished_products']) == 0:
            return jsonify({'error': 'Debe especificar al menos un producto acabado'}), 400
        use_new_format = True
    else:
        # Old format compatibility: single product
        required_old = ['finished_product_id', 'finished_lot_number', 'target_quantity', 'unit']
        for field in required_old:
            if field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400
        use_new_format = False
    
    # Parse dates
    try:
        production_date = datetime.strptime(data['production_date'], '%Y-%m-%d').date()
        expiration_date = None
        if data.get('expiration_date'):
            expiration_date = datetime.strptime(data['expiration_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido (use YYYY-MM-DD)'}), 400
    
    # Create order
    if use_new_format:
        order = ProductionOrder(
            order_number=data['order_number'],
            base_product_name=data['base_product_name'],
            base_lot_number=data['base_lot_number'],
            production_date=production_date,
            expiration_date=expiration_date,
            notes=data.get('notes'),
            status=ProductionOrderStatus.DRAFT,
            # Set old fields to None for new format
            finished_product_id=None,
            finished_lot_number=None,
            target_quantity=None,
            unit=None
        )
    else:
        # Old format
        exp_date = None
        if data.get('expiration_date'):
            try:
                exp_date = datetime.strptime(data['expiration_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Formato de fecha de caducidad inválido'}), 400
        
        order = ProductionOrder(
            order_number=data['order_number'],
            finished_product_id=data['finished_product_id'],
            finished_lot_number=data['finished_lot_number'],
            target_quantity=data['target_quantity'],
            unit=data['unit'],
            production_date=production_date,
            expiration_date=exp_date,
            notes=data.get('notes'),
            status=ProductionOrderStatus.DRAFT
        )
    
    db.session.add(order)
    db.session.flush()  # Get order.id
    
    # Create finished products if using new format
    if use_new_format:
        for fp_data in data['finished_products']:
            # Validate product
            product = Product.query.get(fp_data['finished_product_id'])
            if not product:
                db.session.rollback()
                return jsonify({'error': f'Producto con ID {fp_data["finished_product_id"]} no encontrado'}), 404
            if product.type != ProductType.FINISHED_PRODUCT:
                db.session.rollback()
                return jsonify({'error': f'El producto {product.name} debe ser de tipo producto acabado'}), 400
            
            # Parse expiration date
            exp_date = None
            if fp_data.get('expiration_date'):
                try:
                    exp_date = datetime.strptime(fp_data['expiration_date'], '%Y-%m-%d').date()
                except ValueError:
                    db.session.rollback()
                    return jsonify({'error': 'Formato de fecha de caducidad inválido'}), 400
            
            # Create finished product record
            finished_product = ProductionOrderFinishedProduct(
                production_order_id=order.id,
                finished_product_id=fp_data['finished_product_id'],
                lot_number=fp_data['lot_number'],
                target_quantity=fp_data.get('target_quantity'),
                unit=fp_data.get('unit', 'ud'),
                expiration_date=exp_date
            )
            db.session.add(finished_product)
    
    db.session.commit()
    
    return jsonify(order.to_dict(include_materials=True, include_finished_products=True)), 201


@bp.route('/<int:order_id>', methods=['PUT'])
def update_production_order(order_id):
    """Update a production order (only if not closed)"""
    order = ProductionOrder.query.get_or_404(order_id)
    
    if order.status == ProductionOrderStatus.CLOSED:
        return jsonify({'error': 'No se puede modificar una orden cerrada'}), 400
    
    data = request.get_json()
    
    # Update fields
    if 'target_quantity' in data:
        order.target_quantity = data['target_quantity']
    if 'notes' in data:
        order.notes = data['notes']
    if 'production_date' in data:
        try:
            order.production_date = datetime.strptime(data['production_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de fecha de producción inválido'}), 400
    if 'expiration_date' in data:
        if data['expiration_date']:
            try:
                order.expiration_date = datetime.strptime(data['expiration_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Formato de fecha de caducidad inválido'}), 400
        else:
            order.expiration_date = None
    
    db.session.commit()
    return jsonify(order.to_dict(include_materials=True))


@bp.route('/<int:order_id>/materials', methods=['POST'])
def add_material(order_id):
    """Add a material/lot to a production order with automatic unit conversion"""
    order = ProductionOrder.query.get_or_404(order_id)
    
    if order.status == ProductionOrderStatus.CLOSED:
        return jsonify({'error': 'No se puede modificar una orden cerrada'}), 400
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['lot_id', 'quantity_consumed', 'unit']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    # Check if lot exists
    lot = Lot.query.get(data['lot_id'])
    if not lot:
        return jsonify({'error': 'Lote no encontrado'}), 404
    
    # Validate lot is available (not expired)
    if not lot.is_available:
        return jsonify({'error': 'Lote no disponible (caducado o agotado)'}), 400
    
    # Validate lot is raw material or packaging
    if lot.product.type not in [ProductType.RAW_MATERIAL, ProductType.PACKAGING]:
        return jsonify({'error': 'Solo se pueden agregar materias primas o envases'}), 400
    
    # Get LIB location
    lib_location = Location.query.filter_by(code='LIB').first()
    if not lib_location:
        return jsonify({'error': 'Ubicación LIB no encontrada'}), 500
    
    # Check stock in LIB location
    lot_loc = LotLocation.query.filter_by(lot_id=lot.id, location_id=lib_location.id).first()
    available_in_lib = lot_loc.quantity if lot_loc else 0
    
    # Check if lot is already in this order
    existing = ProductionOrderMaterial.query.filter_by(
        production_order_id=order_id,
        lot_id=data['lot_id']
    ).first()
    if existing:
        return jsonify({'error': 'Este lote ya está en la orden de producción'}), 400
    
    # Convert consumption quantity to storage quantity if needed
    quantity_in_recipe_unit = data['quantity_consumed']
    recipe_unit = data['unit']
    
    # Convert to storage unit for stock validation
    quantity_to_consume_from_storage = lot.product.convert_to_storage_unit(
        quantity_in_recipe_unit, 
        recipe_unit
    )
    
    # Validate sufficient stock in LIB location
    if available_in_lib < quantity_to_consume_from_storage:
        return jsonify({
            'error': f'Stock insuficiente en ubicación Liberado. Requiere: {quantity_to_consume_from_storage:.2f} {lot.unit}. Disponible en LIB: {available_in_lib} {lot.unit}'
        }), 400
    
    # Add material (store both consumption and storage quantities)
    material = ProductionOrderMaterial(
        production_order_id=order_id,
        lot_id=data['lot_id'],
        quantity_consumed=quantity_to_consume_from_storage,  # Store in storage units
        unit=lot.unit,  # Use storage unit
        original_quantity=quantity_in_recipe_unit,  # Store entered quantity
        original_unit=recipe_unit,  # Store entered unit
        related_finished_product_id=data.get('related_finished_product_id')  # Link to specific finished product
    )
    
    db.session.add(material)
    db.session.commit()
    
    # Add conversion info to response
    result = material.to_dict()
    if quantity_in_recipe_unit != quantity_to_consume_from_storage:
        result['conversion_info'] = {
            'recipe_quantity': quantity_in_recipe_unit,
            'recipe_unit': recipe_unit,
            'storage_quantity': quantity_to_consume_from_storage,
           'storage_unit': lot.unit,
            'density': lot.product.density
        }
    
    return jsonify(result), 201


@bp.route('/<int:order_id>/materials/<int:material_id>', methods=['DELETE'])
def remove_material(order_id, material_id):
    """Remove a material from a production order"""
    order = ProductionOrder.query.get_or_404(order_id)
    
    if order.status == ProductionOrderStatus.CLOSED:
        return jsonify({'error': 'No se puede modificar una orden cerrada'}), 400
    
    material = ProductionOrderMaterial.query.filter_by(
        id=material_id,
        production_order_id=order_id
    ).first_or_404()
    
    db.session.delete(material)
    db.session.commit()
    
    return jsonify({'message': 'Material eliminado correctamente'})


@bp.route('/<int:order_id>/close', methods=['POST'])
def close_production_order(order_id):
    """Close a production order: create finished product lots, consume materials, update stock"""
    order = ProductionOrder.query.get_or_404(order_id)
    
    if order.status == ProductionOrderStatus.CLOSED:
        return jsonify({'error': 'La orden ya está cerrada'}), 400
    
    if not order.materials:
        return jsonify({'error': 'Debe agregar materiales antes de cerrar la orden'}), 400
    
    data = request.get_json()
    
    # Check if using new format (finished_products array) or old format
    if 'finished_products' in data:
        # New format: multiple products with quantities
        if not data['finished_products'] or len(data['finished_products']) == 0:
            return jsonify({'error': 'Debe indicar las cantidades producidas para cada producto'}), 400
        use_new_format = True
        
        # Validate all finished products exist in the order
        order_fp_ids = {fp.id for fp in order.finished_products}
        for fp_data in data['finished_products']:
            if fp_data['finished_product_id'] not in order_fp_ids:
                return jsonify({'error': f'El producto con ID {fp_data["finished_product_id"]} no pertenece a esta orden'}), 400
    else:
        # Old format compatibility
        produced_quantity = data.get('produced_quantity')
        if not produced_quantity:
            return jsonify({'error': 'Debe indicar la cantidad producida'}), 400
        use_new_format = False
    
    try:
        # Get required locations
        lib_location = Location.query.filter_by(code='LIB').first()
        fab_location = Location.query.filter_by(code='FAB').first()
        
        if not lib_location or not fab_location:
            return jsonify({'error': 'Ubicaciones LIB o FAB no encontradas. Ejecute la migración.'}), 500
        
        # Validate all materials have sufficient stock in LIB location
        for material in order.materials:
            lot = material.lot
            if not lot.is_available:
                return jsonify({
                    'error': f'Lote {lot.lot_number} no está disponible (caducado o agotado)'
                }), 400
            
            # Check stock in LIB
            lot_loc = LotLocation.query.filter_by(lot_id=lot.id, location_id=lib_location.id).first()
            available_in_lib = lot_loc.quantity if lot_loc else 0
            
            if available_in_lib < material.quantity_consumed:
                return jsonify({
                    'error': f'Stock insuficiente en LIB para lote {lot.lot_number}. Disponible: {available_in_lib} {lot.unit}'
                }), 400
        
        created_lots = []
        
        if use_new_format:
            # Create multiple finished product lots
            for fp_data in data['finished_products']:
                # Find the finished product record
                fp_record = next((fp for fp in order.finished_products if fp.id == fp_data['finished_product_id']), None)
                if not fp_record:
                    continue
                
                produced_qty = fp_data.get('produced_quantity')
                if not produced_qty or produced_qty <= 0:
                    continue  # Skip if no quantity produced
                
                # Use base_lot_number from order header
                lot_number = order.base_lot_number
                
                # Check if lot already exists
                existing_lot = Lot.query.filter_by(
                    product_id=fp_record.finished_product_id,
                    lot_number=lot_number
                ).first()
                if existing_lot:
                    db.session.rollback()
                    return jsonify({'error': f'El lote {lot_number} ya existe'}), 400
                
                # Create finished product lot using header fields
                finished_lot = Lot(
                    product_id=fp_record.finished_product_id,
                    lot_number=lot_number,  # From header
                    manufacturing_date=order.production_date,  # From header
                    expiration_date=order.expiration_date,  # From header
                    initial_quantity=produced_qty,
                    current_quantity=produced_qty,
                    unit=fp_record.unit
                )
                db.session.add(finished_lot)
                db.session.flush()
                
                # Create lot location in FAB (pending release)
                lot_location = LotLocation(
                    lot_id=finished_lot.id,
                    location_id=fab_location.id,
                    quantity=produced_qty
                )
                db.session.add(lot_location)
                
                # Update finished product record with lot_id and produced_quantity
                fp_record.lot_id = finished_lot.id
                fp_record.produced_quantity = produced_qty
                
                # Create entry movement to FAB
                entry_movement = StockMovement(
                    lot_id=finished_lot.id,
                    movement_type=MovementType.PRODUCTION,
                    quantity=produced_qty,
                    reference_id=order.id,
                    reference_type='production_order',
                    to_location_id=fab_location.id,
                    notes=f'Producción de orden {order.order_number}'
                )
                db.session.add(entry_movement)
                created_lots.append(finished_lot)
        
        else:
            # Old format: single product
            existing_lot = Lot.query.filter_by(
                product_id=order.finished_product_id,
                lot_number=order.finished_lot_number
            ).first()
            if existing_lot:
                db.session.rollback()
                return jsonify({'error': 'El lote de producto acabado ya existe'}), 400
            
            finished_lot = Lot(
                product_id=order.finished_product_id,
                lot_number=order.finished_lot_number,
                manufacturing_date=order.production_date,
                expiration_date=order.expiration_date,
                initial_quantity=produced_quantity,
                current_quantity=produced_quantity,
                unit=order.unit
            )
            db.session.add(finished_lot)
            db.session.flush()
            
            # Create lot location in FAB
            lot_location = LotLocation(
                lot_id=finished_lot.id,
                location_id=fab_location.id,
                quantity=produced_quantity
            )
            db.session.add(lot_location)
            
            entry_movement = StockMovement(
                lot_id=finished_lot.id,
                movement_type=MovementType.PRODUCTION,
                quantity=produced_quantity,
                reference_id=order.id,
                reference_type='production_order',
                to_location_id=fab_location.id,
                notes=f'Producción de orden {order.order_number}'
            )
            db.session.add(entry_movement)
            created_lots.append(finished_lot)
            order.produced_quantity = produced_quantity
        
        # Consume materials from LIB: create exit movements and update stock
        for material in order.materials:
            lot = material.lot
            
            # Get lot location in LIB
            lot_loc = LotLocation.query.filter_by(lot_id=lot.id, location_id=lib_location.id).first()
            
            # Create exit movement from LIB
            exit_movement = StockMovement(
                lot_id=lot.id,
                movement_type=MovementType.PRODUCTION,
                quantity=-material.quantity_consumed,  # Negative for consumption
                reference_id=order.id,
                reference_type='production_order',
                from_location_id=lib_location.id,
                notes=f'Consumo en orden {order.order_number}'
            )
            db.session.add(exit_movement)
            
            # Update lot location stock (decrease from LIB)
            if lot_loc:
                lot_loc.quantity -= material.quantity_consumed
            
            # Update lot total stock
            lot.current_quantity -= material.quantity_consumed
        
        # Update order status
        order.status = ProductionOrderStatus.CLOSED
        order.closed_at = datetime.utcnow()
        
        db.session.commit()
        
        response = {
            'message': 'Orden cerrada correctamente',
            'order': order.to_dict(include_materials=True, include_finished_products=True)
        }
        
        if use_new_format:
            response['finished_lots'] = [lot.to_dict(include_product=True) for lot in created_lots]
        else:
            response['finished_lot'] = created_lots[0].to_dict(include_product=True) if created_lots else None
        
        return jsonify(response)
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al cerrar la orden: {str(e)}'}), 500
