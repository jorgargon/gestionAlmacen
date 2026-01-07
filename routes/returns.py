from flask import Blueprint, request, jsonify
from models import (db, Return, ReturnDetail, Customer, Lot, ProductType,
                    StockMovement, MovementType, Location, LotLocation)
from datetime import datetime

bp = Blueprint('returns', __name__, url_prefix='/api/returns')


@bp.route('', methods=['GET'])
def get_returns():
    """Get all returns with optional filters"""
    customer_id = request.args.get('customer_id', type=int)
    reason = request.args.get('reason')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    query = Return.query
    
    # Filter by customer
    if customer_id:
        query = query.filter_by(customer_id=customer_id)
    
    # Filter by reason
    if reason:
        query = query.filter_by(reason=reason)
    
    # Filter by date range
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
            query = query.filter(Return.return_date >= date_from_obj)
        except ValueError:
            return jsonify({'error': 'Formato de fecha desde inválido'}), 400
    
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
            query = query.filter(Return.return_date <= date_to_obj)
        except ValueError:
            return jsonify({'error': 'Formato de fecha hasta inválido'}), 400
    
    returns = query.order_by(Return.return_date.desc()).all()
    
    return jsonify([r.to_dict(include_details=True) for r in returns])


@bp.route('/<int:return_id>', methods=['GET'])
def get_return(return_id):
    """Get a single return with details"""
    return_record = Return.query.get_or_404(return_id)
    return jsonify(return_record.to_dict(include_details=True))


@bp.route('', methods=['POST'])
def create_return():
    """Create a new return - receives products back into DEV location"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['return_number', 'return_date', 'reason', 'details']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    # Validate reason
    valid_reasons = ['customer_return', 'market_recall', 'quality_issue']
    if data['reason'] not in valid_reasons:
        return jsonify({'error': f'Motivo inválido. Valores válidos: {", ".join(valid_reasons)}'}), 400
    
    # Handle customer (optional for returns)
    customer = None
    if data.get('customer_id'):
        customer = Customer.query.get(data['customer_id'])
        if not customer:
            return jsonify({'error': 'Cliente no encontrado'}), 404
    
    # Check if return number already exists
    if Return.query.filter_by(return_number=data['return_number']).first():
        return jsonify({'error': 'El número de devolución ya existe'}), 400
    
    if not data['details']:
        return jsonify({'error': 'Debe incluir al menos un detalle de devolución'}), 400
    
    # Parse date
    try:
        return_date = datetime.strptime(data['return_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido (use YYYY-MM-DD)'}), 400
    
    # Get DEV location
    dev_location = Location.query.filter_by(code='DEV').first()
    if not dev_location:
        return jsonify({'error': 'Ubicación DEV no encontrada. Ejecute la migración.'}), 500
    
    try:
        # Validate all lots before creating return
        validated_details = []
        for detail_data in data['details']:
            if 'lot_id' not in detail_data or 'quantity' not in detail_data:
                return jsonify({'error': 'Cada detalle debe incluir lot_id y quantity'}), 400
            
            lot = Lot.query.get(detail_data['lot_id'])
            if not lot:
                return jsonify({'error': f'Lote {detail_data["lot_id"]} no encontrado'}), 404
            
            # Validate lot is finished product
            if lot.product.type != ProductType.FINISHED_PRODUCT:
                return jsonify({
                    'error': f'Solo se pueden devolver productos acabados. Lote {lot.lot_number} es de tipo {lot.product.type.value}'
                }), 400
            
            validated_details.append({
                'lot': lot,
                'quantity': detail_data['quantity'],
                'unit': detail_data.get('unit', lot.unit)
            })
        
        # Create return
        return_record = Return(
            customer_id=customer.id if customer else None,
            return_number=data['return_number'],
            return_date=return_date,
            reason=data['reason'],
            notes=data.get('notes')
        )
        db.session.add(return_record)
        db.session.flush()
        
        # Create details and movements
        for detail_info in validated_details:
            lot = detail_info['lot']
            quantity = detail_info['quantity']
            
            # Create return detail
            detail = ReturnDetail(
                return_id=return_record.id,
                lot_id=lot.id,
                quantity=quantity,
                unit=detail_info['unit']
            )
            db.session.add(detail)
            
            # Create entry movement to DEV location
            customer_name = customer.name if customer else 'Devolución interna'
            movement = StockMovement(
                lot_id=lot.id,
                movement_type=MovementType.RETURN,
                quantity=quantity,  # Positive for entry
                reference_id=return_record.id,
                reference_type='return',
                to_location_id=dev_location.id,
                notes=f'Devolución {return_record.return_number} de {customer_name}'
            )
            db.session.add(movement)
            
            # Update lot total stock
            lot.current_quantity += quantity
            
            # Add stock to DEV location
            lot_loc = LotLocation.query.filter_by(
                lot_id=lot.id,
                location_id=dev_location.id
            ).first()
            
            if lot_loc:
                lot_loc.quantity += quantity
            else:
                lot_loc = LotLocation(
                    lot_id=lot.id,
                    location_id=dev_location.id,
                    quantity=quantity
                )
                db.session.add(lot_loc)
        
        db.session.commit()
        
        return jsonify(return_record.to_dict(include_details=True)), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al crear devolución: {str(e)}'}), 500


@bp.route('/next-number', methods=['GET'])
def get_next_return_number():
    """Generate the next return number in format DEV-YYYY-XXX"""
    import datetime as dt
    year = dt.datetime.now().year
    
    # Find last return number for this year
    last_return = Return.query.filter(
        Return.return_number.like(f'DEV-{year}-%')
    ).order_by(Return.id.desc()).first()
    
    if last_return:
        try:
            last_num = int(last_return.return_number.split('-')[2])
            next_num = last_num + 1
        except (IndexError, ValueError):
            next_num = 1
    else:
        next_num = 1
    
    return jsonify({
        'next_number': f'DEV-{year}-{next_num:03d}'
    })
