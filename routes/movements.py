from flask import Blueprint, jsonify
from models import StockMovement

bp = Blueprint('movements', __name__, url_prefix='/api/movements')

@bp.route('', methods=['GET'])
def get_movements():
    """Get all stock movements sorted by date descending"""
    movements = StockMovement.query.order_by(StockMovement.movement_date.desc()).all()
    return jsonify([m.to_dict(include_lot=True) for m in movements])
