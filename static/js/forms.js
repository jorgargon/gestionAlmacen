// ============================================
// FORMS AND MODALS - JavaScript
// ============================================

// ========== Unit Configuration ==========

const UNITS = {
    'kg': 'Kilogramos (kg)',
    'g': 'Gramos (g)',
    'l': 'Litros (l)',
    'ud': 'Unidades (ud)'
};

function getUnitSelector(id, selectedValue = '', required = false) {
    const options = Object.entries(UNITS).map(([value, label]) =>
        `<option value="${value}" ${selectedValue === value ? 'selected' : ''}>${label}</option>`
    ).join('');

    return `
        <select id="${id}" class="form-select" ${required ? 'required' : ''}>
            <option value="">Seleccionar unidad...</option>
            ${options}
        </select>
    `;
}

function getUnitLabel(unit) {
    return UNITS[unit] || unit;
}

// Helper function to initialize Choices.js on a select element
function initSearchableSelect(selectId, options = {}) {
    const select = document.getElementById(selectId);
    if (!select || typeof Choices === 'undefined') return null;

    // Check if already initialized
    if (select.choicesInstance) {
        return select.choicesInstance;
    }

    const defaultOptions = {
        searchEnabled: true,
        searchPlaceholderValue: 'Buscar...',
        itemSelectText: '',
        noResultsText: 'Sin resultados',
        noChoicesText: 'Sin opciones',
        shouldSort: false,
        searchResultLimit: 50,
        ...options
    };

    const choicesInstance = new Choices(select, defaultOptions);
    select.choicesInstance = choicesInstance;
    return choicesInstance;
}

// Helper function to initialize Choices.js after a delay (for dynamically created elements)
function initSearchableSelectDelayed(selectId, options = {}, delay = 50) {
    setTimeout(() => {
        initSearchableSelect(selectId, options);
    }, delay);
}

// ========== Modal Management ==========

function showModal(title, content, onSave, saveButtonText = 'Guardar') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button class="btn btn-primary" id="modal-save-btn">${saveButtonText}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Save button handler
    document.getElementById('modal-save-btn').addEventListener('click', onSave);
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showMessage(message, type = 'success') {
    const className = type === 'success' ? 'success-message' : 'error-message';
    const messageDiv = document.createElement('div');
    messageDiv.className = className;
    messageDiv.textContent = message;

    // Style to appear fixed at top with high z-index (above modals)
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10002;
        min-width: 300px;
        max-width: 600px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease-out;
    `;

    // Add animation keyframes if not already present
    if (!document.getElementById('message-animations')) {
        const style = document.createElement('style');
        style.id = 'message-animations';
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(messageDiv);

    setTimeout(() => messageDiv.remove(), 5000);
}

// ========== Product Forms ==========

function showProductModal(product = null) {
    const isEdit = product !== null;
    const title = isEdit ? 'Editar Producto' : 'Nuevo Producto';

    const content = `
        <div class="form-group">
            <label class="form-label">Código *</label>
            <input type="text" id="product-code" class="form-input" value="${product?.code || ''}" required>
        </div>
        
        <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input type="text" id="product-name" class="form-input" value="${product?.name || ''}" required>
        </div>
        
        <div class="form-group">
            <label class="form-label">Tipo *</label>
            <select id="product-type" class="form-select" required>
                <option value="">Seleccionar...</option>
                <option value="raw_material" ${product?.type === 'raw_material' ? 'selected' : ''}>Materia Prima</option>
                <option value="packaging" ${product?.type === 'packaging' ? 'selected' : ''}>Envase</option>
                <option value="finished_product" ${product?.type === 'finished_product' ? 'selected' : ''}>Producto Acabado</option>
            </select>
        </div>
        
        <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea id="product-description" class="form-textarea" rows="2">${product?.description || ''}</textarea>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Stock Mínimo</label>
                <input type="number" id="product-min-stock" class="form-input" step="0.01" value="${product?.min_stock || ''}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Unidad Almacenaje</label>
                ${getUnitSelector('product-storage-unit', product?.storage_unit || '')}
            </div>
            
            <div class="form-group">
                <label class="form-label">Unidad Consumo</label>
                ${getUnitSelector('product-consumption-unit', product?.consumption_unit || '')}
            </div>
        </div>
        
        <div class="form-group">
            <label class="form-label">Densidad (kg/L)</label>
            <input type="number" id="product-density" class="form-input" step="0.001" value="${product?.density || ''}" placeholder="Solo para conversión L/kg">
        </div>
        
        ${isEdit ? `
        <div class="form-group" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--gray-200);">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="product-active" ${product?.active !== false ? 'checked' : ''}>
                <span>Producto Activo</span>
            </label>
            <small style="color: var(--gray-500); display: block; margin-top: 0.25rem;">
                Los productos inactivos no aparecen en los selectores de formularios
            </small>
        </div>
        ` : ''}
    `;

    showModal(title, content, async () => {
        const data = {
            code: document.getElementById('product-code').value,
            name: document.getElementById('product-name').value,
            type: document.getElementById('product-type').value,
            description: document.getElementById('product-description').value,
            min_stock: parseFloat(document.getElementById('product-min-stock').value) || null,
            storage_unit: document.getElementById('product-storage-unit').value,
            consumption_unit: document.getElementById('product-consumption-unit').value,
            density: parseFloat(document.getElementById('product-density').value) || null
        };

        // Add active field only when editing
        if (isEdit) {
            data.active = document.getElementById('product-active').checked;
        }

        try {
            if (isEdit) {
                await api.put(`/products/${product.id}`, data);
                showMessage('Producto actualizado correctamente');
            } else {
                await api.post('/products', data);
                showMessage('Producto creado correctamente');
            }
            closeModal();
            loadProducts();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    // Initialize searchable selects
    initSearchableSelectDelayed('product-type');
    initSearchableSelectDelayed('product-storage-unit');
    initSearchableSelectDelayed('product-consumption-unit');
}

// ========== Production Order Forms ==========

let orderFinishedProducts = [];

async function showProductionOrderModal(order = null) {
    orderFinishedProducts = [];

    try {
        const [products, nextNumberData] = await Promise.all([
            api.get('/products?type=finished_product'),
            !order ? api.get('/production-orders/next-number') : Promise.resolve(null)
        ]);

        const productOptions = products.map(p =>
            `<option value="${p.id}">${p.code} - ${p.name}</option>`
        ).join('');

        const nextOrderNumber = order ? order.order_number : (nextNumberData ? nextNumberData.next_number : '');

        const content = `
            <div class="form-group">
                <label class="form-label">Número de Orden *</label>
                <input type="text" id="order-number" class="form-input" value="${nextOrderNumber}" ${!order ? 'readonly' : 'readonly'} style="background-color: var(--gray-100);" required>
                ${!order ? '<small style="color: var(--gray-500);">Generado automáticamente (YYYY-XXX)</small>' : ''}
            </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Producto Base *</label>
                <input type="text" id="base-product-name" class="form-input" placeholder="ej: Gel Hidroalcohólico" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Lote Base *</label>
                <input type="text" id="base-lot-number" class="form-input" placeholder="ej: GEL-2025-001" required>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Fecha de Fabricación *</label>
                <input type="date" id="order-prod-date" class="form-input" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Fecha de Caducidad *</label>
                <input type="date" id="order-exp-date" class="form-input" required>
            </div>
        </div>
        
        <div class="form-group">
            <label class="form-label">Notas</label>
            <textarea id="order-notes" class="form-textarea" rows="2"></textarea>
        </div>
        
        <h4 style="margin: 1.5rem 0 1rem;">Productos Acabados a Fabricar</h4>
        <div class="form-group">
            <label class="form-label">Añadir Producto Acabado</label>
            <div style="display: grid; grid-template-columns: 4fr 2fr 1fr auto; gap: 0.5rem; align-items: end;">
                <select id="fp-product" class="form-select">
                    <option value="">Seleccionar...</option>
                    ${productOptions}
                </select>
                <input type="number" id="fp-target-qty" class="form-input" placeholder="Cant. obj." step="0.01">
                <input type="text" class="form-input" value="ud" readonly style="background-color: var(--gray-100); width: 60px; text-align: center;">
                <button type="button" class="btn btn-primary btn-sm" onclick="addFinishedProductToOrder()">+</button>
            </div>
        </div>
        
        <div id="finished-products-table"></div>
    `;

        showModal('Nueva Orden de Producción', content, async () => {
            if (orderFinishedProducts.length === 0) {
                showMessage('Debe añadir al menos un producto acabado', 'error');
                return false;
            }

            const baseLotNumber = document.getElementById('base-lot-number').value;
            const expirationDate = document.getElementById('order-exp-date').value;

            if (!baseLotNumber || !expirationDate) {
                showMessage('Debe indicar el lote base y la fecha de caducidad', 'error');
                return false;
            }

            // Add lot_number and expiration_date from header to each finished product
            const finishedProductsWithLot = orderFinishedProducts.map(fp => ({
                ...fp,
                lot_number: baseLotNumber,
                expiration_date: expirationDate
            }));

            const data = {
                order_number: document.getElementById('order-number').value,
                base_product_name: document.getElementById('base-product-name').value,
                base_lot_number: baseLotNumber,
                production_date: document.getElementById('order-prod-date').value,
                expiration_date: expirationDate,
                notes: document.getElementById('order-notes').value,
                finished_products: finishedProductsWithLot
            };

            try {
                await api.post('/production-orders', data);
                showMessage('Orden de producción creada correctamente');
                closeModal();
                loadProductionOrders();
            } catch (error) {
                showMessage(error.message, 'error');
                return false;
            }
        });

        updateFinishedProductsTable();

        // Initialize searchable select for finished product dropdown
        initSearchableSelectDelayed('fp-product');
    } catch (error) {
        console.error('Error opening modal:', error);
        showMessage(error.message, 'error');
    }
}

function addFinishedProductToOrder() {
    const productId = parseInt(document.getElementById('fp-product').value);
    const targetQty = parseFloat(document.getElementById('fp-target-qty').value) || null;

    if (!productId) {
        showMessage('Debe seleccionar un producto', 'error');
        return;
    }

    // Get product name
    const productSelect = document.getElementById('fp-product');
    const productName = productSelect.options[productSelect.selectedIndex].text;

    orderFinishedProducts.push({
        finished_product_id: productId,
        product_name: productName,
        target_quantity: targetQty,
        unit: 'ud'
    });

    // Clear form
    document.getElementById('fp-product').value = '';
    document.getElementById('fp-target-qty').value = '';

    updateFinishedProductsTable();
}

function removeFinishedProductFromOrder(index) {
    orderFinishedProducts.splice(index, 1);
    updateFinishedProductsTable();
}

function updateFinishedProductsTable() {
    const container = document.getElementById('finished-products-table');

    if (orderFinishedProducts.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-500); padding: 1rem; text-align: center;">No se han añadido productos acabados</p>';
        return;
    }

    const rows = orderFinishedProducts.map((fp, index) => `
        <tr>
            <td>${fp.product_name}</td>
            <td>${fp.target_quantity || '-'}</td>
            <td><button class="btn btn-sm btn-danger" onclick="removeFinishedProductFromOrder(${index})">×</button></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="table-container" style="margin-top: 1rem;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cant. Objetivo</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

async function showOrderDetails(orderId) {
    try {
        const order = await api.get(`/production-orders/${orderId}`);

        const hasMultipleProducts = order.finished_products && order.finished_products.length > 0;

        const materialsHtml = order.materials && order.materials.length > 0
            ? order.materials.map(m => {
                const displayQty = m.original_quantity != null ? m.original_quantity : m.quantity_consumed;
                const displayUnit = m.original_unit || m.unit;
                const qty = parseFloat(displayQty);
                // Try format if it has many decimals
                const formattedQty = Number.isInteger(qty) ? qty : parseFloat(qty.toFixed(3));

                // Assignment Badge
                let assignmentBadge = '';
                if (m.related_finished_product) {
                    assignmentBadge = `<span class="badge badge-info" style="font-size: 0.75rem; margin-top: 4px; display: inline-block;">Para: ${m.related_finished_product.finished_product_name}</span>`;
                } else if (order.finished_products && order.finished_products.length > 0) {
                    assignmentBadge = `<span class="badge badge-secondary" style="font-size: 0.75rem; margin-top: 4px; display: inline-block;">Común / Mezcla Base</span>`;
                }

                return `
                <div class="material-item">
                    <div>
                        <strong>${m.lot?.product?.name || '-'}</strong> - Lote: ${m.lot?.lot_number || '-'}
                        <br><small>${formattedQty} ${displayUnit}</small>
                        <br>${assignmentBadge}
                    </div>
                    ${order.status !== 'closed' ? `
                        <button class="btn btn-sm btn-danger" onclick="removeMaterial(${orderId}, ${m.id})">Eliminar</button>
                    ` : ''}
                </div>
            `}).join('')
            : '<p style="color: var(--gray-500); padding: 1rem;">No se han añadido materiales</p>';

        let content = `
            <div style="margin-bottom: 1rem;">
                <strong>Orden:</strong> ${order.order_number}<br>
                <strong>Fecha Producción:</strong> ${formatDate(order.production_date)}<br>
                <strong>Estado:</strong> ${getStatusBadge(order.status)}
            </div>
            `;

        // Show finished products table or single product info
        if (hasMultipleProducts) {
            const productsRows = order.finished_products.map(fp => `
                    <tr>
                        <td>${fp.finished_product?.name || '-'}</td>
                        <td>${fp.target_quantity || '-'}</td>
                        <td>${fp.produced_quantity || '-'}</td>
                        <td>${formatDate(fp.expiration_date)}</td>
                        <td>${fp.lot_id ? '✓' : '-'}</td>
                    </tr>
                    `).join('');

            content += `
                    <h4 style="margin: 1.5rem 0 1rem;">Productos Acabados</h4>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cant. Objetivo</th>
                                    <th>Cant. Producida</th>
                                    <th>Caducidad</th>
                                    <th>Lote Creado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productsRows}
                            </tbody>
                        </table>
                    </div>
                    `;
        } else if (order.finished_product) {
            // Old format: show single product info
            content += `
                <div style="margin-top: 1rem; padding: 1rem; background: var(--gray-50); border-radius: 6px;">
                    <strong>Producto:</strong> ${order.finished_product?.name || '-'}<br>
                    <strong>Lote Acabado:</strong> ${order.finished_lot_number}<br>
                    <strong>Cantidad:</strong> ${order.target_quantity} ${order.unit}
                </div>
            `;
        }

        content += `
                    <h4 style="margin: 1.5rem 0 1rem;">Materiales Consumidos</h4>
                    <div class="material-list">
                        ${materialsHtml}
                    </div>

                    ${order.status !== 'closed' ? `
                <button class="btn btn-secondary btn-sm" onclick="closeModal(); showAddMaterialModal(${orderId})">+ Añadir Material</button>
            ` : ''}
                    `;

        const footer = order.status !== 'closed'
            ? `
                    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
                    <button class="btn btn-success" onclick="closeModal(); showCloseOrderModal(${orderId})">Cerrar Orden</button>
                    `
            : '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>';

        showModal('Detalles de Orden de Producción', content, null);
        document.querySelector('.modal-footer').innerHTML = footer;

    } catch (error) {
        showMessage(error.message, 'error');
    }
}

async function showAddMaterialModal(orderId) {
    try {
        // Fetch products, lots with stock in LIB location, and order details
        const [products, availableLots, order] = await Promise.all([
            api.get('/products'),
            api.get('/locations/available-stock'),  // Only stock in LIB location
            api.get(`/production-orders/${orderId}`)
        ]);

        // Filter products to raw materials and packaging only
        const materialProducts = products.filter(p => p.type === 'raw_material' || p.type === 'packaging');
        const productOptions = materialProducts.map(p =>
            `<option value="${p.id}" data-type="${p.type}" data-density="${p.density || 1}" data-consumption_unit="${p.consumption_unit || 'kg'}">${p.code} - ${p.name}</option>`
        ).join('');

        // Store lots with stock in LIB for filtering
        window._materialLots = availableLots.filter(l => l.product?.type === 'raw_material' || l.product?.type === 'packaging');

        // Generate assignment options
        let assignmentOptions = '<option value="">Común (Toda la orden)</option>';
        if (order.finished_products && order.finished_products.length > 0) {
            order.finished_products.forEach(fp => {
                const productName = fp.finished_product?.name || 'Producto Desconocido';
                assignmentOptions += `<option value="${fp.id}">Para: ${productName}</option>`;
            });
        } else if (order.finished_product) {
            assignmentOptions += `<option value="single">Para: ${order.finished_product.name}</option>`;
        }

        const content = `
            <div class="form-group">
                <label class="form-label">Producto *</label>
                <select id="material-product" class="form-select searchable-select" required>
                    <option value="">Seleccionar producto...</option>
                    ${productOptions}
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Lote *</label>
                <select id="material-lot" class="form-select" required disabled>
                    <option value="">Primero seleccione un producto</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Asignar a</label>
                <select id="material-assignment" class="form-select">
                    ${assignmentOptions}
                </select>
                <small style="color: var(--gray-500);">Indica si este material es para un producto específico o común.</small>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Cantidad a Consumir *</label>
                    <input type="number" id="material-quantity" class="form-input" step="0.001" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Unidad *</label>
                    ${getUnitSelector('material-unit', '', true)}
                    <small style="color: var(--gray-500);">Unidad de la receta</small>
                </div>
            </div>
        `;

        showModal('Añadir Material a Orden', content, async () => {
            const assignmentValue = document.getElementById('material-assignment').value;

            const data = {
                lot_id: parseInt(document.getElementById('material-lot').value),
                quantity_consumed: parseFloat(document.getElementById('material-quantity').value),
                unit: document.getElementById('material-unit').value,
                related_finished_product_id: (assignmentValue && assignmentValue !== 'single') ? parseInt(assignmentValue) : null
            };

            try {
                await api.post(`/production-orders/${orderId}/materials`, data);
                showMessage('Material añadido correctamente');
                closeModal();
                showOrderDetails(orderId);
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });

        // Initialize Choices.js on product select
        setTimeout(() => {
            initSearchableSelect('material-product');
            const productSelect = document.getElementById('material-product');
            if (productSelect) {
                productSelect.addEventListener('change', () => updateMaterialLotOptions());
            }
        }, 50);

    } catch (error) {
        showMessage('Error cargando datos: ' + error.message, 'error');
    }
}

// Helper function to update lot options when product is selected
function updateMaterialLotOptions() {
    const productSelect = document.getElementById('material-product');
    const lotSelect = document.getElementById('material-lot');
    const selectedProductId = parseInt(productSelect.value);

    if (!selectedProductId) {
        lotSelect.innerHTML = '<option value="">Primero seleccione un producto</option>';
        lotSelect.disabled = true;
        return;
    }

    // Get product info
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const productType = selectedOption.dataset.type;
    const density = parseFloat(selectedOption.dataset.density) || 1;

    // Filter lots for selected product
    const productLots = window._materialLots.filter(l => l.product_id === selectedProductId);

    if (productLots.length === 0) {
        lotSelect.innerHTML = '<option value="">No hay lotes disponibles en LIB</option>';
        lotSelect.disabled = true;
        return;
    }

    // Generate lot options with FEFO info (using available_quantity from LIB)
    const lotOptions = productLots.map(l => {
        const expDate = l.expiration_date ? new Date(l.expiration_date).toLocaleDateString('es-ES') : 'Sin cad.';

        // Use available_quantity (stock in LIB) instead of current_quantity (total)
        let displayQty = l.available_quantity || l.current_quantity;
        let displayUnit = l.unit;

        // For raw materials, show in kg (consumption unit)
        if (productType === 'raw_material') {
            const storageUnit = l.unit?.toLowerCase();
            if (storageUnit === 'l') {
                displayQty = displayQty * density;
                displayUnit = 'kg';
            } else if (storageUnit === 'g') {
                displayQty = displayQty / 1000;
                displayUnit = 'kg';
            } else if (storageUnit === 'kg') {
                displayUnit = 'kg';
            }
        } else if (productType === 'packaging') {
            displayUnit = 'ud';
        }

        const formattedQty = displayQty.toLocaleString('es-ES', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        });

        return `<option value="${l.id}">Lote: ${l.lot_number} | Cad: ${expDate} | ${formattedQty} ${displayUnit}</option>`;
    }).join('');

    lotSelect.innerHTML = '<option value="">Seleccionar lote...</option>' + lotOptions;
    lotSelect.disabled = false;

    // Auto-select unit based on product type
    const unitSelect = document.getElementById('material-unit');
    if (unitSelect) {
        if (productType === 'packaging') {
            // For packaging, force 'ud'
            unitSelect.value = 'ud';
            unitSelect.querySelectorAll('option').forEach(opt => {
                opt.disabled = opt.value !== 'ud' && opt.value !== '';
            });
        } else if (productType === 'raw_material') {
            // For raw materials, use consumption unit (typically kg)
            unitSelect.value = selectedOption?.dataset?.consumption_unit || 'kg';
            unitSelect.querySelectorAll('option').forEach(opt => {
                opt.disabled = false;
            });
        }
    }
}

async function removeMaterial(orderId, materialId) {
    if (!confirm('¿Eliminar este material de la orden?')) return;

    try {
        await api.delete(`/production-orders/${orderId}/materials/${materialId}`);
        showMessage('Material eliminado correctamente');
        showOrderDetails(orderId);
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

async function showCloseOrderModal(orderId) {
    try {
        const order = await api.get(`/production-orders/${orderId}`);

        // Check if order has finished_products (new format) or uses old format
        const hasMultipleProducts = order.finished_products && order.finished_products.length > 0;

        let content = `
                    <p style="margin-bottom: 1rem;">Al cerrar la orden se crearán los lotes de productos acabados y se consumirán los materiales.</p>
                    `;

        if (hasMultipleProducts) {
            // New format: table with quantities for each product
            const productsRows = order.finished_products.map((fp, index) => `
                    <tr>
                        <td>${fp.finished_product?.name || '-'}</td>
                        <td>${fp.target_quantity || '-'}</td>
                        <td>
                            <input type="number"
                                id="produced-qty-${fp.id}"
                                class="form-input"
                                step="0.01"
                                value="${fp.target_quantity || ''}"
                                placeholder="Cantidad producida"
                                required
                                style="width: 150px;">
                        </td>
                    </tr>
                    `).join('');

            content += `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cant. Objetivo</th>
                                    <th>Cant. Producida *</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productsRows}
                            </tbody>
                        </table>
                    </div>
                    `;
        } else {
            // Old format: single quantity input
            content += `
                <div class="form-group">
                    <label class="form-label">Cantidad Producida *</label>
                    <input type="number" id="produced-quantity" class="form-input" step="0.01" required>
                </div>
            `;
        }

        showModal('Cerrar Orden de Producción', content, async () => {
            let data;

            if (hasMultipleProducts) {
                // Collect quantities for each product
                const finishedProducts = order.finished_products.map(fp => {
                    const qty = parseFloat(document.getElementById(`produced-qty-${fp.id}`).value);
                    return {
                        finished_product_id: fp.id,
                        produced_quantity: qty
                    };
                });

                // Validate at least one product has quantity
                if (!finishedProducts.some(fp => fp.produced_quantity > 0)) {
                    showMessage('Debe indicar la cantidad producida para al menos un producto', 'error');
                    return false;
                }

                data = { finished_products: finishedProducts };
            } else {
                // Old format
                data = {
                    produced_quantity: parseFloat(document.getElementById('produced-quantity').value)
                };
            }

            try {
                await api.post(`/production-orders/${orderId}/close`, data);
                showMessage('Orden cerrada correctamente');
                closeModal();
                loadProductionOrders();
            } catch (error) {
                showMessage(error.message, 'error');
                return false;
            }
        }, 'Cerrar Orden');

    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// ========== Shipment Views ==========

function renderShipments() {
    return `
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <h2 style="font-size: 1.875rem; font-weight: 700;">Envíos a Clientes</h2>
                            <button class="btn btn-primary" onclick="showShipmentModal()">+ Nuevo Envío</button>
                        </div>

                        <div class="card">
                            <div class="card-body">
                                <div id="shipments-table"></div>
                            </div>
                        </div>
                    </div>
                    `;
}

async function loadShipments() {
    try {
        const shipments = await api.get('/shipments');
        renderShipmentsTable(shipments);
    } catch (error) {
        console.error('Error loading shipments:', error);
    }
}

function renderShipmentsTable(shipments) {
    const container = document.getElementById('shipments-table');

    if (shipments.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 2rem;">No hay envíos registrados</p>';
        return;
    }

    const html = `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Número Albarán</th>
                                    <th>Cliente</th>
                                    <th>Fecha Envío</th>
                                    <th>Nº Líneas</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${shipments.map(s => `
                        <tr>
                            <td><strong>${s.shipment_number}</strong></td>
                            <td>${s.customer?.name || '-'}</td>
                            <td>${formatDate(s.shipment_date)}</td>
                            <td>${s.details?.length || 0}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick="showShipmentDetails(${s.id})">Ver Detalles</button>
                            </td>
                        </tr>
                    `).join('')}
                            </tbody>
                        </table>
                    </div>
                    `;

    container.innerHTML = html;
}

let shipmentDetails = [];

function showShipmentModal() {
    shipmentDetails = [];

    api.get('/customers').then(customers => {
        const customerOptions = customers.map(c =>
            `<option value="${c.id}">${c.code} - ${c.name}</option>`
        ).join('');

        const content = `
                    <div class="form-group">
                        <label class="form-label">Cliente *</label>
                        <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
                            <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                                <input type="radio" name="customer-type" value="existing" checked onchange="toggleNewCustomerFields()"> 
                                Cliente existente
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                                <input type="radio" name="customer-type" value="new" onchange="toggleNewCustomerFields()"> 
                                Nuevo cliente
                            </label>
                        </div>
                        <div id="existing-customer-field">
                            <select id="shipment-customer" class="form-select">
                                <option value="">Seleccionar cliente...</option>
                                ${customerOptions}
                            </select>
                        </div>
                        <div id="new-customer-fields" style="display: none; margin-top: 0.5rem; padding: 1rem; background: var(--gray-50); border-radius: 8px;">
                            <small style="color: var(--gray-500); display: block; margin-bottom: 0.75rem;">El código se asignará automáticamente</small>
                            <div class="form-group" style="margin-bottom: 0.75rem;">
                                <input type="text" id="new-customer-name" class="form-input" placeholder="Nombre del cliente *" required>
                            </div>
                            <div class="form-row" style="margin-bottom: 0.75rem;">
                                <div class="form-group" style="margin: 0;">
                                    <input type="email" id="new-customer-email" class="form-input" placeholder="Email">
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <input type="text" id="new-customer-phone" class="form-input" placeholder="Teléfono">
                                </div>
                            </div>
                            <div class="form-group" style="margin: 0;">
                                <textarea id="new-customer-address" class="form-textarea" rows="2" placeholder="Dirección"></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Número de Albarán *</label>
                            <input type="text" id="shipment-number" class="form-input" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Fecha de Envío *</label>
                            <input type="date" id="shipment-date" class="form-input" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Notas</label>
                        <textarea id="shipment-notes" class="form-textarea" rows="2"></textarea>
                    </div>

                    <h4 style="margin: 1.5rem 0 1rem;">Líneas de Envío</h4>
                    <div id="shipment-details-container"></div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="addShipmentDetail()">+ Añadir Línea</button>
                    `;

        showModal('Nuevo Envío', content, async () => {
            if (shipmentDetails.length === 0) {
                showMessage('Debe añadir al menos una línea de envío', 'error');
                return false;
            }

            const isNewCustomer = document.querySelector('input[name="customer-type"]:checked').value === 'new';

            const data = {
                shipment_number: document.getElementById('shipment-number').value,
                shipment_date: document.getElementById('shipment-date').value,
                notes: document.getElementById('shipment-notes').value,
                details: shipmentDetails
            };

            if (isNewCustomer) {
                const name = document.getElementById('new-customer-name').value.trim();
                if (!name) {
                    showMessage('Introduzca el nombre del cliente', 'error');
                    return false;
                }
                data.new_customer = {
                    name,
                    email: document.getElementById('new-customer-email').value.trim() || null,
                    phone: document.getElementById('new-customer-phone').value.trim() || null,
                    address: document.getElementById('new-customer-address').value.trim() || null
                };
            } else {
                const customerId = document.getElementById('shipment-customer').value;
                if (!customerId) {
                    showMessage('Seleccione un cliente', 'error');
                    return false;
                }
                data.customer_id = parseInt(customerId);
            }

            try {
                await api.post('/shipments', data);
                showMessage('Envío creado correctamente');
                closeModal();
                loadShipments();
            } catch (error) {
                showMessage(error.message, 'error');
                return false;
            }
        });

        addShipmentDetail(); // Add first line by default

        // Initialize searchable select for customer
        initSearchableSelectDelayed('shipment-customer');
    });
}

// Toggle between existing and new customer fields
function toggleNewCustomerFields() {
    const isNewCustomer = document.querySelector('input[name="customer-type"]:checked').value === 'new';
    document.getElementById('existing-customer-field').style.display = isNewCustomer ? 'none' : 'block';
    document.getElementById('new-customer-fields').style.display = isNewCustomer ? 'block' : 'none';
}

function addShipmentDetail() {
    Promise.all([
        api.get('/products'),
        api.get('/locations/available-stock')  // Only stock in LIB location
    ]).then(([products, availableLots]) => {
        // Filter to finished products only
        const finishedProducts = products.filter(p => p.type === 'finished_product');
        const productOptions = finishedProducts.map(p =>
            `<option value="${p.id}">${p.code} - ${p.name}</option>`
        ).join('');

        // Store lots with available stock in LIB
        window._shipmentLots = availableLots.filter(l => l.product?.type === 'finished_product');

        const index = shipmentDetails.length;
        const container = document.getElementById('shipment-details-container');

        const detailHtml = `
            <div class="detail-row" id="detail-${index}" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
                <div class="form-group" style="margin: 0; flex: 1.2;">
                    <select class="form-select" id="detail-product-${index}" required>
                        <option value="">Producto...</option>
                        ${productOptions}
                    </select>
                </div>
                <div class="form-group" style="margin: 0; flex: 1.5;">
                    <select class="form-select" id="detail-lot-${index}" required disabled>
                        <option value="">Primero seleccione producto</option>
                    </select>
                </div>
                <div class="form-group" style="margin: 0; width: 100px;">
                    <input type="number" class="form-input" id="detail-qty-${index}" placeholder="Cantidad" step="1" required>
                </div>
                <div class="form-group" style="margin: 0; width: 50px;">
                    <input type="text" class="form-input" id="detail-unit-${index}" value="ud" readonly style="background-color: var(--gray-100); text-align: center;">
                </div>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeShipmentDetail(${index})">×</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', detailHtml);

        shipmentDetails.push({ unit: 'ud' });

        // Initialize Choices.js on product select
        initSearchableSelect(`detail-product-${index}`);
        const productSelect = document.getElementById(`detail-product-${index}`);
        if (productSelect) {
            productSelect.addEventListener('change', () => updateShipmentLotOptions(index));
        }

        // Update shipmentDetails when fields change
        document.getElementById(`detail-lot-${index}`).addEventListener('change', (e) => {
            shipmentDetails[index].lot_id = parseInt(e.target.value);
        });
        document.getElementById(`detail-qty-${index}`).addEventListener('input', (e) => {
            shipmentDetails[index].quantity = parseFloat(e.target.value);
        });
    });
}

// Helper function to update lot options when product is selected in shipment
function updateShipmentLotOptions(index) {
    const productSelect = document.getElementById(`detail-product-${index}`);
    const lotSelect = document.getElementById(`detail-lot-${index}`);
    const selectedProductId = parseInt(productSelect.value);

    if (!selectedProductId) {
        lotSelect.innerHTML = '<option value="">Primero seleccione producto</option>';
        lotSelect.disabled = true;
        return;
    }

    // Filter lots for selected product
    const productLots = window._shipmentLots.filter(l => l.product_id === selectedProductId);

    if (productLots.length === 0) {
        lotSelect.innerHTML = '<option value="">No hay lotes disponibles</option>';
        lotSelect.disabled = true;
        return;
    }

    // Generate lot options with FEFO info (using available_quantity from LIB location)
    const lotOptions = productLots.map(l => {
        const expDate = l.expiration_date ? new Date(l.expiration_date).toLocaleDateString('es-ES') : 'Sin cad.';
        const availableQty = l.available_quantity || l.current_quantity;
        const formattedQty = availableQty.toLocaleString('es-ES', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        return `<option value="${l.id}">${l.lot_number} | Cad: ${expDate} | ${formattedQty} ${l.unit} disponible</option>`;
    }).join('');

    lotSelect.innerHTML = '<option value="">Seleccionar lote...</option>' + lotOptions;
    lotSelect.disabled = false;
}


function removeShipmentDetail(index) {
    document.getElementById(`detail-${index}`).remove();
    shipmentDetails.splice(index, 1);
}

async function showShipmentDetails(shipmentId) {
    try {
        const shipment = await api.get(`/shipments/${shipmentId}`);

        const detailsHtml = shipment.details && shipment.details.length > 0
            ? shipment.details.map(d => `
                    <tr>
                        <td>${d.lot?.product?.name || '-'}</td>
                        <td>${d.lot?.lot_number || '-'}</td>
                        <td>${d.quantity} ${d.unit}</td>
                    </tr>
                    `).join('')
            : '<tr><td colspan="3" style="text-align: center; color: var(--gray-500);">Sin detalles</td></tr>';

        const content = `
                    <div style="margin-bottom: 1.5rem;">
                        <strong>Albarán:</strong> ${shipment.shipment_number}<br>
                            <strong>Cliente:</strong> ${shipment.customer?.name || '-'}<br>
                                <strong>Fecha:</strong> ${formatDate(shipment.shipment_date)}<br>
                                    ${shipment.notes ? `<strong>Notas:</strong> ${shipment.notes}<br>` : ''}
                                </div>

                                <h4 style="margin-bottom: 1rem;">Líneas de Envío</h4>
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Lote</th>
                                            <th>Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${detailsHtml}
                                    </tbody>
                                </table>
                                `;

        showModal('Detalles del Envío', content, null);
        document.querySelector('.modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>';

    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// ========== Lot Forms ==========

async function showLotModal() {
    try {
        const products = await api.get('/products');
        const productOptions = products.map(p =>
            `<option value="${p.id}" data-unit="${p.storage_unit || 'ud'}">${p.code} - ${p.name}</option>`
        ).join('');

        const content = `
            <div class="form-group">
                <label class="form-label">Producto *</label>
                <select id="lot-product" class="form-select" required onchange="updateLotUnit()">
                    <option value="">Seleccionar producto...</option>
                    ${productOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Número de Lote *</label>
                <input type="text" id="lot-number" class="form-input" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Fecha Recepción / Fabricación *</label>
                    <input type="date" id="lot-manufacturing-date" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Fecha Caducidad</label>
                    <input type="date" id="lot-expiration-date" class="form-input">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Cantidad Inicial *</label>
                    <input type="number" id="lot-quantity" class="form-input" step="0.01" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Unidad *</label>
                    <input type="text" id="lot-unit" class="form-input" readonly style="background-color: var(--gray-100);">
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Notas</label>
                <textarea id="lot-notes" class="form-textarea" rows="2"></textarea>
            </div>
            
            <script>
                function updateLotUnit() {
                    const select = document.getElementById('lot-product');
                    const option = select.options[select.selectedIndex];
                    const unit = option.getAttribute('data-unit') || '';
                    document.getElementById('lot-unit').value = unit;
                }
            </script>
        `;

        showModal('Nuevo Lote', content, async () => {
            const data = {
                product_id: parseInt(document.getElementById('lot-product').value),
                lot_number: document.getElementById('lot-number').value,
                manufacturing_date: document.getElementById('lot-manufacturing-date').value,
                expiration_date: document.getElementById('lot-expiration-date').value || null,
                initial_quantity: parseFloat(document.getElementById('lot-quantity').value),
                unit: document.getElementById('lot-unit').value,
                notes: document.getElementById('lot-notes').value
            };

            try {
                await api.post('/lots', data);
                showMessage('Lote creado correctamente');
                closeModal();
                if (typeof loadLots === 'function') loadLots();
                if (typeof loadInventory === 'function') loadInventory();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });

        // Initialize searchable select for product
        initSearchableSelectDelayed('lot-product');

    } catch (error) {
        showMessage('Error cargando productos: ' + error.message, 'error');
    }
}

// Make updateLotUnit available globally since it's used in inline event
window.updateLotUnit = function () {
    const select = document.getElementById('lot-product');
    const option = select.options[select.selectedIndex];
    const unit = option.getAttribute('data-unit') || 'ud';
    document.getElementById('lot-unit').value = unit;
};

// ========== Reception Forms ==========

async function showReceptionModal() {
    try {
        const products = await api.get('/products');

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        const content = `
            <div class="form-group">
                <label class="form-label">Tipo de Producto *</label>
                <select id="reception-type" class="form-select" required onchange="updateReceptionProducts()">
                    <option value="">Seleccionar...</option>
                    <option value="raw_material">Materia Prima</option>
                    <option value="packaging">Envase / Etiqueta / Caja</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Fecha de Recepción *</label>
                <input type="date" id="reception-date" class="form-input" value="${today}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Proveedor *</label>
                <input type="text" id="reception-supplier" class="form-input" placeholder="Nombre del proveedor" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Producto *</label>
                <select id="reception-product" class="form-select" required disabled>
                    <option value="">Primero seleccione tipo de producto</option>
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Cantidad Recibida *</label>
                    <input type="number" id="reception-quantity" class="form-input" step="0.001" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Unidad *</label>
                    <div id="reception-unit-container">
                        ${getUnitSelector('reception-unit', '', true)}
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Unidades Revisadas</label>
                <input type="text" id="reception-units-reviewed" class="form-input" placeholder="Descripción de unidades revisadas">
            </div>
            
            <div class="form-group">
                <label class="form-label">Número de Lote *</label>
                <input type="text" id="reception-lot-number" class="form-input" required>
            </div>
            
            <div class="form-group" id="reception-expiration-group">
                <label class="form-label">Fecha de Caducidad *</label>
                <input type="date" id="reception-expiration" class="form-input">
                <small style="color: var(--gray-500);">Solo para materias primas</small>
            </div>
        `;

        // Store products globally for filtering
        window._receptionProducts = products;

        showModal('Nueva Recepción', content, async () => {
            const receptType = document.getElementById('reception-type').value;

            if (!receptType) {
                showMessage('Debe seleccionar un tipo de producto', 'error');
                return false;
            }

            const data = {
                product_id: parseInt(document.getElementById('reception-product').value),
                reception_date: document.getElementById('reception-date').value,
                supplier: document.getElementById('reception-supplier').value,
                quantity: parseFloat(document.getElementById('reception-quantity').value),
                unit: document.getElementById('reception-unit').value,
                units_reviewed: document.getElementById('reception-units-reviewed').value,
                lot_number: document.getElementById('reception-lot-number').value,
                expiration_date: receptType === 'raw_material' ? document.getElementById('reception-expiration').value : null
            };

            if (!data.product_id || !data.supplier || !data.quantity || !data.unit || !data.lot_number) {
                showMessage('Complete todos los campos obligatorios', 'error');
                return false;
            }

            // Show loading overlay with progress message
            showReceptionProgress('Registrando recepción...');

            try {
                updateReceptionProgress('Creando lote y generando documento...');
                const result = await api.post('/receptions', data);

                updateReceptionProgress('Enviando documento por email...');
                // Small delay to show the email step
                await new Promise(resolve => setTimeout(resolve, 500));

                hideReceptionProgress();
                showMessage('Recepción registrada correctamente');
                closeModal();
                loadReceptions();
            } catch (error) {
                hideReceptionProgress();
                showMessage(error.message, 'error');
                return false;
            }
        });

        // Initialize searchable selects
        initSearchableSelectDelayed('reception-type');
        initSearchableSelectDelayed('reception-unit');

    } catch (error) {
        showMessage('Error cargando datos: ' + error.message, 'error');
    }
}

// Update product dropdown based on type selection
function updateReceptionProducts() {
    const typeSelect = document.getElementById('reception-type');
    const productSelect = document.getElementById('reception-product');
    const expirationGroup = document.getElementById('reception-expiration-group');
    const selectedType = typeSelect.value;

    if (!selectedType) {
        productSelect.innerHTML = '<option value="">Primero seleccione tipo de producto</option>';
        productSelect.disabled = true;
        return;
    }

    // Filter products by type
    const filteredProducts = window._receptionProducts.filter(p => p.type === selectedType);

    const productOptions = filteredProducts.map(p =>
        `<option value="${p.id}" data-unit="${p.storage_unit || 'ud'}">${p.code} - ${p.name}</option>`
    ).join('');

    productSelect.innerHTML = '<option value="">Seleccionar producto...</option>' + productOptions;
    productSelect.disabled = false;

    // Show/hide expiration date based on type
    if (selectedType === 'packaging') {
        expirationGroup.style.display = 'none';
        document.getElementById('reception-expiration').removeAttribute('required');
    } else {
        expirationGroup.style.display = 'block';
        document.getElementById('reception-expiration').setAttribute('required', 'true');
    }

    // Update unit container based on product type
    const unitContainer = document.getElementById('reception-unit-container');
    if (selectedType === 'packaging') {
        // For packaging, show fixed 'ud' text
        unitContainer.innerHTML = `
            <input type="text" id="reception-unit" class="form-input" value="ud" readonly 
                   style="background-color: var(--gray-100); width: 100px; text-align: center;">
        `;
    } else {
        // For raw materials, show dropdown
        unitContainer.innerHTML = getUnitSelector('reception-unit', '', true);
    }

    // Destroy any existing Choices instance first
    if (productSelect.choicesInstance) {
        productSelect.choicesInstance.destroy();
        productSelect.choicesInstance = null;
    }

    // Initialize searchable select and add change event for auto-selecting unit
    setTimeout(() => {
        const choicesInstance = initSearchableSelect('reception-product');

        // Add change event listener for auto-selecting unit (for raw materials)
        if (selectedType === 'raw_material') {
            productSelect.addEventListener('change', function () {
                const selectedProductId = parseInt(this.value);
                if (selectedProductId) {
                    // Find the product in our stored list
                    const product = window._receptionProducts.find(p => p.id === selectedProductId);
                    if (product && product.storage_unit) {
                        const unitSelect = document.getElementById('reception-unit');
                        if (unitSelect) {
                            unitSelect.value = product.storage_unit;
                        }
                    }
                }
            });
        }
    }, 50);
}

// Helper function removed - logic now inline in filterReceptionProducts

// ========== Reception Progress Overlay ==========

function showReceptionProgress(message) {
    // Create progress overlay that appears above the modal
    const progressOverlay = document.createElement('div');
    progressOverlay.id = 'reception-progress-overlay';
    progressOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;

    progressOverlay.innerHTML = `
        <div style="
            background: white;
            padding: 2rem 3rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            max-width: 400px;
        ">
            <div style="
                width: 50px;
                height: 50px;
                border: 4px solid #e0e0e0;
                border-top-color: var(--primary-500, #3B82F6);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1.5rem;
            "></div>
            <p id="reception-progress-text" style="
                font-size: 1.1rem;
                font-weight: 500;
                color: #333;
                margin: 0;
            ">${message}</p>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;

    document.body.appendChild(progressOverlay);
}

function updateReceptionProgress(message) {
    const textEl = document.getElementById('reception-progress-text');
    if (textEl) {
        textEl.textContent = message;
    }
}

function hideReceptionProgress() {
    const overlay = document.getElementById('reception-progress-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// ========== Customer Modal ==========

function showCustomerModal(customer = null) {
    const isEdit = !!customer;
    const title = isEdit ? 'Editar Cliente' : 'Nuevo Cliente';

    const content = `
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Código ${isEdit ? '' : '(auto)'}</label>
                <input type="text" id="customer-code" class="form-input" value="${customer?.code || ''}" 
                       ${isEdit ? '' : 'readonly style="background: var(--gray-100);"'} 
                       placeholder="${isEdit ? '' : 'Se asignará automáticamente'}">
            </div>
            <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input type="text" id="customer-name" class="form-input" value="${customer?.name || ''}" required>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" id="customer-email" class="form-input" value="${customer?.email || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input type="text" id="customer-phone" class="form-input" value="${customer?.phone || ''}">
            </div>
        </div>
        
        <div class="form-group">
            <label class="form-label">Dirección</label>
            <textarea id="customer-address" class="form-textarea" rows="2">${customer?.address || ''}</textarea>
        </div>
        
        ${isEdit ? `
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="customer-active" ${customer?.active !== false ? 'checked' : ''}>
                    Cliente activo
                </label>
            </div>
        ` : ''}
    `;

    showModal(title, content, async () => {
        const name = document.getElementById('customer-name').value.trim();
        if (!name) {
            showMessage('El nombre es obligatorio', 'error');
            return false;
        }

        const data = {
            name,
            email: document.getElementById('customer-email').value.trim() || null,
            phone: document.getElementById('customer-phone').value.trim() || null,
            address: document.getElementById('customer-address').value.trim() || null
        };

        if (isEdit) {
            data.code = document.getElementById('customer-code').value.trim();
            data.active = document.getElementById('customer-active').checked;
        }

        try {
            if (isEdit) {
                await api.put(`/customers/${customer.id}`, data);
                showMessage('Cliente actualizado correctamente');
            } else {
                // Auto-generate code for new customers
                const customers = await api.get('/customers');
                const cliCustomers = customers.filter(c => c.code.startsWith('CLI-'));
                let nextNum = 1;
                if (cliCustomers.length > 0) {
                    const nums = cliCustomers.map(c => parseInt(c.code.split('-')[1]) || 0);
                    nextNum = Math.max(...nums) + 1;
                }
                data.code = `CLI-${String(nextNum).padStart(4, '0')}`;
                await api.post('/customers', data);
                showMessage('Cliente creado correctamente');
            }
            closeModal();
            loadCustomers();
        } catch (error) {
            showMessage(error.message, 'error');
            return false;
        }
    });
}

// ========== Return (Devolución) Forms ==========

let returnDetails = [];

async function showReturnModal() {
    returnDetails = [];

    try {
        // Fetch customers, products, lots, and next number
        const [customers, products, lots, nextNumberData] = await Promise.all([
            api.get('/customers'),
            api.get('/products?type=finished_product'),
            api.get('/lots'),
            api.get('/returns/next-number')
        ]);

        const customerOptions = customers.map(c =>
            `<option value="${c.id}">${c.code} - ${c.name}</option>`
        ).join('');

        const productOptions = products.map(p =>
            `<option value="${p.id}">${p.code} - ${p.name}</option>`
        ).join('');

        const today = new Date().toISOString().split('T')[0];
        const nextReturnNumber = nextNumberData ? nextNumberData.next_number : '';

        // Store lots globally for filtering - include all finished product lots (even with 0 stock)
        window._returnLots = lots.filter(l => l.product?.type === 'finished_product');
        window._returnProducts = products;
        window._returnProductOptions = productOptions;

        const content = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nº Devolución *</label>
                    <input type="text" id="return-number" class="form-input" value="${nextReturnNumber}" readonly style="background-color: var(--gray-100);">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Fecha Devolución *</label>
                    <input type="date" id="return-date" class="form-input" value="${today}" required>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Cliente</label>
                <select id="return-customer" class="form-select">
                    <option value="">Sin cliente (Devolución interna)</option>
                    ${customerOptions}
                </select>
                <small style="color: var(--gray-500);">Opcional - dejar vacío para devoluciones internas</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Motivo *</label>
                <select id="return-reason" class="form-select" required>
                    <option value="">Seleccionar motivo...</option>
                    <option value="customer_return">Devolución de Cliente</option>
                    <option value="market_recall">Retirada del Mercado</option>
                    <option value="quality_issue">Problema de Calidad</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Notas</label>
                <textarea id="return-notes" class="form-textarea" rows="2" placeholder="Notas adicionales..."></textarea>
            </div>
            
            <h4 style="margin: 1.5rem 0 1rem;">Líneas de Devolución</h4>
            <div id="return-details-container"></div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addReturnDetailRow()" style="margin-top: 0.5rem;">+ Añadir Línea</button>
        `;

        showModal('Nueva Devolución', content, async () => {
            const reason = document.getElementById('return-reason').value;

            if (!reason) {
                showMessage('Debe seleccionar un motivo de devolución', 'error');
                return false;
            }

            // Collect details from rows
            const details = [];
            const container = document.getElementById('return-details-container');
            const rows = container.querySelectorAll('.return-detail-row');

            rows.forEach((row, index) => {
                const lotId = document.getElementById(`return-lot-${index}`)?.value;
                const qty = document.getElementById(`return-qty-${index}`)?.value;
                const unit = document.getElementById(`return-unit-${index}`)?.value || 'ud';

                if (lotId && qty) {
                    details.push({
                        lot_id: parseInt(lotId),
                        quantity: parseFloat(qty),
                        unit: unit
                    });
                }
            });

            if (details.length === 0) {
                showMessage('Debe añadir al menos una línea de devolución', 'error');
                return false;
            }

            const customerId = document.getElementById('return-customer').value;

            const data = {
                return_number: document.getElementById('return-number').value,
                return_date: document.getElementById('return-date').value,
                customer_id: customerId ? parseInt(customerId) : null,
                reason: reason,
                notes: document.getElementById('return-notes').value,
                details: details
            };

            try {
                await api.post('/returns', data);
                showMessage('Devolución registrada correctamente. Los lotes han sido bloqueados.');
                closeModal();
                loadReturns();
            } catch (error) {
                showMessage(error.message, 'error');
                return false;
            }
        });

        // Initialize searchable selects
        initSearchableSelectDelayed('return-customer');
        initSearchableSelectDelayed('return-reason');

        // Add first row
        addReturnDetailRow();

    } catch (error) {
        showMessage('Error cargando datos: ' + error.message, 'error');
    }
}

let returnDetailIndex = 0;

function addReturnDetailRow() {
    const index = returnDetailIndex++;
    const container = document.getElementById('return-details-container');
    const productOptions = window._returnProductOptions || '';

    const rowHtml = `
        <div class="return-detail-row" id="return-row-${index}" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; padding: 0.5rem; background: var(--gray-50); border-radius: 6px;">
            <div class="form-group" style="margin: 0; flex: 1.2;">
                <select class="form-select" id="return-product-${index}" onchange="updateReturnLotOptions(${index})">
                    <option value="">Producto...</option>
                    ${productOptions}
                </select>
            </div>
            <div class="form-group" style="margin: 0; flex: 1.5;">
                <select class="form-select" id="return-lot-${index}" disabled>
                    <option value="">Primero seleccione producto</option>
                </select>
            </div>
            <div class="form-group" style="margin: 0; width: 100px;">
                <input type="number" class="form-input" id="return-qty-${index}" placeholder="Cant." step="1" min="1">
            </div>
            <div class="form-group" style="margin: 0; width: 50px;">
                <input type="text" class="form-input" id="return-unit-${index}" value="ud" readonly style="background-color: var(--gray-100); text-align: center;">
            </div>
            <button type="button" class="btn btn-sm" style="background: transparent; border: none; color: var(--gray-400); padding: 6px;" 
                    onmouseover="this.style.color='#dc2626';" 
                    onmouseout="this.style.color='var(--gray-400)';" 
                    onclick="removeReturnDetailRow(${index})">×</button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', rowHtml);

    // Initialize searchable select
    initSearchableSelect(`return-product-${index}`);
}

function removeReturnDetailRow(index) {
    document.getElementById(`return-row-${index}`)?.remove();
}

function updateReturnLotOptions(index) {
    const productSelect = document.getElementById(`return-product-${index}`);
    const lotSelect = document.getElementById(`return-lot-${index}`);
    const selectedProductId = parseInt(productSelect.value);

    if (!selectedProductId) {
        lotSelect.innerHTML = '<option value="">Primero seleccione producto</option>';
        lotSelect.disabled = true;
        return;
    }

    // Filter lots for selected product
    const productLots = window._returnLots.filter(l => l.product_id === selectedProductId);

    if (productLots.length === 0) {
        lotSelect.innerHTML = '<option value="">No hay lotes disponibles</option>';
        lotSelect.disabled = true;
        return;
    }

    // Generate lot options
    const lotOptions = productLots.map(l => {
        const expDate = l.expiration_date ? new Date(l.expiration_date).toLocaleDateString('es-ES') : 'Sin cad.';
        const formattedQty = l.current_quantity.toLocaleString('es-ES', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        return `<option value="${l.id}">Lote: ${l.lot_number} | Cad: ${expDate} | ${formattedQty} ${l.unit}</option>`;
    }).join('');

    lotSelect.innerHTML = '<option value="">Seleccionar lote...</option>' + lotOptions;
    lotSelect.disabled = false;
}

// ========== Stock Transfer (Location) ==========

async function showTransferModal(lotId) {
    try {
        // Load lot info and locations
        const [lot, locations, lotStock] = await Promise.all([
            api.get(`/lots/${lotId}`),
            api.get('/locations'),
            api.get(`/locations/lot/${lotId}/stock`)
        ]);

        // Build location options for source (only where lot has stock)
        const fromOptions = lotStock.locations
            .filter(ll => ll.quantity > 0)
            .map(ll => `<option value="${ll.location_id}" data-qty="${ll.quantity}">${ll.location.name} (${ll.quantity} ${lot.unit})</option>`)
            .join('');

        // Build destination options (all active locations)
        const toOptions = locations.map(loc =>
            `<option value="${loc.id}">${loc.name}${loc.is_available ? ' ✅' : ''}</option>`
        ).join('');

        const content = `
            <div class="form-group">
                <label class="form-label">Producto</label>
                <input type="text" class="form-input" value="${lot.product?.name || '-'}" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Lote</label>
                <input type="text" class="form-input" value="${lot.lot_number}" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Desde Ubicación *</label>
                <select id="transfer-from" class="form-select" required onchange="updateTransferMax()">
                    <option value="">Seleccionar origen...</option>
                    ${fromOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Hacia Ubicación *</label>
                <select id="transfer-to" class="form-select" required>
                    <option value="">Seleccionar destino...</option>
                    ${toOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Cantidad a Transferir *</label>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="number" id="transfer-qty" class="form-input" min="0.01" step="0.01" required>
                    <span id="transfer-max-label" style="white-space: nowrap;">/ - ${lot.unit}</span>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Notas</label>
                <input type="text" id="transfer-notes" class="form-input" placeholder="Motivo de la transferencia (opcional)">
            </div>
        `;

        showModal('Transferir Stock entre Ubicaciones', content, async () => {
            const fromLocationId = document.getElementById('transfer-from').value;
            const toLocationId = document.getElementById('transfer-to').value;
            const quantity = parseFloat(document.getElementById('transfer-qty').value);
            const notes = document.getElementById('transfer-notes').value;

            if (!fromLocationId || !toLocationId || !quantity) {
                showMessage('Complete todos los campos obligatorios', 'error');
                return;
            }

            if (fromLocationId === toLocationId) {
                showMessage('Las ubicaciones origen y destino deben ser diferentes', 'error');
                return;
            }

            try {
                await api.post('/locations/transfer', {
                    lot_id: lotId,
                    from_location_id: parseInt(fromLocationId),
                    to_location_id: parseInt(toLocationId),
                    quantity: quantity,
                    notes: notes
                });

                closeModal();
                showMessage('Transferencia realizada correctamente', 'success');

                // Reload inventory if we're on that page
                if (typeof loadInventory === 'function') {
                    loadInventory();
                }
            } catch (error) {
                showMessage(error.message || 'Error en la transferencia', 'error');
            }
        }, 'Transferir');

        // Store lot for reference
        window._transferLot = lot;

    } catch (error) {
        showMessage('Error al cargar datos: ' + error.message, 'error');
    }
}

function updateTransferMax() {
    const fromSelect = document.getElementById('transfer-from');
    const selectedOption = fromSelect.options[fromSelect.selectedIndex];
    const maxQty = selectedOption ? parseFloat(selectedOption.dataset.qty || 0) : 0;
    const unit = window._transferLot?.unit || '';

    document.getElementById('transfer-qty').max = maxQty;
    document.getElementById('transfer-max-label').textContent = `/ ${maxQty} ${unit}`;
}
