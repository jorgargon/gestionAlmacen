from flask import Blueprint, request, jsonify
from models import db, Product, ProductType
from sqlalchemy import or_, func

bp = Blueprint('products', __name__, url_prefix='/api/products')


@bp.route('', methods=['GET'])
def get_products():
    """Get all products with optional filters"""
    product_type = request.args.get('type')
    search = request.args.get('search')
    with_alerts = request.args.get('with_alerts', 'false').lower() == 'true'
    
    query = Product.query.filter_by(active=True)
    
    # Filter by type
    if product_type:
        try:
            query = query.filter_by(type=ProductType(product_type))
        except ValueError:
            return jsonify({'error': 'Tipo de producto inválido'}), 400
    
    # Search by code or name
    if search:
        search_filter = or_(
            Product.code.ilike(f'%{search}%'),
            Product.name.ilike(f'%{search}%')
        )
        query = query.filter(search_filter)
    
    products = query.order_by(Product.name).all()
    result = [p.to_dict() for p in products]
    
    # Add alerts info if requested
    if with_alerts:
        from models import Lot, AlertType
        for product_dict in result:
            product = Product.query.get(product_dict['id'])
            
            # Calculate current stock
            total_stock = db.session.query(func.sum(Lot.current_quantity)).filter(
                Lot.product_id == product.id,
                Lot.current_quantity > 0
            ).scalar() or 0
            
            product_dict['current_stock'] = total_stock
            product_dict['has_low_stock_alert'] = (
                product.min_stock is not None and total_stock < product.min_stock
            )
    
    return jsonify(result)


@bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Get a single product by ID"""
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())


@bp.route('', methods=['POST'])
def create_product():
    """Create a new product"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['code', 'name', 'type']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    # Check if code already exists
    if Product.query.filter_by(code=data['code']).first():
        return jsonify({'error': 'El código de producto ya existe'}), 400
    
    try:
        product_type = ProductType(data['type'])
    except ValueError:
        return jsonify({'error': 'Tipo de producto inválido'}), 400
    
    product = Product(
        code=data['code'],
        name=data['name'],
        type=product_type,
        description=data.get('description'),
        min_stock=data.get('min_stock'),
        storage_unit=data.get('storage_unit'),
        consumption_unit=data.get('consumption_unit'),
        density=data.get('density'),
        active=data.get('active', True)
    )
    
    db.session.add(product)
    db.session.commit()
    
    return jsonify(product.to_dict()), 201


@bp.route('/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """Update an existing product"""
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    
    # Check if code is being changed and if it conflicts
    if 'code' in data and data['code'] != product.code:
        existing = Product.query.filter_by(code=data['code']).first()
        if existing:
            return jsonify({'error': 'El código de producto ya existe'}), 400
        product.code = data['code']
    
    # Update fields
    if 'name' in data:
        product.name = data['name']
    if 'type' in data:
        try:
            product.type = ProductType(data['type'])
        except ValueError:
            return jsonify({'error': 'Tipo de producto inválido'}), 400
    if 'description' in data:
        product.description = data['description']
    if 'min_stock' in data:
        product.min_stock = data['min_stock']
    if 'storage_unit' in data:
        product.storage_unit = data['storage_unit']
    if 'consumption_unit' in data:
        product.consumption_unit = data['consumption_unit']
    if 'density' in data:
        product.density = data['density']
    if 'active' in data:
        product.active = data['active']
    
    db.session.commit()
    return jsonify(product.to_dict())


@bp.route('/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Soft delete a product (set active=False)"""
    product = Product.query.get_or_404(product_id)
    product.active = False
    db.session.commit()
    return jsonify({'message': 'Producto desactivado correctamente'})
