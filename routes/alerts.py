from flask import Blueprint, request, jsonify
from models import (db, Alert, AlertType, AlertSeverity, Product, Lot)
from datetime import date, timedelta
from sqlalchemy import func
from config import Config

bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')


@bp.route('', methods=['GET'])
def get_alerts():
    """Get all alerts with optional filters"""
    alert_type = request.args.get('alert_type')
    severity = request.args.get('severity')
    is_read = request.args.get('is_read')
    is_dismissed = request.args.get('is_dismissed')
    
    query = Alert.query
    
    # Filter by type
    if alert_type:
        try:
            query = query.filter_by(alert_type=AlertType(alert_type))
        except ValueError:
            return jsonify({'error': 'Tipo de alerta inválido'}), 400
    
    # Filter by severity
    if severity:
        try:
            query = query.filter_by(severity=AlertSeverity(severity))
        except ValueError:
            return jsonify({'error': 'Severidad inválida'}), 400
    
    # Filter by read status
    if is_read is not None:
        is_read_bool = is_read.lower() in ['true', '1']
        query = query.filter_by(is_read=is_read_bool)
    
    # Filter by dismissed status
    if is_dismissed is not None:
        is_dismissed_bool = is_dismissed.lower() in ['true', '1']
        query = query.filter_by(is_dismissed=is_dismissed_bool)
    
    alerts = query.order_by(Alert.created_at.desc()).all()
    return jsonify([a.to_dict() for a in alerts])


@bp.route('/count', methods=['GET'])
def get_alerts_count():
    """Get count of active alerts (not read, not dismissed)"""
    count = Alert.query.filter_by(is_read=False, is_dismissed=False).count()
    return jsonify({'count': count})


@bp.route('/<int:alert_id>/read', methods=['PUT'])
def mark_alert_read(alert_id):
    """Mark an alert as read"""
    alert = Alert.query.get_or_404(alert_id)
    alert.is_read = True
    db.session.commit()
    return jsonify(alert.to_dict())


@bp.route('/<int:alert_id>/dismiss', methods=['PUT'])
def dismiss_alert(alert_id):
    """Dismiss an alert"""
    alert = Alert.query.get_or_404(alert_id)
    alert.is_dismissed = True
    db.session.commit()
    return jsonify(alert.to_dict())


@bp.route('/generate', methods=['POST'])
def generate_alerts():
    """Generate alerts based on current inventory and stock levels"""
    try:
        # Clear old alerts (optional: keep history by not deleting)
        Alert.query.delete()
        
        alerts_created = 0
        
        # 1. Check for expired lots
        expired_lots = Lot.query.filter(
            Lot.expiration_date < date.today(),
            Lot.current_quantity > 0
        ).all()
        
        for lot in expired_lots:
            alert = Alert(
                alert_type=AlertType.EXPIRED,
                severity=AlertSeverity.CRITICAL,
                product_id=lot.product_id,
                lot_id=lot.id,
                message=f'Lote {lot.lot_number} de {lot.product.name} ha caducado ({lot.expiration_date.isoformat()})'
            )
            db.session.add(alert)
            alerts_created += 1
        
        # 2. Check for expiring soon (within EXPIRING_SOON_DAYS)
        expiring_soon_date = date.today() + timedelta(days=Config.EXPIRING_SOON_DAYS)
        expiring_lots = Lot.query.filter(
            Lot.expiration_date.isnot(None),
            Lot.expiration_date >= date.today(),
            Lot.expiration_date <= expiring_soon_date,
            Lot.current_quantity > 0
        ).all()
        
        for lot in expiring_lots:
            days_remaining = (lot.expiration_date - date.today()).days
            severity = AlertSeverity.WARNING if days_remaining > 7 else AlertSeverity.CRITICAL
            
            alert = Alert(
                alert_type=AlertType.EXPIRING_SOON,
                severity=severity,
                product_id=lot.product_id,
                lot_id=lot.id,
                message=f'Lote {lot.lot_number} de {lot.product.name} caduca en {days_remaining} días ({lot.expiration_date.isoformat()})'
            )
            db.session.add(alert)
            alerts_created += 1
        
        # 3. Check for low stock (products with min_stock defined)
        products_with_min_stock = Product.query.filter(
            Product.min_stock.isnot(None),
            Product.active == True
        ).all()
        
        for product in products_with_min_stock:
            # Calculate total available stock (excluding expired lots)
            total_stock = 0
            lots = Lot.query.filter_by(product_id=product.id).all()
            for lot in lots:
                if lot.is_available:  # Only count available lots
                    total_stock += lot.current_quantity
            
            if total_stock < product.min_stock:
                # Determine severity
                if total_stock == 0:
                    severity = AlertSeverity.CRITICAL
                elif total_stock < product.min_stock * 0.5:
                    severity = AlertSeverity.CRITICAL
                else:
                    severity = AlertSeverity.WARNING
                
                alert = Alert(
                    alert_type=AlertType.LOW_STOCK,
                    severity=severity,
                    product_id=product.id,
                    message=f'Stock bajo de {product.name}: {total_stock} (mínimo: {product.min_stock})'
                )
                db.session.add(alert)
                alerts_created += 1
        
        # 4. Check for blocked lots (returns, quality issues, etc.)
        blocked_lots = Lot.query.filter(
            Lot.blocked == True,
            Lot.current_quantity > 0
        ).all()
        
        for lot in blocked_lots:
            alert = Alert(
                alert_type=AlertType.BLOCKED,
                severity=AlertSeverity.CRITICAL,
                product_id=lot.product_id,
                lot_id=lot.id,
                message=f'Lote {lot.lot_number} de {lot.product.name} está bloqueado ({lot.current_quantity} {lot.unit})'
            )
            db.session.add(alert)
            alerts_created += 1
        
        db.session.commit()
        
        return jsonify({
            'message': 'Alertas generadas correctamente',
            'alerts_created': alerts_created
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al generar alertas: {str(e)}'}), 500
