// ============================================
// SISTEMA DE GESTIÓN DE ALMACÉN - JavaScript
// ============================================

const API_BASE = '/api';

// ========== State Management ==========
const app = {
    currentView: 'dashboard',
    data: {
        products: [],
        lots: [],
        customers: [],
        alerts: []
    }
};

// ========== API Client ==========
const api = {
    async get(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en la solicitud');
        }
        return await response.json();
    },

    async put(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en la solicitud');
        }
        return await response.json();
    },

    async delete(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }
};

// ========== Utility Functions ==========
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge badge-success">Activo</span>',
        'expired': '<span class="badge badge-danger">Caducado</span>',
        'depleted': '<span class="badge badge-gray">Agotado</span>',
        'draft': '<span class="badge badge-info">Borrador</span>',
        'in_progress': '<span class="badge badge-warning">En Progreso</span>',
        'closed': '<span class="badge badge-success">Cerrada</span>',
        'blocked': '<span class="badge badge-danger">Bloqueado</span>'
    };
    return badges[status] || status;
}

function getAvailabilityBadge(isAvailable) {
    return isAvailable
        ? '<span class="badge badge-success">Disponible</span>'
        : '<span class="badge badge-danger">No Disponible</span>';
}

function getProductTypeLabel(type) {
    const typeLabels = {
        'raw_material': 'Materia Prima',
        'packaging': 'Envases',
        'finished_product': 'Producto Acabado'
    };
    return typeLabels[type] || type;
}

function formatQuantity(quantity, unit) {
    // Format with 3 decimals for kg and l, no decimals for g and ud
    // Always use es-ES locale: '.' for thousands, ',' for decimals
    if (unit === 'kg' || unit === 'l') {
        return Number(quantity).toLocaleString('es-ES', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
            useGrouping: true  // Ensure thousand separators
        });
    }
    // For ud and g - integer format with thousand separators
    return Math.round(quantity).toLocaleString('es-ES', {
        useGrouping: true  // Ensure thousand separators
    });
}

function showNotification(message, type = 'info') {
    // Simple alert for now - could be enhanced with toast notifications
    alert(message);
}

// ========== View Renderers ==========

function renderDashboard() {
    return `
        <div>
            <h2 style="font-size: 1.875rem; font-weight: 700; margin-bottom: 1.5rem;">Cuadro de Mandos</h2>
            
            <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 1rem;">📉 Referencias Bajo Mínimo</h3>
            <div class="stats-grid">
                <div class="stat-card" onclick="applyDashboardFilter('low_stock_raw_material')" style="cursor: pointer">
                    <div class="stat-icon">🧪</div>
                    <div class="stat-value" id="low-stock-raw-material">0</div>
                    <div class="stat-label">Materias Primas</div>
                </div>
                <div class="stat-card" onclick="applyDashboardFilter('low_stock_packaging')" style="cursor: pointer">
                    <div class="stat-icon">📦</div>
                    <div class="stat-value" id="low-stock-packaging">0</div>
                    <div class="stat-label">Envases</div>
                </div>
                <div class="stat-card" onclick="applyDashboardFilter('low_stock_finished')" style="cursor: pointer">
                    <div class="stat-icon">🏷️</div>
                    <div class="stat-value" id="low-stock-finished">0</div>
                    <div class="stat-label">Producto Acabado</div>
                </div>
            </div>
            
            <h3 style="font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 1rem;">⏳ Lotes Caducan < 3 Meses</h3>
            <div class="stats-grid">
                <div class="stat-card" onclick="applyDashboardFilter('expiring_soon_raw_material')" style="cursor: pointer">
                    <div class="stat-icon">🧪</div>
                    <div class="stat-value" id="expiring-raw-material" style="color: var(--warning-500);">0</div>
                    <div class="stat-label">Materias Primas</div>
                </div>
                <div class="stat-card" onclick="applyDashboardFilter('expiring_soon_packaging')" style="cursor: pointer">
                    <div class="stat-icon">📦</div>
                    <div class="stat-value" id="expiring-packaging" style="color: var(--warning-500);">0</div>
                    <div class="stat-label">Envases</div>
                </div>
                <div class="stat-card" onclick="applyDashboardFilter('expiring_soon_finished')" style="cursor: pointer">
                    <div class="stat-icon">🏷️</div>
                    <div class="stat-value" id="expiring-finished" style="color: var(--warning-500);">0</div>
                    <div class="stat-label">Producto Acabado</div>
                </div>
            </div>
            
            <h3 style="font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 1rem;">🚫 Lotes Caducados</h3>
            <div class="stats-grid">
                <div class="stat-card" onclick="applyDashboardFilter('expired_raw_material')" style="cursor: pointer">
                    <div class="stat-icon">🧪</div>
                    <div class="stat-value" id="expired-raw-material" style="color: var(--danger-500);">0</div>
                    <div class="stat-label">Materias Primas</div>
                </div>
                <div class="stat-card" onclick="applyDashboardFilter('expired_packaging')" style="cursor: pointer">
                    <div class="stat-icon">📦</div>
                    <div class="stat-value" id="expired-packaging" style="color: var(--danger-500);">0</div>
                    <div class="stat-label">Envases</div>
                </div>
                <div class="stat-card" onclick="applyDashboardFilter('expired_finished')" style="cursor: pointer">
                    <div class="stat-icon">🏷️</div>
                    <div class="stat-value" id="expired-finished" style="color: var(--danger-500);">0</div>
                    <div class="stat-label">Producto Acabado</div>
                </div>
            </div>
            
            <h3 style="font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 1rem;">🔒 Lotes Bloqueados</h3>
            <div class="stats-grid">
                <div class="stat-card" onclick="applyDashboardFilter('blocked_raw_material')" style="cursor: pointer">
                    <div class="stat-icon">🧪</div>
                    <div class="stat-value" id="blocked-raw-material" style="color: var(--warning-500);">0</div>
                    <div class="stat-label">Materias Primas</div>
                </div>
                <div class="stat-card" onclick="applyDashboardFilter('blocked_packaging')" style="cursor: pointer">
                    <div class="stat-icon">📦</div>
                    <div class="stat-value" id="blocked-packaging" style="color: var(--warning-500);">0</div>
                    <div class="stat-label">Envases</div>
                </div>
                <div class="stat-card" onclick="applyDashboardFilter('blocked_finished')" style="cursor: pointer">
                    <div class="stat-icon">🏷️</div>
                    <div class="stat-value" id="blocked-finished" style="color: var(--warning-500);">0</div>
                    <div class="stat-label">Producto Acabado</div>
                </div>
            </div>
            
            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">Alertas Activas</h3>
                    <button class="btn btn-primary btn-sm" onclick="generateAlerts()">Generar Alertas</button>
                </div>
                <div class="card-body">
                    <div id="alerts-list"></div>
                </div>
            </div>
        </div>
    `;
}

function renderProducts() {
    return `
        <div>
            <div class="flex items-center justify-between mb-4">
                <h2 style="font-size: 1.875rem; font-weight: 700;">Maestro de Productos</h2>
                <button class="btn btn-primary" onclick="showProductModal()">+ Nuevo Producto</button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="filters">
                        <div class="search-bar" style="flex: 1; max-width: 400px;">
                            <span class="search-icon">🔍</span>
                            <input type="text" id="product-search" class="form-input search-input" placeholder="Buscar por código o nombre...">
                        </div>
                        
                        <select id="product-type-filter" class="form-select" style="width: 200px;">
                            <option value="">Todos los tipos</option>
                            <option value="raw_material">Materias Primas</option>
                            <option value="packaging">Envases</option>
                            <option value="finished_product">Productos Acabados</option>
                        </select>
                    </div>
                    
                    <div id="products-table"></div>
                </div>
            </div>
        </div>
    `;
}

function renderLots() {
    return `
        <div>
            <div class="flex items-center justify-between mb-4">
                <h2 style="font-size: 1.875rem; font-weight: 700;">Gestión de Lotes</h2>
                <button class="btn btn-primary" onclick="showLotModal()">+ Registrar Lote</button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="filters" style="margin-bottom: 1rem;">
                        <input type="text" id="lot-search" class="form-input" placeholder="Buscar por lote, código o nombre de artículo..." style="max-width: 500px; width: 100%;" oninput="loadLots()">
                    </div>
                    <div id="lots-table"></div>
                </div>
            </div>
        </div>
    `;
}


function renderMovements() {
    return `
        <div>
            <h2 style="font-size: 1.875rem; font-weight: 700; margin-bottom: 1.5rem;">Movimientos de Stock</h2>
            
            <div class="card">
                <div class="card-body">
                    <div class="flex flex-wrap gap-4 mb-4" style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="flex: 1; min-width: 200px; margin: 0;">
                            <label class="form-label" style="font-size: 0.875rem;">Producto</label>
                            <select id="movements-product-filter" class="form-select" onchange="loadAllMovements()">
                                <option value="">Todos los productos</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 150px; margin: 0;">
                            <label class="form-label" style="font-size: 0.875rem;">Lote</label>
                            <input type="text" id="movements-lot-filter" class="form-input" placeholder="Buscar lote..." oninput="loadAllMovements()">
                        </div>
                        <div class="form-group" style="flex: 1; min-width: 150px; margin: 0;">
                            <label class="form-label" style="font-size: 0.875rem;">Tipo</label>
                            <select id="movements-type-filter" class="form-select" onchange="loadAllMovements()">
                                <option value="">Todos los tipos</option>
                                <option value="entry">Entrada</option>
                                <option value="shipment">Expedición</option>
                                <option value="production">Producción</option>
                                <option value="adjustment">Ajuste</option>
                            </select>
                        </div>
                    </div>
                    <div id="movements-table-container">
                        <p class="text-center" style="color: var(--gray-500); padding: 2rem;">Cargando movimientos...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderReceptions() {
    return `
        <div>
            <div class="flex items-center justify-between mb-4">
                <h2 style="font-size: 1.875rem; font-weight: 700;">Recepción de Productos</h2>
                <button class="btn btn-primary" onclick="showReceptionModal()">+ Nueva Recepción</button>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recepciones Recientes</h3>
                </div>
                <div class="card-body">
                    <div id="receptions-table">
                        <p class="text-center" style="color: var(--gray-500); padding: 2rem;">Cargando recepciones...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadReceptions() {
    try {
        const receptions = await api.get('/receptions');
        const tableContainer = document.getElementById('receptions-table');

        if (receptions.length === 0) {
            tableContainer.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No hay recepciones registradas</p>';
            return;
        }

        const html = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Producto</th>
                            <th>Tipo</th>
                            <th>Lote</th>
                            <th>Cantidad</th>
                            <th>Estado</th>
                            <th>Proveedor</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${receptions.map(r => `
                            <tr>
                                <td>${formatDate(r.manufacturing_date)}</td>
                                <td style="font-weight: 500;">${r.product?.name || '-'}</td>
                                <td>${getProductTypeLabel(r.product?.type)}</td>
                                <td style="font-family: monospace;">${r.lot_number}</td>
                                <td>${formatQuantity(r.current_quantity, r.unit)} ${r.unit}</td>
                                <td>${r.blocked ? '<span class="badge badge-danger">Bloqueado</span>' : '<span class="badge badge-success">Liberado</span>'}</td>
                                <td>${r.supplier || '-'}</td>
                                <td>
                                    <button class="btn btn-sm" style="background: transparent; border: none; color: var(--gray-400); padding: 6px; border-radius: 6px; transition: all 0.2s ease;" 
                                            onmouseover="this.style.background='#fee2e2'; this.style.color='#dc2626';" 
                                            onmouseout="this.style.background='transparent'; this.style.color='var(--gray-400)';" 
                                            onclick="deleteLot(${r.id})" title="Eliminar">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        tableContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading receptions:', error);
        document.getElementById('receptions-table').innerHTML =
            `<p class="text-center" style="color: var(--danger-500); padding: 2rem;">Error al cargar recepciones: ${error.message}</p>`;
    }
}

function extractSupplier(notes) {
    if (!notes) return '-';
    const match = notes.match(/Recepción de ([^.]+)/);
    return match ? match[1] : '-';
}

// ========== Returns (Devoluciones) ==========

function renderReturns() {
    return `
        <div>
            <div class="flex items-center justify-between mb-4">
                <h2 style="font-size: 1.875rem; font-weight: 700;">Devoluciones / Retiradas</h2>
                <button class="btn btn-primary" onclick="showReturnModal()">+ Nueva Devolución</button>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Devoluciones Registradas</h3>
                </div>
                <div class="card-body">
                    <div id="returns-table">
                        <p class="text-center" style="color: var(--gray-500); padding: 2rem;">Cargando devoluciones...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadReturns() {
    try {
        const returns = await api.get('/returns');
        const tableContainer = document.getElementById('returns-table');

        if (returns.length === 0) {
            tableContainer.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No hay devoluciones registradas</p>';
            return;
        }

        const html = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Nº Devolución</th>
                            <th>Cliente</th>
                            <th>Motivo</th>
                            <th>Productos</th>
                            <th>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${returns.map(r => `
                            <tr>
                                <td>${formatDate(r.return_date)}</td>
                                <td style="font-family: monospace; font-weight: 500;">${r.return_number}</td>
                                <td>${r.customer?.name || 'Devolución interna'}</td>
                                <td>${getReasonLabel(r.reason)}</td>
                                <td>
                                    ${r.details && r.details.length > 0
                ? r.details.map(d => `
                                            <div style="font-size: 0.875rem;">
                                                ${d.lot?.product?.name || '-'} - Lote: ${d.lot?.lot_number || '-'} (${d.quantity} ${d.unit})
                                            </div>
                                          `).join('')
                : '-'
            }
                                </td>
                                <td>${r.notes || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        tableContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading returns:', error);
        document.getElementById('returns-table').innerHTML =
            `<p class="text-center" style="color: var(--danger-500); padding: 2rem;">Error al cargar devoluciones: ${error.message}</p>`;
    }
}

function getReasonLabel(reason) {
    const reasons = {
        'customer_return': '<span class="badge badge-warning">Devolución Cliente</span>',
        'market_recall': '<span class="badge badge-danger">Retirada Mercado</span>',
        'quality_issue': '<span class="badge badge-info">Problema Calidad</span>'
    };
    return reasons[reason] || reason;
}

async function deleteLot(lotId) {
    if (!confirm('¿Está seguro de que desea eliminar este lote?')) {
        return;
    }

    try {
        await api.delete(`/lots/${lotId}`);
        showMessage('Lote eliminado correctamente');
        // Refresh the current view
        if (typeof loadReceptions === 'function') loadReceptions();
        if (typeof loadLots === 'function') loadLots();
        if (typeof loadInventory === 'function') loadInventory();
    } catch (error) {
        showMessage(error.message, 'error');
    }
}



async function loadAllMovements() {
    try {
        // Load products into dropdown if empty
        const productSelect = document.getElementById('movements-product-filter');
        if (productSelect && productSelect.options.length <= 1) {
            const products = await api.get('/products');
            products.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = `${p.code} - ${p.name}`;
                productSelect.appendChild(option);
            });
        }

        // Get filter values
        const productId = document.getElementById('movements-product-filter')?.value || '';
        const lotSearch = document.getElementById('movements-lot-filter')?.value?.toLowerCase() || '';
        const typeFilter = document.getElementById('movements-type-filter')?.value || '';

        // Load all movements
        const movements = await api.get('/movements');

        // Apply filters client-side
        const filteredMovements = movements.filter(m => {
            // Product filter
            if (productId && m.lot?.product_id != productId) return false;

            // Lot filter
            if (lotSearch && !m.lot?.lot_number?.toLowerCase().includes(lotSearch)) return false;

            // Type filter
            if (typeFilter && m.movement_type !== typeFilter) return false;

            return true;
        });

        renderMovementsTable(filteredMovements);
    } catch (error) {
        console.error('Error loading movements:', error);
        document.getElementById('movements-table-container').innerHTML =
            `<p class="text-center" style="color: var(--danger-500); padding: 2rem;">Error al cargar movimientos: ${error.message}</p>`;
    }
}

function renderMovementsTable(movements) {
    const container = document.getElementById('movements-table-container');

    if (movements.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No hay movimientos registrados</p>';
        return;
    }

    const html = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Lote</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Notas</th>
                    </tr>
                </thead>
                <tbody>
                    ${movements.map(m => `
                        <tr>
                            <td>${new Date(m.movement_date).toLocaleString('es-ES')}</td>
                            <td style="font-weight: 500;">${m.lot && m.lot.product ? m.lot.product.name : 'Desconocido'}</td>
                            <td style="font-family: monospace;">${m.lot ? m.lot.lot_number : '-'}</td>
                            <td>
                                <span class="badge ${getMovementBadgeClass(m.movement_type, m.quantity)}">
                                    ${getPaymentTypeLabel(m.movement_type, m.quantity)}
                                </span>
                            </td>
                            <td>${formatQuantity(m.quantity, m.lot ? m.lot.unit : '')} ${m.lot ? m.lot.unit : ''}</td>
                            <td>${m.notes || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

let currentInventoryTab = 'raw_material';

function renderInventory() {
    return `
        <div>
            <h2 style="font-size: 1.875rem; font-weight: 700; margin-bottom: 1.5rem;">Inventario Actual</h2>
            
            <div class="card">
                <div class="card-header" style="padding-bottom: 0;">
                    <div class="tabs">
                        <button class="tab-btn ${currentInventoryTab === 'raw_material' ? 'active' : ''}" 
                                onclick="switchInventoryTab('raw_material')">Materias Primas</button>
                        <button class="tab-btn ${currentInventoryTab === 'packaging' ? 'active' : ''}" 
                                onclick="switchInventoryTab('packaging')">Envases</button>
                        <button class="tab-btn ${currentInventoryTab === 'finished_product' ? 'active' : ''}" 
                                onclick="switchInventoryTab('finished_product')">Producto Acabado</button>
                    </div>
                </div>
                
                <div class="card-body">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="flex items-center gap-2">
                            <label for="inventory-status-filter" style="font-weight: 500;">Estado:</label>
                            <select id="inventory-status-filter" class="form-select" style="width: auto;" onchange="loadInventory()">
                                <option value="available">Solo disponibles</option>
                                <option value="all">Todos</option>
                                <option value="low_stock">Bajo Mínimo</option>
                                <option value="expiring_soon">Por Caducar (< 3 Meses)</option>
                                <option value="expired">Caducados</option>
                            </select>
                        </div>
                        <div class="search-bar" style="flex: 1; max-width: 300px; margin-left: auto;">
                            <span class="search-icon">🔍</span>
                            <input type="text" id="inventory-search" class="form-input search-input" 
                                   placeholder="Buscar por referencia, nombre o lote..." oninput="loadInventory()">
                        </div>
                    </div>
                    
                    <div id="inventory-table"></div>
                </div>
            </div>
            
        </div>
    `;
}

function switchInventoryTab(tab) {
    currentInventoryTab = tab;
    // Update local state is enough, re-rendering navigation handles active class
    navigateTo('inventory');
}

function renderCustomers() {
    return `
        <div>
            <div class="flex items-center justify-between mb-4">
                <h2 style="font-size: 1.875rem; font-weight: 700;">Clientes</h2>
                <button class="btn btn-primary" onclick="showCustomerModal()">+ Nuevo Cliente</button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div id="customers-table"></div>
                </div>
            </div>
        </div>
    `;
}

function renderTraceability() {
    return `
        <div>
            <h2 style="font-size: 1.875rem; font-weight: 700; margin-bottom: 1.5rem;">Trazabilidad</h2>
            
            <div class="card">
                <div class="card-body">
                    <p class="text-center" style="color: var(--gray-500); padding: 3rem;">
                        Sistema de trazabilidad completo.<br>
                        Funcionalidad disponible a través de la API.<br>
                        Consultar documentación para endpoints de trazabilidad.
                    </p>
                </div>
            </div>
        </div>
    `;
}

// ========== Data Loading ==========

async function loadDashboard() {
    try {
        // Auto-regenerate alerts each time dashboard loads
        await api.post('/alerts/generate', {});

        // Load alerts
        const alerts = await api.get('/alerts?is_dismissed=false');
        app.data.alerts = alerts;


        // Update badge
        const unreadCount = alerts.filter(a => !a.is_read).length;
        const badge = document.getElementById('alerts-count');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        // Load products and check which ones are below minimum - segregated by type
        const products = await api.get('/products?with_alerts=true');
        let lowStockRawMaterial = 0;
        let lowStockPackaging = 0;
        let lowStockFinished = 0;

        products.forEach(p => {
            if (p.has_low_stock_alert) {
                if (p.type === 'raw_material') lowStockRawMaterial++;
                else if (p.type === 'packaging') lowStockPackaging++;
                else if (p.type === 'finished_product') lowStockFinished++;
            }
        });

        document.getElementById('low-stock-raw-material').textContent = lowStockRawMaterial;
        document.getElementById('low-stock-packaging').textContent = lowStockPackaging;
        document.getElementById('low-stock-finished').textContent = lowStockFinished;

        // Load lots and check expiration - segregated by type
        const allLots = await api.get('/inventory?available_only=false');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);

        // Counters for expiring soon by type
        let expiringRawMaterial = 0;
        let expiringPackaging = 0;
        let expiringFinished = 0;

        // Counters for expired by type
        let expiredRawMaterial = 0;
        let expiredPackaging = 0;
        let expiredFinished = 0;

        // Counters for blocked by type
        let blockedRawMaterial = 0;
        let blockedPackaging = 0;
        let blockedFinished = 0;

        allLots.forEach(lot => {
            const productType = lot.product?.type;

            // Count blocked lots
            if (lot.blocked && lot.current_quantity > 0) {
                if (productType === 'raw_material') blockedRawMaterial++;
                else if (productType === 'packaging') blockedPackaging++;
                else if (productType === 'finished_product') blockedFinished++;
            }

            // Count expiration status
            if (lot.expiration_date && lot.current_quantity > 0) {
                const expDate = new Date(lot.expiration_date);
                expDate.setHours(0, 0, 0, 0);

                if (expDate < today) {
                    // Expired
                    if (productType === 'raw_material') expiredRawMaterial++;
                    else if (productType === 'packaging') expiredPackaging++;
                    else if (productType === 'finished_product') expiredFinished++;
                } else if (expDate <= threeMonthsFromNow) {
                    // Expiring soon
                    if (productType === 'raw_material') expiringRawMaterial++;
                    else if (productType === 'packaging') expiringPackaging++;
                    else if (productType === 'finished_product') expiringFinished++;
                }
            }
        });

        // Update expiring soon counters
        document.getElementById('expiring-raw-material').textContent = expiringRawMaterial;
        document.getElementById('expiring-packaging').textContent = expiringPackaging;
        document.getElementById('expiring-finished').textContent = expiringFinished;

        // Update expired counters
        document.getElementById('expired-raw-material').textContent = expiredRawMaterial;
        document.getElementById('expired-packaging').textContent = expiredPackaging;
        document.getElementById('expired-finished').textContent = expiredFinished;

        // Update blocked counters
        document.getElementById('blocked-raw-material').textContent = blockedRawMaterial;
        document.getElementById('blocked-packaging').textContent = blockedPackaging;
        document.getElementById('blocked-finished').textContent = blockedFinished;

        // Render alerts list
        renderAlertsList(alerts);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        const container = document.getElementById('alerts-list');
        if (container) {
            container.innerHTML = `<p class="text-center" style="color: var(--danger-500); padding: 2rem;">Error al cargar el dashboard: ${error.message}</p>`;
        }
    }
}

function renderAlertsList(alerts) {
    const container = document.getElementById('alerts-list');

    if (alerts.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No hay alertas activas</p>';
        return;
    }

    // Sort alerts: Critical alerts first
    alerts.sort((a, b) => {
        const priority = {
            'blocked': 1,
            'expired': 2,
            'expiring_soon': 3,
            'low_stock': 4
        };
        const pA = priority[a.alert_type] || 99;
        const pB = priority[b.alert_type] || 99;
        return pA - pB;
    });

    const getAlertTypeLabel = (type) => {
        const types = {
            'low_stock': 'STOCK BAJO',
            'expiring_soon': 'CADUCIDAD PRÓXIMA',
            'expired': 'CADUCADO',
            'blocked': 'LOTE BLOQUEADO'
        };
        return types[type] || type.replace('_', ' ').toUpperCase();
    };

    const rows = alerts.map(alert => {
        const typeClass = alert.severity === 'critical' ? 'badge-danger' : (alert.severity === 'warning' ? 'badge-warning' : 'badge-info');
        const productName = alert.product ? alert.product.name : (alert.lot && alert.lot.product ? alert.lot.product.name : '-');

        return `
            <tr>
                <td><span class="badge ${typeClass}">${getAlertTypeLabel(alert.alert_type)}</span></td>
                <td style="font-weight: 500;">${productName}</td>
                <td>${alert.message}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="dismissAlert(${alert.id})">Descartar</button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th style="width: 200px;">TIPO ALERTA</th>
                        <th>PRODUCTO</th>
                        <th>DESCRIPCIÓN ALERTA</th>
                        <th style="width: 100px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

async function loadProducts() {
    try {
        const search = document.getElementById('product-search').value;
        const type = document.getElementById('product-type-filter').value;

        let url = '/products?';
        if (search) url += `search=${search}&`;
        if (type) url += `type=${type}&`;

        const products = await api.get(url);
        app.data.products = products;
        renderProductsTable(products);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProductsTable(products) {
    const container = document.getElementById('products-table');

    if (products.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No se encontraron productos</p>';
        return;
    }

    const html = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Unid. Almacén</th>
                        <th>Densidad</th>
                        <th>Stock Mínimo</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td><strong>${p.code}</strong></td>
                            <td>${p.name}</td>
                            <td>${getProductTypeLabel(p.type)}</td>
                            <td>${p.storage_unit ? getUnitLabel(p.storage_unit) : '-'}</td>
                            <td>${p.density ? p.density + ' kg/l' : '-'}</td>
                            <td>${p.min_stock || '-'}</td>
                            <td>${p.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-gray">Inactivo</span>'}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick='editProduct(${JSON.stringify(p)})'>Editar</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// Helper function to edit product
function editProduct(product) {
    showProductModal(product);
}

async function loadLots() {
    try {
        const search = document.getElementById('lot-search')?.value?.toLowerCase() || '';

        // Get all lots from API
        const lots = await api.get('/lots');
        app.data.lots = lots;

        // Filter by search term (lot number, product code, or product name)
        const filteredLots = search
            ? lots.filter(lot =>
                lot.lot_number.toLowerCase().includes(search) ||
                (lot.product?.code?.toLowerCase().includes(search)) ||
                (lot.product?.name?.toLowerCase().includes(search))
            )
            : lots;

        // Group and sort lots
        const groups = groupLotsByProductForLotsView(filteredLots);
        renderLotsTable(groups);
    } catch (error) {
        console.error('Error loading lots:', error);
    }
}

function groupLotsByProductForLotsView(lots) {
    const groups = {};

    lots.forEach(lot => {
        // Handle lots without product (shouldn't happen but safe to handle)
        const prodId = lot.product_id || 'unknown';
        if (!groups[prodId]) {
            groups[prodId] = {
                product: lot.product || { name: 'Producto Desconocido', code: '???' },
                lots: []
            };
        }
        groups[prodId].lots.push(lot);
    });

    // Sort groups by product name
    const sortedGroups = Object.values(groups).sort((a, b) =>
        a.product.name.localeCompare(b.product.name)
    );

    // Sort lots within each group
    sortedGroups.forEach(group => {
        group.lots.sort((a, b) => {
            // Priority 1: Has Expiration Date vs No Expiration Date
            const aHasExp = !!a.expiration_date;
            const bHasExp = !!b.expiration_date;

            if (aHasExp && bHasExp) {
                // Both have expiration: FEFO - earliest expiration first
                return new Date(a.expiration_date) - new Date(b.expiration_date);
            }

            if (aHasExp && !bHasExp) return -1; // Expiration first
            if (!aHasExp && bHasExp) return 1;

            // Priority 2: If no expiration (packaging), FIFO - oldest first
            const dateA = new Date(a.created_at || a.manufacturing_date);
            const dateB = new Date(b.created_at || b.manufacturing_date);

            // Handle cases where dates might be invalid or missing
            if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
                return 0; // Both invalid/missing, consider equal
            }
            if (isNaN(dateA.getTime())) {
                return 1; // 'a' is invalid, 'b' comes first
            }
            if (isNaN(dateB.getTime())) {
                return -1; // 'b' is invalid, 'a' comes first
            }

            return dateA.getTime() - dateB.getTime(); // FIFO: Ascending (oldest first)
        });
    });

    return sortedGroups;
}

function renderLotsTable(groups) {
    const container = document.getElementById('lots-table');

    if (groups.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No se encontraron lotes</p>';
        return;
    }

    const html = groups.map(group => {
        const p = group.product;
        return `
            <div class="product-group">
                <div class="product-header" onclick="toggleProductGroup(this)">
                    <div style="font-weight: 600; color: var(--primary-700); font-family: monospace;">${p.code}</div>
                    <div style="font-weight: 500;">${p.name}</div>
                    <div class="text-right" style="font-size: 0.875rem; color: var(--gray-500);">
                        ${group.lots.length} Lote(s)
                    </div>
                    <div class="text-center toggle-icon">▼</div>
                </div>
                
                <div class="lots-container">
                    <div class="lot-header" style="grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 180px;">
                        <div>Número Lote</div>
                        <div>Fabricación</div>
                        <div>Caducidad</div>
                        <div>Stock Actual</div>
                        <div>Disponibilidad</div>
                        <div>Estado</div>
                        <div>Acciones</div>
                    </div>
                    ${group.lots.map(lot => `
                        <div class="lot-row" style="grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 180px;">
                            <div style="font-weight: 500; font-family: monospace;">${lot.lot_number}</div>
                            <div>${formatDate(lot.manufacturing_date)}</div>
                            <div>${formatDate(lot.expiration_date)}</div>
                            <div>${formatQuantity(lot.current_quantity, lot.unit)} ${lot.unit}</div>
                            <div>${getAvailabilityBadge(lot.is_available)}</div>
                            <div>${getStatusBadge(lot.status)}</div>
                            <div>
                                <button class="btn btn-sm btn-info" 
                                        style="padding: 0.2rem 0.5rem; font-size: 0.75rem; margin-right: 0.25rem;"
                                        onclick="showLotMovements(${lot.id})">
                                    Movimientos
                                </button>
                                <button class="btn btn-sm btn-secondary" 
                                        style="padding: 0.2rem 0.5rem; font-size: 0.75rem; margin-right: 0.25rem;"
                                        onclick="showTransferModal(${lot.id})">
                                    Transferir
                                </button>
                                <button class="btn btn-sm ${lot.blocked ? 'btn-success' : 'btn-danger'}" 
                                        style="padding: 0.2rem 0.5rem; font-size: 0.75rem;"
                                        onclick="toggleLotBlock(${lot.id})">
                                    ${lot.blocked ? 'Desbloquear' : 'Bloquear'}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

async function showLotMovements(lotId) {
    try {
        const movements = await api.get(`/lots/${lotId}/movements`);
        const lot = await api.get(`/lots/${lotId}`); // Get lot details for title

        const content = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Cantidad</th>
                            <th>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${movements.length > 0 ? movements.map(m => `
                            <tr>
                                <td>${new Date(m.movement_date).toLocaleString('es-ES')}</td>
                                <td>
                                    <span class="badge ${getMovementBadgeClass(m.movement_type, m.quantity)}">
                                        ${getPaymentTypeLabel(m.movement_type, m.quantity)}
                                    </span>
                                </td>
                                <td>${formatQuantity(m.quantity, lot.unit)} ${lot.unit}</td>
                                <td>${m.notes || '-'}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" class="text-center">No hay movimientos registrados</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        showModal(`Movimientos del Lote ${lot.lot_number}`, content);
    } catch (error) {
        console.error('Error loading movements:', error);
        alert('Error al cargar los movimientos del lote');
    }
}

function getPaymentTypeLabel(type, quantity) {
    if (type === 'production') {
        return quantity < 0 ? 'Producción (Salida)' : 'Producción (Entrada)';
    }
    if (type === 'adjustment') {
        return quantity < 0 ? 'Ajuste (Salida)' : 'Ajuste (Entrada)';
    }

    const types = {
        'entry': 'Entrada',
        'shipment': 'Expedición (Salida)',
        'return': 'Devolución (Entrada)',
        'transfer': 'Transferencia',
        'adjustment': 'Ajuste', // Fallback
        'consumption': 'Producción (Salida)' // Fallback
    };
    return types[type] || type;
}

function getMovementBadgeClass(type, quantity) {
    if (type === 'adjustment') return 'badge-danger'; // Always red as requested
    if (type === 'return') return 'badge-info'; // Blue for returns
    if (type === 'transfer') return 'badge-secondary'; // Gray for transfers
    return quantity >= 0 ? 'badge-success' : 'badge-warning';
}

async function toggleLotBlock(lotId) {
    if (!confirm('¿Estás seguro de cambiar el estado de bloqueo de este lote?')) return;

    try {
        await api.post(`/lots/${lotId}/toggle-block`);
        loadLots(); // Reload to show updated status
    } catch (error) {
        console.error('Error toggling lot block:', error);
        alert('Error al actualizar el estado del lote');
    }
}

async function showAdjustStockModal(lotId) {
    try {
        const lot = await api.get(`/lots/${lotId}`);

        const content = `
            <div class="form-group">
                <label class="form-label">Producto</label>
                <div class="form-input" style="background: var(--gray-100);">
                    ${lot.product ? lot.product.name : '-'} (${lot.product ? lot.product.code : '-'})
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Lote</label>
                <div class="form-input" style="background: var(--gray-100); font-family: monospace;">
                    ${lot.lot_number}
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Stock Actual del Sistema</label>
                    <div class="form-input" style="background: var(--gray-100); font-weight: 600;">
                        ${formatQuantity(lot.current_quantity, lot.unit)} ${lot.unit}
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Stock Real (Físico)</label>
                    <input type="number" id="adjust-quantity" class="form-input" 
                           step="0.001" min="0" value="${lot.current_quantity}">
                    <small style="color: var(--gray-500);">Ingrese la cantidad real que hay físicamente</small>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Motivo del Ajuste</label>
                <textarea id="adjust-notes" class="form-input" rows="3" placeholder="Explain the reason for adjustment..."></textarea>
            </div>
            
            <div class="text-right" style="margin-top: 1.5rem;">
                <button class="btn btn-primary" onclick="adjustStock(${lot.id})">Guardar Ajuste</button>
            </div>
        `;

        showModal('Ajuste de Inventario', content);

    } catch (error) {
        console.error('Error loading lot for adjustment:', error);
        alert('Error al cargar datos del lote');
    }
}

async function adjustStock(lotId) {
    const quantityInput = document.getElementById('adjust-quantity');
    const notesInput = document.getElementById('adjust-notes');

    if (!quantityInput.value) {
        alert('Por favor ingrese la cantidad real');
        return;
    }

    const quantity = parseFloat(quantityInput.value);
    if (quantity < 0) {
        alert('La cantidad no puede ser negativa');
        return;
    }

    if (!confirm(`¿Confirmar ajuste de stock a ${quantity}? Esta acción registrará un movimiento de ajuste.`)) return;

    try {
        await api.post(`/lots/${lotId}/adjust`, {
            real_quantity: quantity,
            notes: notesInput.value
        });

        closeModal();
        loadInventory(); // Reload inventory view
        alert('Stock ajustado correctamente');

    } catch (error) {
        console.error('Error adjusting stock:', error);
        alert('Error al realizar el ajuste: ' + error.message);
    }
}

function applyDashboardFilter(filterType) {
    window.pendingInventoryFilter = filterType;

    // Change inventory tab based on product type suffix in filter
    if (filterType.endsWith('_raw_material')) {
        currentInventoryTab = 'raw_material';
    } else if (filterType.endsWith('_packaging')) {
        currentInventoryTab = 'packaging';
    } else if (filterType.endsWith('_finished')) {
        currentInventoryTab = 'finished_product';
    }

    navigateTo('inventory');
}

async function loadInventory() {
    try {
        // Use pending filter from dashboard if available, otherwise use select value
        let statusFilter;
        if (typeof window.pendingInventoryFilter !== 'undefined' && window.pendingInventoryFilter) {
            statusFilter = window.pendingInventoryFilter;
            window.pendingInventoryFilter = null;
            // Update select to show 'all' to avoid confusion since custom filter is applied
            const statusSelect = document.getElementById('inventory-status-filter');
            if (statusSelect) {
                statusSelect.value = 'all';
            }
        } else {
            statusFilter = document.getElementById('inventory-status-filter')?.value || 'available';
        }

        const search = document.getElementById('inventory-search')?.value.toLowerCase() || '';

        // Determine if we need to fetch all lots or just available ones
        // 'available' -> true
        // 'all', 'low_stock', 'expiring_soon', 'expired' -> false (we need potentially all to filter client side, or specifically expired ones which are available)
        // Wait, 'expired' lots usually have quantity > 0, so they ARE available in DB terms? 
        // Backend `available_only=true` means `current_quantity > 0`.
        // So actually 'expired' lots ARE returned even with `available_only=true` if qty > 0.
        // But 'all' status usually implies seeing history (qty=0)? No, usually "All current stock".
        // If users want to see 0 stock lots (history), `available_only=false`.
        // Let's assume 'all' means 'all with stock + history' or just 'all with stock'?
        // Usually inventory view hides 0 stock.
        // But if I want to see "Expired", it must have stock to be relevant for "Lotes Caducados" card which counts stock > 0.
        // So `available_only=true` (qty>0) is sufficient for expired/expiring/low_stock.
        // BUT 'all' option might want 0 stock?
        // Let's stick to `available_only=false` only if 'all' is selected, or if we want to be safe.
        // Actually, logic:
        // status='available' -> available_only=true
        // status='all' -> available_only=false (show 0 stock?)
        // status='expired' -> available_only=false (just in case) logic handled client side.

        const fetchAvailableOnly = (statusFilter === 'available');
        const lots = await api.get(`/inventory?available_only=${fetchAvailableOnly ? 'true' : 'false'}`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);

        // Filter by Tab Type and Search
        const filteredLots = lots.filter(lot => {
            const matchesTab = lot.product && lot.product.type === currentInventoryTab;

            let matchesSearch = true;
            if (search) {
                matchesSearch = (
                    lot.lot_number.toLowerCase().includes(search) ||
                    (lot.product && lot.product.code.toLowerCase().includes(search)) ||
                    (lot.product && lot.product.name.toLowerCase().includes(search))
                );
            }

            let matchesStatus = true;
            if (statusFilter === 'low_stock') {
                matchesStatus = lot.product && lot.product.has_low_stock_alert;
            } else if (statusFilter === 'expiring_soon') {
                if (!lot.expiration_date) matchesStatus = false;
                else {
                    const d = new Date(lot.expiration_date);
                    d.setHours(0, 0, 0, 0);
                    matchesStatus = (d >= today && d <= threeMonthsFromNow && lot.current_quantity > 0);
                }
            } else if (statusFilter === 'expired') {
                if (!lot.expiration_date) matchesStatus = false;
                else {
                    const d = new Date(lot.expiration_date);
                    d.setHours(0, 0, 0, 0);
                    matchesStatus = (d < today && lot.current_quantity > 0);
                }
            } else if (statusFilter === 'available') {
                matchesStatus = lot.current_quantity > 0;
                // Low stock filters by type
            } else if (statusFilter === 'low_stock_raw_material') {
                matchesStatus = lot.product && lot.product.has_low_stock_alert && lot.product.type === 'raw_material';
            } else if (statusFilter === 'low_stock_packaging') {
                matchesStatus = lot.product && lot.product.has_low_stock_alert && lot.product.type === 'packaging';
            } else if (statusFilter === 'low_stock_finished') {
                matchesStatus = lot.product && lot.product.has_low_stock_alert && lot.product.type === 'finished_product';
                // Expiring soon filters by type
            } else if (statusFilter.startsWith('expiring_soon_')) {
                if (!lot.expiration_date) matchesStatus = false;
                else {
                    const d = new Date(lot.expiration_date);
                    d.setHours(0, 0, 0, 0);
                    matchesStatus = (d >= today && d <= threeMonthsFromNow && lot.current_quantity > 0);
                }
                // Expired filters by type
            } else if (statusFilter.startsWith('expired_')) {
                if (!lot.expiration_date) matchesStatus = false;
                else {
                    const d = new Date(lot.expiration_date);
                    d.setHours(0, 0, 0, 0);
                    matchesStatus = (d < today && lot.current_quantity > 0);
                }
                // Blocked filters by type
            } else if (statusFilter === 'blocked_raw_material') {
                matchesStatus = lot.blocked && lot.current_quantity > 0 && lot.product?.type === 'raw_material';
            } else if (statusFilter === 'blocked_packaging') {
                matchesStatus = lot.blocked && lot.current_quantity > 0 && lot.product?.type === 'packaging';
            } else if (statusFilter === 'blocked_finished') {
                matchesStatus = lot.blocked && lot.current_quantity > 0 && lot.product?.type === 'finished_product';
            }

            return matchesTab && matchesSearch && matchesStatus;
        });

        const groups = groupLotsByProduct(filteredLots);
        renderInventoryGroups(groups);

    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function groupLotsByProduct(lots) {
    const groups = {};

    lots.forEach(lot => {
        const prodId = lot.product_id;
        if (!groups[prodId]) {
            groups[prodId] = {
                product: lot.product,
                lots: [],
                totalStock: 0,
                unit: lot.unit
            };
        }
        groups[prodId].lots.push(lot);
        groups[prodId].totalStock += lot.current_quantity;
    });

    return Object.values(groups).sort((a, b) => a.product.name.localeCompare(b.product.name));
}

function toggleProductGroup(element) {
    element.closest('.product-group').classList.toggle('expanded');
}

function renderInventoryGroups(groups) {
    const container = document.getElementById('inventory-table');

    if (groups.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No hay productos en esta categoría</p>';
        return;
    }

    const html = groups.map(group => {
        const p = group.product;

        // Expand lots by location - one row per location
        const lotRows = [];
        group.lots.forEach(lot => {
            if (lot.locations && lot.locations.length > 0) {
                // Create one row per location
                lot.locations.forEach(ll => {
                    if (ll.quantity > 0) {
                        lotRows.push({
                            lot: lot,
                            location: ll.location,
                            quantity: ll.quantity
                        });
                    }
                });
            } else {
                // No location info - show as single row
                lotRows.push({
                    lot: lot,
                    location: null,
                    quantity: lot.current_quantity
                });
            }
        });

        return `
            <div class="product-group">
                <div class="product-header" onclick="toggleProductGroup(this)">
                    <div style="font-weight: 600; color: var(--primary-700); font-family: monospace;">${p.code}</div>
                    <div style="font-weight: 500;">${p.name}</div>
                    <div class="text-right" style="font-weight: 600;">${formatQuantity(group.totalStock, group.unit)} ${group.unit}</div>
                    <div class="text-right" style="font-size: 0.875rem; color: var(--gray-500);">
                        ${lotRows.length} Registro(s)
                    </div>
                    <div class="text-center toggle-icon">▼</div>
                </div>
                
                <div class="lots-container">
                    <div class="lot-header" style="grid-template-columns: 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 180px;">
                        <div>Lote</div>
                        <div>Caducidad</div>
                        <div>Ubicación</div>
                        <div>Cantidad</div>
                        <div>Estado</div>
                        <div>Disponible</div>
                        <div>Acciones</div>
                    </div>
                    ${lotRows.map(row => {
            const lot = row.lot;
            const locCode = row.location?.code || '-';
            const locName = row.location?.name || 'Sin ubicación';
            const isAvailable = row.location?.is_available || false;
            return `
                        <div class="lot-row" style="grid-template-columns: 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 180px;">
                            <div style="font-weight: 500; font-family: monospace;">${lot.lot_number}</div>
                            <div>${formatDate(lot.expiration_date)}</div>
                            <div><span class="badge ${isAvailable ? 'badge-success' : 'badge-gray'}" title="${locName}">${locCode}</span></div>
                            <div>${formatQuantity(row.quantity, lot.unit)} ${lot.unit}</div>
                            <div>${getStatusBadge(lot.status)}</div>
                            <div>${getAvailabilityBadge(lot.is_available)}</div>
                            <div>
                                <button class="btn btn-sm btn-secondary" 
                                        style="padding: 0.2rem 0.4rem; font-size: 0.7rem; margin-right: 2px;"
                                        onclick="showTransferModal(${lot.id})">
                                    📦 Transferir
                                </button>
                                <button class="btn btn-sm btn-warning" 
                                        style="padding: 0.2rem 0.4rem; font-size: 0.7rem;"
                                        onclick="showAdjustStockModal(${lot.id})">
                                    Ajustar
                                </button>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

async function loadCustomers() {
    try {
        const customers = await api.get('/customers');
        app.data.customers = customers;
        renderCustomersTable(customers);
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

function renderCustomersTable(customers) {
    const container = document.getElementById('customers-table');

    if (customers.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No hay clientes registrados</p>';
        return;
    }

    const html = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Dirección</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${customers.map(c => `
                        <tr>
                            <td><strong>${c.code}</strong></td>
                            <td>${c.name}</td>
                            <td>${c.email || '-'}</td>
                            <td>${c.phone || '-'}</td>
                            <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.address || ''}">${c.address || '-'}</td>
                            <td>${c.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-gray">Inactivo</span>'}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick='showCustomerModal(${JSON.stringify(c)})'>Editar</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// ========== Actions ==========

async function generateAlerts() {
    try {
        await api.post('/alerts/generate', {});
        showNotification('Alertas generadas correctamente', 'success');
        if (app.currentView === 'dashboard') {
            await loadDashboard();
        }
    } catch (error) {
        console.error('Error generating alerts:', error);
        showNotification('Error al generar alertas', 'error');
    }
}

async function dismissAlert(alertId) {
    try {
        await api.put(`/alerts/${alertId}/dismiss`, {});
        await loadDashboard();
    } catch (error) {
        console.error('Error dismissing alert:', error);
    }
}

// Modal placeholders
// Modals are implemented in forms.js

// ========== Navigation ==========

function navigateTo(view) {
    app.currentView = view;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === view) {
            item.classList.add('active');
        }
    });

    // Render view
    const content = document.getElementById('app-content');

    switch (view) {
        case 'dashboard':
            content.innerHTML = renderDashboard();
            loadDashboard();
            break;
        case 'products':
            content.innerHTML = renderProducts();
            loadProducts();
            // Add event listeners
            setTimeout(() => {
                document.getElementById('product-search').addEventListener('input', loadProducts);
                document.getElementById('product-type-filter').addEventListener('change', loadProducts);
                // Initialize searchable select
                if (typeof initSearchableSelect === 'function') {
                    initSearchableSelect('product-type-filter');
                }
            }, 0);
            break;
        case 'lots':
            content.innerHTML = renderLots();
            loadLots();
            setTimeout(() => {
                document.getElementById('lot-search').addEventListener('input', loadLots);
            }, 0);
            break;
        case 'receptions':
            content.innerHTML = renderReceptions();
            loadReceptions();
            break;
        case 'inventory':
            content.innerHTML = renderInventory();
            loadInventory();
            setTimeout(() => {
                const statusFilter = document.getElementById('inventory-status-filter');
                if (statusFilter) {
                    // Initialize searchable select for inventory status filter
                    if (typeof initSearchableSelect === 'function') {
                        initSearchableSelect('inventory-status-filter');
                    }
                }
            }, 0);
            break;
        case 'production':
            content.innerHTML = renderProduction();
            loadProductionOrders();
            break;
        case 'customers':
            content.innerHTML = renderCustomers();
            loadCustomers();
            break;
        case 'shipments':
            content.innerHTML = renderShipments();
            loadShipments();
            break;
        case 'traceability':
            content.innerHTML = renderTraceability();
            loadTraceabilityView();
            break;
        case 'movements':
            content.innerHTML = renderMovements();
            loadAllMovements();
            break;
        case 'returns':
            content.innerHTML = renderReturns();
            loadReturns();
            break;
        default:
            content.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <p class="text-center" style="color: var(--gray-500); padding: 3rem;">
                            Vista en desarrollo.<br>
                            Funcionalidad disponible a través de la API.
                        </p>
                    </div>
                </div>
            `;
    }
}

// ========== Initialization ==========

document.addEventListener('DOMContentLoaded', () => {
    // Set up navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.view);
        });
    });

    // Load initial view
    navigateTo('dashboard');
});

// ========== Production Orders ==========

function renderProduction() {
    return `
        <div>
            <div class="flex items-center justify-between mb-4">
                <h2 style="font-size: 1.875rem; font-weight: 700;">Órdenes de Fabricación</h2>
                <button class="btn btn-primary" onclick="showProductionOrderModal()">+ Nueva Orden</button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div id="production-orders-table"></div>
                </div>
            </div>
        </div>
    `;
}

async function loadProductionOrders() {
    try {
        const orders = await api.get('/production-orders');
        renderProductionOrdersTable(orders);
    } catch (error) {
        console.error('Error loading production orders:', error);
        const container = document.getElementById('production-orders-table');
        if (container) {
            container.innerHTML = `<p class="text-center" style="color: var(--danger-500); padding: 2rem;">Error al cargar órdenes: ${error.message}</p>`;
        }
    }
}

function renderProductionOrdersTable(orders) {
    const container = document.getElementById('production-orders-table');

    if (orders.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No hay órdenes de fabricación</p>';
        return;
    }

    const html = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Número Orden</th>
                        <th>Producto Base</th>
                        <th>Lote Base</th>
                        <th>Fecha Fabricación</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(o => `
                        <tr>
                            <td><strong>${o.order_number}</strong></td>
                            <td>${o.base_product_name || '-'}</td>
                            <td>${o.base_lot_number || '-'}</td>
                            <td>${formatDate(o.production_date)}</td>
                            <td>${getStatusBadge(o.status)}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick="showOrderDetails(${o.id})">Detalles</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

function renderShipments() {
    return `
        <div>
            <h2 style="font-size: 1.875rem; font-weight: 700; margin-bottom: 1.5rem;">Expediciones</h2>
            
            <div class="card">
                <div class="card-body">
                    <p class="text-center" style="color: var(--gray-500); padding: 3rem;">
                        Módulo de expediciones.<br>
                        Funcionalidad disponible a través de la API.
                    </p>
                </div>
            </div>
        </div>
`;
}
