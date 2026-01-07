from flask import Flask, jsonify, request
from flask_cors import CORS
from config import config
from models import db
from datetime import datetime
import os

# Import routes
from routes import products, lots, inventory, production_orders, customers, shipments, traceability, alerts, movements, receptions, returns, locations


def create_app(config_name='default'):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Register blueprints
    app.register_blueprint(products.bp)
    app.register_blueprint(lots.bp)
    app.register_blueprint(inventory.bp)
    app.register_blueprint(production_orders.bp)
    app.register_blueprint(customers.bp)
    app.register_blueprint(shipments.bp)
    app.register_blueprint(traceability.bp)
    app.register_blueprint(alerts.bp)
    app.register_blueprint(movements.bp)
    app.register_blueprint(receptions.bp)
    app.register_blueprint(returns.bp)
    app.register_blueprint(locations.bp)
    
    # Root route - serve HTML interface
    @app.route('/')
    def index():
        from flask import render_template
        return render_template('index.html')
    
    # API info route
    @app.route('/api')
    def api_info():
        return jsonify({
            'message': 'Sistema de Gestión de Almacén - API',
            'version': '1.0.0',
            'endpoints': {
                'productos': '/api/products',
                'lotes': '/api/lots',
                'inventario': '/api/inventory',
                'ordenes_produccion': '/api/production-orders',
                'clientes': '/api/customers',
                'envios': '/api/shipments',
                'trazabilidad': '/api/traceability',
                'alertas': '/api/alerts'
            }
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Recurso no encontrado'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    return app


if __name__ == '__main__':
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        print("Base de datos inicializada")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
