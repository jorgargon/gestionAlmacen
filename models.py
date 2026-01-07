from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from enum import Enum as PyEnum

db = SQLAlchemy()


# Enums
class ProductType(PyEnum):
    RAW_MATERIAL = 'raw_material'
    PACKAGING = 'packaging'
    FINISHED_PRODUCT = 'finished_product'


class LotStatus(PyEnum):
    ACTIVE = 'active'
    EXPIRED = 'expired'
    DEPLETED = 'depleted'
    BLOCKED = 'blocked'


class ProductionOrderStatus(PyEnum):
    DRAFT = 'draft'
    IN_PROGRESS = 'in_progress'
    CLOSED = 'closed'


class MovementType(PyEnum):
    ENTRY = 'entry'
    PRODUCTION = 'production'
    SHIPMENT = 'shipment'
    ADJUSTMENT = 'adjustment'
    RETURN = 'return'  # Devolución/retirada del mercado
    TRANSFER = 'transfer'  # Transferencia entre ubicaciones


class AlertType(PyEnum):
    LOW_STOCK = 'low_stock'
    EXPIRING_SOON = 'expiring_soon'
    EXPIRED = 'expired'
    BLOCKED = 'blocked'  # Lotes bloqueados (devoluciones, calidad, etc.)


class AlertSeverity(PyEnum):
    INFO = 'info'
    WARNING = 'warning'
    CRITICAL = 'critical'


# Models
class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    type = db.Column(db.Enum(ProductType), nullable=False)
    description = db.Column(db.Text, nullable=True)
    min_stock = db.Column(db.Float, nullable=True)
    
    # Unit conversion fields
    storage_unit = db.Column(db.String(20), nullable=True)  # Unit used for storage (e.g., 'L', 'kg')
    consumption_unit = db.Column(db.String(20), nullable=True)  # Unit used in recipes (e.g., 'kg', 'L')
    density = db.Column(db.Float, nullable=True)  # Conversion factor (e.g., kg/L)
    
    active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    lots = db.relationship('Lot', back_populates='product', lazy='dynamic')
    
    def __repr__(self):
        return f'<Product {self.code}: {self.name}>'
    
    def convert_to_storage_unit(self, quantity, from_unit):
        """Convert a quantity from consumption unit to storage unit
        
        Automatic conversions:
        - g -> kg: divide by 1000 (automatic, no density needed)
        - kg -> kg: no conversion
        - l -> l: no conversion
        - Other conversions: use density if configured
        """
        if not from_unit:
            return quantity
        
        # Same unit, no conversion
        if from_unit == self.storage_unit:
            return quantity
        
        # Automatic kg/g conversion (no density needed)
        if from_unit == 'g' and self.storage_unit == 'kg':
            return quantity / 1000.0
        
        if from_unit == 'kg' and self.storage_unit == 'g':
            return quantity * 1000.0
        
        # For other conversions (e.g., l <-> kg), use density
        if self.storage_unit and self.consumption_unit and self.density:
            if from_unit == self.consumption_unit:
                # Convert from consumption to storage using density
                # Example: 50 kg -> l, if density is 1.2 kg/l -> 50/1.2 = 41.67 l
                return quantity / self.density
        
        # If no conversion defined, return as-is
        return quantity
    
    def convert_to_consumption_unit(self, quantity, from_unit):
        """Convert a quantity from storage unit to consumption unit
        
        Automatic conversions:
        - kg -> g: multiply by 1000 (automatic, no density needed)
        - g -> g: no conversion
        - l -> l: no conversion
        - Other conversions: use density if configured
        """
        if not from_unit:
            return quantity
        
        # Same unit, no conversion
        if from_unit == self.consumption_unit:
            return quantity
        
        # Automatic kg/g conversion (no density needed)
        if from_unit == 'kg' and self.consumption_unit == 'g':
            return quantity * 1000.0
        
        if from_unit == 'g' and self.consumption_unit == 'kg':
            return quantity / 1000.0
        
        # For other conversions (e.g., l <-> kg), use density
        if self.storage_unit and self.consumption_unit and self.density:
            if from_unit == self.storage_unit:
                # Convert from storage to consumption using density
                # Example: 50 l -> kg, if density is 1.2 kg/l -> 50 * 1.2 = 60 kg
                return quantity * self.density
        
        # If no conversion defined, return as-is
        return quantity
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'type': self.type.value,
            'description': self.description,
            'min_stock': self.min_stock,
            'storage_unit': self.storage_unit,
            'consumption_unit': self.consumption_unit,
            'density': self.density,
            'active': self.active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Lot(db.Model):
    __tablename__ = 'lots'
    __table_args__ = (
        db.UniqueConstraint('product_id', 'lot_number', name='uq_product_lot'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    lot_number = db.Column(db.String(100), nullable=False, index=True)
    manufacturing_date = db.Column(db.Date, nullable=False)
    expiration_date = db.Column(db.Date, nullable=True)
    initial_quantity = db.Column(db.Float, nullable=False)
    current_quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False)
    blocked = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    product = db.relationship('Product', back_populates='lots')
    movements = db.relationship('StockMovement', back_populates='lot', lazy='dynamic')
    production_materials = db.relationship('ProductionOrderMaterial', back_populates='lot')
    shipment_details = db.relationship('ShipmentDetail', back_populates='lot')
    
    @property
    def status(self):
        """Calculate status based on current quantity and expiration date"""
        if self.blocked:
            return LotStatus.BLOCKED
        if self.current_quantity <= 0:
            return LotStatus.DEPLETED
        if self.expiration_date and self.expiration_date < date.today():
            return LotStatus.EXPIRED
        return LotStatus.ACTIVE
    
    @property
    def is_available(self):
        """Check if lot is available for use (not expired and not depleted)"""
        return self.status == LotStatus.ACTIVE
    
    @property
    def days_to_expiration(self):
        """Calculate days remaining until expiration"""
        if not self.expiration_date:
            return None
        delta = self.expiration_date - date.today()
        return delta.days
    
    def __repr__(self):
        return f'<Lot {self.lot_number} - {self.product.name if self.product else "Unknown"}>'
    
    def to_dict(self, include_product=False, include_movements=False):
        result = {
            'id': self.id,
            'product_id': self.product_id,
            'lot_number': self.lot_number,
            'manufacturing_date': self.manufacturing_date.isoformat() if self.manufacturing_date else None,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'initial_quantity': self.initial_quantity,
            'current_quantity': self.current_quantity,
            'unit': self.unit,
            'status': self.status.value,
            'blocked': self.blocked,
            'is_available': self.is_available,
            'days_to_expiration': self.days_to_expiration,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_product and self.product:
            result['product'] = self.product.to_dict()
        
        if include_movements:
            result['movements'] = [m.to_dict() for m in self.movements.all()]
        
        return result


class ProductionOrder(db.Model):
    __tablename__ = 'production_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    
    # Header fields - shared by all products in the order
    base_product_name = db.Column(db.String(200), nullable=True)
    base_lot_number = db.Column(db.String(100), nullable=True)
    
    # Legacy fields - for backward compatibility, now nullable
    finished_product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    finished_lot_number = db.Column(db.String(100), nullable=True)
    target_quantity = db.Column(db.Float, nullable=True)
    produced_quantity = db.Column(db.Float, nullable=True)
    unit = db.Column(db.String(20), nullable=True)
    
    production_date = db.Column(db.Date, nullable=False)
    expiration_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.Enum(ProductionOrderStatus), default=ProductionOrderStatus.DRAFT, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    closed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    finished_product = db.relationship('Product', foreign_keys=[finished_product_id])
    materials = db.relationship('ProductionOrderMaterial', back_populates='production_order', cascade='all, delete-orphan')
    finished_products = db.relationship('ProductionOrderFinishedProduct', back_populates='production_order', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<ProductionOrder {self.order_number} - {self.status.value}>'
    
    def to_dict(self, include_materials=False, include_finished_products=False):
        result = {
            'id': self.id,
            'order_number': self.order_number,
            'base_product_name': self.base_product_name,
            'base_lot_number': self.base_lot_number,
            'finished_product_id': self.finished_product_id,
            'finished_lot_number': self.finished_lot_number,
            'target_quantity': self.target_quantity,
            'produced_quantity': self.produced_quantity,
            'unit': self.unit,
            'production_date': self.production_date.isoformat() if self.production_date else None,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'status': self.status.value,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None
        }
        
        if include_materials:
            result['materials'] = [m.to_dict() for m in self.materials]
        
        if include_finished_products:
            result['finished_products'] = [fp.to_dict(include_product=True, include_lot=True) for fp in self.finished_products]
        
        if self.finished_product:
            result['finished_product'] = self.finished_product.to_dict()
        
        return result


class ProductionOrderFinishedProduct(db.Model):
    """Intermediate table for multiple finished products per production order"""
    __tablename__ = 'production_order_finished_products'
    
    id = db.Column(db.Integer, primary_key=True)
    production_order_id = db.Column(db.Integer, db.ForeignKey('production_orders.id'), nullable=False)
    finished_product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    lot_number = db.Column(db.String(100), nullable=False)
    target_quantity = db.Column(db.Float, nullable=True)
    produced_quantity = db.Column(db.Float, nullable=True)
    unit = db.Column(db.String(20), default='ud', nullable=False)
    expiration_date = db.Column(db.Date, nullable=True)
    lot_id = db.Column(db.Integer, db.ForeignKey('lots.id'), nullable=True)  # Set when order is closed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    production_order = db.relationship('ProductionOrder', back_populates='finished_products')
    finished_product = db.relationship('Product', foreign_keys=[finished_product_id])
    lot = db.relationship('Lot', foreign_keys=[lot_id])
    
    def __repr__(self):
        return f'<ProductionOrderFinishedProduct {self.lot_number} - {self.finished_product.name if self.finished_product else "Unknown"}>'
    
    def to_dict(self, include_product=False, include_lot=False):
        result = {
            'id': self.id,
            'production_order_id': self.production_order_id,
            'finished_product_id': self.finished_product_id,
            'lot_number': self.lot_number,
            'target_quantity': self.target_quantity,
            'produced_quantity': self.produced_quantity,
            'unit': self.unit,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'lot_id': self.lot_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_product and self.finished_product:
            result['finished_product'] = self.finished_product.to_dict()
        
        if include_lot and self.lot:
            result['lot'] = self.lot.to_dict(include_product=True)
        
        return result


class ProductionOrderMaterial(db.Model):
    __tablename__ = 'production_order_materials'
    __table_args__ = (
        db.UniqueConstraint('production_order_id', 'lot_id', name='uq_order_lot'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    production_order_id = db.Column(db.Integer, db.ForeignKey('production_orders.id'), nullable=False)
    lot_id = db.Column(db.Integer, db.ForeignKey('lots.id'), nullable=False)
    quantity_consumed = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False)
    
    # Original entered values (for display)
    original_quantity = db.Column(db.Float, nullable=True)
    original_unit = db.Column(db.String(20), nullable=True)
    
    # Traceability: Link material to specific finished product (null = common/base)
    related_finished_product_id = db.Column(db.Integer, db.ForeignKey('production_order_finished_products.id'), nullable=True)
    
    # Relationships
    production_order = db.relationship('ProductionOrder', back_populates='materials')
    lot = db.relationship('Lot', back_populates='production_materials')
    related_finished_product = db.relationship('ProductionOrderFinishedProduct')
    
    def __repr__(self):
        return f'<Material {self.lot.lot_number if self.lot else "Unknown"} for Order {self.production_order.order_number if self.production_order else "Unknown"}>'
    
    def to_dict(self):
        result = {
            'id': self.id,
            'production_order_id': self.production_order_id,
            'lot_id': self.lot_id,
            'quantity_consumed': self.quantity_consumed,
            'unit': self.unit,
            'original_quantity': self.original_quantity,
            'original_unit': self.original_unit,
            'lot': self.lot.to_dict(include_product=True) if self.lot else None,
            'related_finished_product_id': self.related_finished_product_id
        }
        
        if self.related_finished_product:
            result['related_finished_product'] = {
                'id': self.related_finished_product.id,
                'finished_product_name': self.related_finished_product.finished_product.name if self.related_finished_product.finished_product else 'Unknown',
                'lot_number': self.related_finished_product.lot_number
            }
            
        return result


class StockMovement(db.Model):
    __tablename__ = 'stock_movements'
    
    id = db.Column(db.Integer, primary_key=True)
    lot_id = db.Column(db.Integer, db.ForeignKey('lots.id'), nullable=False)
    movement_type = db.Column(db.Enum(MovementType), nullable=False)
    quantity = db.Column(db.Float, nullable=False)  # Positive for entries, negative for exits
    movement_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reference_id = db.Column(db.Integer, nullable=True)
    reference_type = db.Column(db.String(50), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    # Location fields for transfers
    from_location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=True)
    to_location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=True)
    
    # Relationships
    lot = db.relationship('Lot', back_populates='movements')
    from_location = db.relationship('Location', foreign_keys=[from_location_id])
    to_location = db.relationship('Location', foreign_keys=[to_location_id])
    
    def __repr__(self):
        return f'<Movement {self.movement_type.value}: {self.quantity} {self.lot.unit if self.lot else ""}>'
    
    def to_dict(self, include_lot=False):
        result = {
            'id': self.id,
            'lot_id': self.lot_id,
            'movement_type': self.movement_type.value,
            'quantity': self.quantity,
            'movement_date': self.movement_date.isoformat() if self.movement_date else None,
            'reference_id': self.reference_id,
            'reference_type': self.reference_type,
            'notes': self.notes,
            'from_location_id': self.from_location_id,
            'to_location_id': self.to_location_id,
            'from_location': self.from_location.to_dict() if self.from_location else None,
            'to_location': self.to_location.to_dict() if self.to_location else None
        }
        
        if include_lot and self.lot:
            result['lot'] = self.lot.to_dict(include_product=True)
        
        return result


class Customer(db.Model):
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    address = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    shipments = db.relationship('Shipment', back_populates='customer', lazy='dynamic')
    
    def __repr__(self):
        return f'<Customer {self.code}: {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'active': self.active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Shipment(db.Model):
    __tablename__ = 'shipments'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    shipment_date = db.Column(db.Date, nullable=False)
    shipment_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    customer = db.relationship('Customer', back_populates='shipments')
    details = db.relationship('ShipmentDetail', back_populates='shipment', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Shipment {self.shipment_number} to {self.customer.name if self.customer else "Unknown"}>'
    
    def to_dict(self, include_details=False):
        result = {
            'id': self.id,
            'customer_id': self.customer_id,
            'shipment_date': self.shipment_date.isoformat() if self.shipment_date else None,
            'shipment_number': self.shipment_number,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if self.customer:
            result['customer'] = self.customer.to_dict()
        
        if include_details:
            result['details'] = [d.to_dict() for d in self.details]
        
        return result


class ShipmentDetail(db.Model):
    __tablename__ = 'shipment_details'
    __table_args__ = (
        db.UniqueConstraint('shipment_id', 'lot_id', name='uq_shipment_lot'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    shipment_id = db.Column(db.Integer, db.ForeignKey('shipments.id'), nullable=False)
    lot_id = db.Column(db.Integer, db.ForeignKey('lots.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False)
    
    # Relationships
    shipment = db.relationship('Shipment', back_populates='details')
    lot = db.relationship('Lot', back_populates='shipment_details')
    
    def __repr__(self):
        return f'<ShipmentDetail {self.quantity} {self.unit} of Lot {self.lot.lot_number if self.lot else "Unknown"}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'shipment_id': self.shipment_id,
            'lot_id': self.lot_id,
            'quantity': self.quantity,
            'unit': self.unit,
            'lot': self.lot.to_dict(include_product=True) if self.lot else None
        }


class Alert(db.Model):
    __tablename__ = 'alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    alert_type = db.Column(db.Enum(AlertType), nullable=False)
    severity = db.Column(db.Enum(AlertSeverity), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    lot_id = db.Column(db.Integer, db.ForeignKey('lots.id'), nullable=True)
    message = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    is_dismissed = db.Column(db.Boolean, default=False, nullable=False)
    
    # Relationships
    product = db.relationship('Product')
    lot = db.relationship('Lot')
    
    def __repr__(self):
        return f'<Alert {self.alert_type.value}: {self.severity.value}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'alert_type': self.alert_type.value,
            'severity': self.severity.value,
            'product_id': self.product_id,
            'lot_id': self.lot_id,
            'message': self.message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_read': self.is_read,
            'is_dismissed': self.is_dismissed,
            'product': self.product.to_dict() if self.product else None,
            'lot': self.lot.to_dict(include_product=True) if self.lot else None
        }


class Return(db.Model):
    """Devolución o retirada de producto del mercado"""
    __tablename__ = 'returns'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    return_date = db.Column(db.Date, nullable=False)
    return_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    reason = db.Column(db.String(50), nullable=False)  # 'customer_return', 'market_recall', 'quality_issue'
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    customer = db.relationship('Customer')
    details = db.relationship('ReturnDetail', back_populates='return_record', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Return {self.return_number}>'
    
    def to_dict(self, include_details=False):
        result = {
            'id': self.id,
            'customer_id': self.customer_id,
            'return_date': self.return_date.isoformat() if self.return_date else None,
            'return_number': self.return_number,
            'reason': self.reason,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if self.customer:
            result['customer'] = self.customer.to_dict()
        
        if include_details:
            result['details'] = [d.to_dict() for d in self.details]
        
        return result


class ReturnDetail(db.Model):
    """Detalle de línea de devolución"""
    __tablename__ = 'return_details'
    __table_args__ = (
        db.UniqueConstraint('return_id', 'lot_id', name='uq_return_lot'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    return_id = db.Column(db.Integer, db.ForeignKey('returns.id'), nullable=False)
    lot_id = db.Column(db.Integer, db.ForeignKey('lots.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False)
    
    # Relationships
    return_record = db.relationship('Return', back_populates='details')
    lot = db.relationship('Lot')
    
    def __repr__(self):
        return f'<ReturnDetail {self.quantity} {self.unit} of Lot {self.lot.lot_number if self.lot else "Unknown"}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'return_id': self.return_id,
            'lot_id': self.lot_id,
            'quantity': self.quantity,
            'unit': self.unit,
            'lot': self.lot.to_dict(include_product=True) if self.lot else None
        }


class Location(db.Model):
    """Ubicación de almacén"""
    __tablename__ = 'locations'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False)
    name = db.Column(db.String(50), nullable=False)
    is_available = db.Column(db.Boolean, default=False, nullable=False)  # Solo LIB = True
    active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Relationships
    lot_locations = db.relationship('LotLocation', back_populates='location')
    
    def __repr__(self):
        return f'<Location {self.code}: {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'is_available': self.is_available,
            'active': self.active
        }


class LotLocation(db.Model):
    """Stock de un lote en una ubicación específica"""
    __tablename__ = 'lot_locations'
    __table_args__ = (
        db.UniqueConstraint('lot_id', 'location_id', name='uq_lot_location'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    lot_id = db.Column(db.Integer, db.ForeignKey('lots.id'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=0)
    
    # Relationships
    lot = db.relationship('Lot')
    location = db.relationship('Location', back_populates='lot_locations')
    
    def __repr__(self):
        return f'<LotLocation {self.lot.lot_number if self.lot else "?"} @ {self.location.code if self.location else "?"}: {self.quantity}>'
    
    def to_dict(self, include_location=True):
        result = {
            'id': self.id,
            'lot_id': self.lot_id,
            'location_id': self.location_id,
            'quantity': self.quantity
        }
        if include_location and self.location:
            result['location'] = self.location.to_dict()
        return result
