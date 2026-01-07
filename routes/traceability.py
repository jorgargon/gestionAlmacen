from flask import Blueprint, request, jsonify
from models import (db, Lot, ProductionOrder, ProductionOrderMaterial, Shipment, ShipmentDetail,
                    Product, ProductType, Customer, ProductionOrderFinishedProduct, StockMovement, MovementType,
                    Return, ReturnDetail)

bp = Blueprint('traceability', __name__, url_prefix='/api/traceability')


@bp.route('/lot/<int:lot_id>', methods=['GET'])
def trace_lot_forward(lot_id):
    """
    Forward traceability: Given a lot of finished product, find which customers received it
    """
    lot = Lot.query.get_or_404(lot_id)
    
    # Get all shipments containing this lot
    shipment_details = ShipmentDetail.query.filter_by(lot_id=lot_id).all()
    
    customers = []
    for detail in shipment_details:
        shipment = detail.shipment
        customers.append({
            'shipment_date': shipment.shipment_date.isoformat(),
            'shipment_number': shipment.shipment_number,
            'customer': shipment.customer.to_dict(),
            'quantity': detail.quantity,
            'unit': detail.unit
        })

    # Find production info (backward traceability for this lot)
    production_info = None
    
    # 1. Try finding via specific lot_id link (new format)
    fp_record = ProductionOrderFinishedProduct.query.filter_by(lot_id=lot_id).first()
    
    if fp_record:
        order = fp_record.production_order
    else:
        # 2. Try legacy lookup (single product per order) or fallback if lot_id link missing
        # We need to find an order that produced this product + lot number
        order = ProductionOrder.query.filter_by(
            finished_product_id=lot.product_id,
            finished_lot_number=lot.lot_number
        ).first()
        
        if not order:
             # 3. New format fallback: check if any FP record matches product+lot (but lot_id might be null or drift)
            fp_record = ProductionOrderFinishedProduct.query.filter_by(
                finished_product_id=lot.product_id,
                lot_number=lot.lot_number
            ).first()
            if fp_record:
                order = fp_record.production_order

    if order:
        # Filter materials: include shared (None) or specific to this finished product
        filtered_materials = []
        target_fp_id = fp_record.id if fp_record else None
        
        for m in order.materials:
            if m.related_finished_product_id is None:
                # Common material (e.g. bulk)
                filtered_materials.append(m)
            elif target_fp_id and m.related_finished_product_id == target_fp_id:
                # Specific material for this finished product
                filtered_materials.append(m)
        
        production_info = {
            'order_number': order.order_number,
            'production_date': order.production_date.isoformat(),
            'materials': [m.to_dict() for m in filtered_materials]
        }
    
    # Get adjustments for this lot
    adjustments = StockMovement.query.filter_by(
        lot_id=lot.id, 
        movement_type=MovementType.ADJUSTMENT
    ).order_by(StockMovement.movement_date.desc()).all()
    
    # Get returns for this lot
    return_details = ReturnDetail.query.filter_by(lot_id=lot_id).all()
    
    returns = []
    for detail in return_details:
        return_record = detail.return_record
        reason_labels = {
            'customer_return': 'Devolución Cliente',
            'market_recall': 'Retirada Mercado',
            'quality_issue': 'Problema de Calidad'
        }
        returns.append({
            'return_date': return_record.return_date.isoformat(),
            'return_number': return_record.return_number,
            'reason': return_record.reason,
            'reason_label': reason_labels.get(return_record.reason, return_record.reason),
            'customer': return_record.customer.to_dict() if return_record.customer else None,
            'quantity': detail.quantity,
            'unit': detail.unit,
            'notes': return_record.notes
        })

    return jsonify({
        'lot': lot.to_dict(include_product=True),
        'produced_from': production_info,
        'customers': customers,
        'returns': returns,
        'adjustments': [m.to_dict() for m in adjustments]
    })


@bp.route('/lot/<int:lot_id>/reverse', methods=['GET'])
def trace_lot_reverse(lot_id):
    """
    Reverse traceability: Given a lot of raw material/packaging, find which finished products used it
    Also shows which customers received those finished products
    """
    lot = Lot.query.get_or_404(lot_id)
    
    # Get all production orders that used this lot
    materials = ProductionOrderMaterial.query.filter_by(lot_id=lot_id).all()
    
    results = []
    for material in materials:
        production_order = material.production_order
        
        # Find the finished lot(s) created by this production order
        finished_lots = []
        
        # 1. Check legacy fields (single product)
        if production_order.finished_product_id and production_order.finished_lot_number:
            legacy_lot = Lot.query.filter_by(
                product_id=production_order.finished_product_id,
                lot_number=production_order.finished_lot_number
            ).first()
            if legacy_lot:
                finished_lots.append(legacy_lot)
        
        # 2. Check new fields (multiple products)
        if production_order.finished_products:
            for fp in production_order.finished_products:
                if fp.lot_id:
                    # If we have the direct link to the lot
                    lot_obj = Lot.query.get(fp.lot_id)
                    if lot_obj:
                        finished_lots.append(lot_obj)
                else:
                    # Fallback lookup by number and product
                    lot_obj = Lot.query.filter_by(
                        product_id=fp.finished_product_id,
                        lot_number=fp.lot_number
                    ).first()
                    if lot_obj:
                        finished_lots.append(lot_obj)
        
        # Deduplicate lots by ID
        unique_lots = {l.id: l for l in finished_lots}.values()

        # Find customers who received these finished lots
        for finished_lot in unique_lots:
            customers = []
            shipment_details = ShipmentDetail.query.filter_by(lot_id=finished_lot.id).all()
            for detail in shipment_details:
                shipment = detail.shipment
                customers.append({
                    'shipment_date': shipment.shipment_date.isoformat(),
                    'shipment_number': shipment.shipment_number,
                    'customer': shipment.customer.to_dict(),
                    'quantity': detail.quantity,
                    'unit': detail.unit
                })
            
            # Append a result entry for each finished lot found
            results.append({
                'production_order': production_order.to_dict(),
                'quantity_consumed': material.quantity_consumed,
                'unit': material.unit,
                'finished_lot': finished_lot.to_dict(include_product=True),
                'customers': customers
            })
    
    # Get adjustments for this lot
    adjustments = StockMovement.query.filter_by(
        lot_id=lot.id, 
        movement_type=MovementType.ADJUSTMENT
    ).order_by(StockMovement.movement_date.desc()).all()

    return jsonify({
        'lot': lot.to_dict(include_product=True),
        'used_in_production': results,
        'adjustments': [m.to_dict() for m in adjustments]
    })


@bp.route('/product/<int:product_id>/lot/<lot_number>', methods=['GET'])
def trace_product_lot(product_id, lot_number):
    """Traceability by product and lot number"""
    product = Product.query.get_or_404(product_id)
    
    lot = Lot.query.filter_by(
        product_id=product_id,
        lot_number=lot_number
    ).first_or_404()
    
    # Determine traceability direction based on product type
    if product.type == ProductType.FINISHED_PRODUCT:
        # Forward: finished product -> customers
        return trace_lot_forward(lot.id)
    else:
        # Reverse: raw material/packaging -> finished products -> customers
        return trace_lot_reverse(lot.id)


@bp.route('/customer/<int:customer_id>', methods=['GET'])
def trace_customer(customer_id):
    """Get all lots received by a customer"""
    customer = Customer.query.get_or_404(customer_id)
    
    shipments = Shipment.query.filter_by(customer_id=customer_id).order_by(Shipment.shipment_date.desc()).all()
    
    results = []
    for shipment in shipments:
        for detail in shipment.details:
            lot = detail.lot
            results.append({
                'shipment_date': shipment.shipment_date.isoformat(),
                'shipment_number': shipment.shipment_number,
                'product': lot.product.to_dict(),
                'lot_number': lot.lot_number,
                'manufacturing_date': lot.manufacturing_date.isoformat(),
                'expiration_date': lot.expiration_date.isoformat() if lot.expiration_date else None,
                'quantity': detail.quantity,
                'unit': detail.unit
            })
    
    return jsonify({
        'customer': customer.to_dict(),
        'lots_received': results
    })
