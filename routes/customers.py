from flask import Blueprint, request, jsonify
from models import db, Customer
from sqlalchemy import or_

bp = Blueprint('customers', __name__, url_prefix='/api/customers')


@bp.route('', methods=['GET'])
def get_customers():
    """Get all customers with optional search"""
    search = request.args.get('search')
    
    query = Customer.query.filter_by(active=True)
    
    # Search by code or name
    if search:
        search_filter = or_(
            Customer.code.ilike(f'%{search}%'),
            Customer.name.ilike(f'%{search}%')
        )
        query = query.filter(search_filter)
    
    customers = query.order_by(Customer.name).all()
    return jsonify([c.to_dict() for c in customers])


@bp.route('/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    """Get a single customer by ID"""
    customer = Customer.query.get_or_404(customer_id)
    return jsonify(customer.to_dict())


@bp.route('', methods=['POST'])
def create_customer():
    """Create a new customer"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['code', 'name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    # Check if code already exists
    if Customer.query.filter_by(code=data['code']).first():
        return jsonify({'error': 'El código de cliente ya existe'}), 400
    
    customer = Customer(
        code=data['code'],
        name=data['name'],
        email=data.get('email'),
        phone=data.get('phone'),
        address=data.get('address'),
        active=data.get('active', True)
    )
    
    db.session.add(customer)
    db.session.commit()
    
    return jsonify(customer.to_dict()), 201


@bp.route('/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """Update an existing customer"""
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json()
    
    # Check if code is being changed and if it conflicts
    if 'code' in data and data['code'] != customer.code:
        existing = Customer.query.filter_by(code=data['code']).first()
        if existing:
            return jsonify({'error': 'El código de cliente ya existe'}), 400
        customer.code = data['code']
    
    # Update fields
    if 'name' in data:
        customer.name = data['name']
    if 'email' in data:
        customer.email = data['email']
    if 'phone' in data:
        customer.phone = data['phone']
    if 'address' in data:
        customer.address = data['address']
    if 'active' in data:
        customer.active = data['active']
    
    db.session.commit()
    return jsonify(customer.to_dict())
