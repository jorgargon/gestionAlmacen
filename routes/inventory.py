from flask import Blueprint, request, jsonify
from models import db, Lot, Product, LotLocation
from sqlalchemy import func

bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')


@bp.route('', methods=['GET'])
def get_inventory():
    """Get current inventory with filters"""
    product_id = request.args.get('product_id', type=int)
    lot_number = request.args.get('lot_number')
    status = request.args.get('status')
    available_only = request.args.get('available_only', 'true').lower() == 'true'  # Default: show only available
    
    query = Lot.query.filter(Lot.current_quantity > 0)
    
    # Filter by product
    if product_id:
        query = query.filter_by(product_id=product_id)
    
    # Filter by lot number
    if lot_number:
        query = query.filter(Lot.lot_number.ilike(f'%{lot_number}%'))
    
    lots = query.order_by(Lot.expiration_date.asc().nullslast()).all()
    
    # Filter by status (computed property)
    if status:
        lots = [lot for lot in lots if lot.status.value == status]
    
    # Filter by availability
    if available_only:
        lots = [lot for lot in lots if lot.is_available]
    
    # Build response with additional info
    inventory = []
    for lot in lots:
        lot_dict = lot.to_dict(include_product=True)
        
        # Add location info
        lot_locations = LotLocation.query.filter_by(lot_id=lot.id).all()
        lot_dict['locations'] = [ll.to_dict() for ll in lot_locations]
        
        # Add stock status relative to min_stock
        if lot.product and lot.product.min_stock is not None:
            # Calculate total stock for this product
            total_stock = db.session.query(func.sum(Lot.current_quantity)).filter(
                Lot.product_id == lot.product_id,
                Lot.current_quantity > 0
            ).scalar() or 0
            
            lot_dict['is_below_min_stock'] = total_stock < lot.product.min_stock
        else:
            lot_dict['is_below_min_stock'] = False
        
        inventory.append(lot_dict)
    
    return jsonify(inventory)

