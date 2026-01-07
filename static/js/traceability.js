// ============================================
// TRACEABILITY VIEW - JavaScript
// ============================================

function renderTraceability() {
    return `
        <div>
            <h2 style="font-size: 1.875rem; font-weight: 700; margin-bottom: 1.5rem;">Trazabilidad</h2>
            
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">Buscar Trazabilidad por Lote</h3>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Producto</label>
                            <select id="trace-product" class="form-select">
                                <option value="">Todos los productos...</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Número de Lote</label>
                            <input type="text" id="trace-lot-number" class="form-input" placeholder="Buscar lote...">
                        </div>
                    </div>
                    
                    <button class="btn btn-primary" onclick="searchTraceability()">Buscar Trazabilidad</button>
                </div>
            </div>
            
            <div id="traceability-results"></div>
        </div>
    `;
}

async function loadTraceabilityView() {
    try {
        // Load products for dropdown
        const products = await api.get('/products');
        const select = document.getElementById('trace-product');

        products.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.code} - ${p.name}`;
            select.appendChild(option);
        });

        // Initialize searchable select for product
        if (typeof initSearchableSelect === 'function') {
            initSearchableSelect('trace-product');
        }

        // Add event listener for lot search
        document.getElementById('trace-lot-number').addEventListener('input', suggestLots);

    } catch (error) {
        console.error('Error loading traceability view:', error);
    }
}

async function suggestLots() {
    const lotNumber = document.getElementById('trace-lot-number').value;
    if (lotNumber.length < 2) return;

    try {
        const lots = await api.get(`/lots?lot_number=${lotNumber}`);
        // Could add autocomplete suggestions here
    } catch (error) {
        console.error('Error searching lots:', error);
    }
}

async function searchTraceability() {
    const productId = document.getElementById('trace-product').value;
    const lotNumber = document.getElementById('trace-lot-number').value;
    const resultsContainer = document.getElementById('traceability-results');

    if (!lotNumber) {
        resultsContainer.innerHTML = '<div class="error-message">Por favor, ingrese un número de lote</div>';
        return;
    }

    resultsContainer.innerHTML = '<div class="text-center"><div class="loading"></div> Buscando...</div>';

    try {
        // Find the lot
        let url = `/lots?lot_number=${lotNumber}`;
        if (productId) url += `&product_id=${productId}`;

        const lots = await api.get(url);

        if (lots.length === 0) {
            resultsContainer.innerHTML = '<div class="error-message">No se encontró ningún lote con ese número</div>';
            return;
        }

        if (lots.length > 1) {
            // Show selection if multiple lots match
            const lotOptions = lots.map(lot => `
                <div class="card" style="margin-bottom: 1rem; cursor: pointer;" onclick="showLotTraceability(${lot.id})">
                    <div class="card-body">
                        <strong>${lot.lot_number}</strong> - ${lot.product?.name || '-'}<br>
                        <small>Tipo: ${lot.product?.type || '-'} | Stock: ${formatQuantity(lot.current_quantity, lot.unit)} ${lot.unit}</small>
                    </div>
                </div>
            `).join('');

            resultsContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Seleccione un Lote</h3>
                    </div>
                    <div class="card-body">
                        ${lotOptions}
                    </div>
                </div>
            `;
            return;
        }

        // Show traceability for single lot
        showLotTraceability(lots[0].id);

    } catch (error) {
        resultsContainer.innerHTML = `<div class="error-message">Error al buscar: ${error.message}</div>`;
    }
}

async function showLotTraceability(lotId) {
    const resultsContainer = document.getElementById('traceability-results');
    resultsContainer.innerHTML = '<div class="text-center"><div class="loading"></div> Cargando trazabilidad...</div>';

    try {
        const lot = await api.get(`/lots/${lotId}`);
        const productType = lot.product?.type;
        const quantityConsumed = lot.initial_quantity - lot.current_quantity;

        let traceabilityHtml = '';

        // TABLA 1: Información del Lote (común para todos)
        traceabilityHtml += `
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3 class="card-title">📋 Información del Lote</h3>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Número Lote</th>
                                    <th>Producto</th>
                                    <th>Tipo</th>
                                    <th>${productType === 'finished_product' ? 'Fab.' : 'Recepción'}</th>
                                    <th>Cad.</th>
                                    ${productType === 'finished_product' ? `
                                        <th>Stock Inicial</th>
                                        <th>Consumido</th>
                                        <th>Stock Actual</th>
                                    ` : `
                                        <th>Stock Inicial</th>
                                        <th>Consumido</th>
                                        <th>Stock Actual</th>
                                    `}
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>${lot.lot_number}</strong></td>
                                    <td>${lot.product?.name || '-'} (${lot.product?.code || '-'})</td>
                                    <td>${getProductTypeLabel(lot.product?.type)}</td>
                                    <td>${formatDate(lot.manufacturing_date)}</td>
                                    <td>${formatDate(lot.expiration_date)}</td>
                                    ${productType === 'finished_product' ? `
                                        <td><strong>${formatQuantity(lot.initial_quantity, lot.unit)} ${lot.unit}</strong></td>
                                        <td>${formatQuantity(quantityConsumed, lot.unit)} ${lot.unit}</td>
                                        <td><strong>${formatQuantity(lot.current_quantity, lot.unit)} ${lot.unit}</strong></td>
                                    ` : `
                                        <td><strong>${formatQuantity(lot.initial_quantity, lot.unit)} ${lot.unit}</strong></td>
                                        <td>${formatQuantity(quantityConsumed, lot.unit)} ${lot.unit}</td>
                                        <td><strong>${formatQuantity(lot.current_quantity, lot.unit)} ${lot.unit}</strong></td>
                                    `}
                                    <td>${getAvailabilityBadge(lot.is_available)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (productType === 'finished_product') {
            // PRODUCTOS ACABADOS

            // TABLA 2: Materiales Consumidos en la Fabricación
            // Obtener datos detallados de trazabilidad del backend
            const traceData = await api.get(`/traceability/lot/${lotId}`);

            if (traceData.produced_from) {
                const prodInfo = traceData.produced_from;
                const materialsRows = prodInfo.materials.map(m => `
                    <tr>
                        <td>${m.lot?.product?.name || '-'}</td>
                        <td><strong>${m.lot?.lot_number || '-'}</strong></td>
                        <td>${formatDate(prodInfo.production_date)}</td>
                        <td>${formatDate(m.lot?.expiration_date)}</td>
                        <td>${formatDate(m.lot?.manufacturing_date)}</td>
                    </tr>
                `).join('');

                traceabilityHtml += `
                    <div class="card" style="margin-bottom: 1.5rem;">
                        <div class="card-header">
                            <h3 class="card-title">🔧 Materiales Consumidos en la Fabricación</h3>
                        </div>
                        <div class="card-body">
                            <p style="margin-bottom: 1rem;"><strong>Orden de Producción:</strong> ${prodInfo.order_number}</p>
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Material</th>
                                            <th>Número Lote</th>
                                            <th>Fecha Consumo</th>
                                            <th>Fecha Caducidad</th>
                                            <th>Fecha Fab. / Recepción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${materialsRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            }

            // MOSTRAR AJUSTES (Si existen)
            if (traceData.adjustments && traceData.adjustments.length > 0) {
                const adjustmentRows = traceData.adjustments.map(m => `
                    <tr>
                        <td>${formatDate(m.movement_date)}</td>
                        <td>
                            <span class="badge ${typeof getMovementBadgeClass !== 'undefined' ? getMovementBadgeClass(m.movement_type, m.quantity) : 'badge-danger'}">
                                ${typeof getPaymentTypeLabel !== 'undefined' ? getPaymentTypeLabel(m.movement_type, m.quantity) : 'Ajuste'}
                            </span>
                        </td>
                        <td>${formatQuantity(m.quantity, lot.unit)} ${lot.unit}</td>
                        <td>${m.notes || '-'}</td>
                    </tr>
                `).join('');

                traceabilityHtml += `
                    <div class="card" style="margin-bottom: 1.5rem;">
                        <div class="card-header">
                            <h3 class="card-title">⚠️ Ajustes de Inventario</h3>
                        </div>
                        <div class="card-body">
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
                                        ${adjustmentRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            }

            // TABLA 3: Envíos a Clientes
            // Ya tenemos traceData

            if (traceData.customers && traceData.customers.length > 0) {
                const customersRows = traceData.customers.map(c => `
                    <tr>
                        <td><strong>${c.shipment_number}</strong></td>
                        <td>${c.customer.name}</td>
                        <td>${formatDate(c.shipment_date)}</td>
                        <td>${formatQuantity(c.quantity, c.unit)} ${c.unit}</td>
                    </tr>
                `).join('');

                traceabilityHtml += `
                    <div class="card" style="margin-bottom: 1.5rem;">
                        <div class="card-header">
                            <h3 class="card-title">📦 Envíos a Clientes</h3>
                        </div>
                        <div class="card-body">
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Nº Albarán</th>
                                            <th>Cliente</th>
                                            <th>Fecha Envío</th>
                                            <th>Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${customersRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                traceabilityHtml += `
                    <div class="card" style="margin-bottom: 1.5rem;">
                        <div class="card-header">
                            <h3 class="card-title">📦 Envíos a Clientes</h3>
                        </div>
                        <div class="card-body">
                            <p style="color: var(--gray-500);">Este lote aún no ha sido enviado a ningún cliente</p>
                        </div>
                    </div>
                `;
            }

            // TABLA 4: Devoluciones
            if (traceData.returns && traceData.returns.length > 0) {
                const returnsRows = traceData.returns.map(r => `
                    <tr>
                        <td><strong>${r.return_number}</strong></td>
                        <td>${r.customer ? r.customer.name : 'Devolución interna'}</td>
                        <td>${formatDate(r.return_date)}</td>
                        <td><span class="badge badge-danger">${r.reason_label}</span></td>
                        <td>${formatQuantity(r.quantity, r.unit)} ${r.unit}</td>
                        <td>${r.notes || '-'}</td>
                    </tr>
                `).join('');

                traceabilityHtml += `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">↩️ Devoluciones / Retiradas</h3>
                        </div>
                        <div class="card-body">
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Nº Devolución</th>
                                            <th>Cliente</th>
                                            <th>Fecha</th>
                                            <th>Motivo</th>
                                            <th>Cantidad</th>
                                            <th>Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${returnsRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            }

        } else {
            // MATERIAS PRIMAS / ENVASES

            // TABLA 2: Entradas de este Lote
            const movements = await api.get(`/lots/${lotId}/movements`);
            const entryMovements = movements.filter(m => m.movement_type === 'entry');

            if (entryMovements.length > 0) {
                const entriesRows = entryMovements.map(m => `
                    <tr>
                        <td>${formatDate(m.movement_date)}</td>
                        <td>${formatQuantity(m.quantity, lot.unit)} ${lot.unit}</td>
                        <td>${m.notes || '-'}</td>
                    </tr>
                `).join('');

                traceabilityHtml += `
                    <div class="card" style="margin-bottom: 1.5rem;">
                        <div class="card-header">
                            <h3 class="card-title">📥 Entradas de Stock</h3>
                        </div>
                        <div class="card-body">
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Fecha Entrada</th>
                                            <th>Cantidad</th>
                                            <th>Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${entriesRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            }

            // TABLA 3: Fabricaciones donde se ha utilizado
            const traceData = await api.get(`/traceability/lot/${lotId}/reverse`);

            // MOSTRAR AJUSTES (Si existen)
            if (traceData.adjustments && traceData.adjustments.length > 0) {
                const adjustmentRows = traceData.adjustments.map(m => `
                    <tr>
                        <td>${formatDate(m.movement_date)}</td>
                        <td>
                            <span class="badge ${getMovementBadgeClass ? getMovementBadgeClass(m.movement_type, m.quantity) : 'badge-danger'}">
                                ${getPaymentTypeLabel ? getPaymentTypeLabel(m.movement_type, m.quantity) : 'Ajuste'}
                            </span>
                        </td>
                        <td>${formatQuantity(m.quantity, lot.unit)} ${lot.unit}</td>
                        <td>${m.notes || '-'}</td>
                    </tr>
                `).join('');

                traceabilityHtml += `
                    <div class="card" style="margin-bottom: 1.5rem;">
                        <div class="card-header">
                            <h3 class="card-title">⚠️ Ajustes de Inventario</h3>
                        </div>
                        <div class="card-body">
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
                                        ${adjustmentRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (traceData.used_in_production && traceData.used_in_production.length > 0) {
                const productionRows = traceData.used_in_production.map(prod => `
                    <tr>
                        <td><strong>${prod.production_order.order_number}</strong></td>
                        <td>${prod.finished_lot?.product?.name || '-'}</td>
                        <td><strong>${prod.finished_lot?.lot_number || '-'}</strong></td>
                        <td>${formatDate(prod.production_order.production_date)}</td>
                        <td>${formatDate(prod.finished_lot?.expiration_date)}</td>
                        <td>${formatDate(prod.finished_lot?.manufacturing_date)}</td>
                    </tr>
                `).join('');

                traceabilityHtml += `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">⚙️ Fabricaciones donde se ha Utilizado</h3>
                        </div>
                        <div class="card-body">
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Nº Orden</th>
                                            <th>Producto Acabado</th>
                                            <th>Lote Acabado</th>
                                            <th>Fecha Consumo</th>
                                            <th>Fecha Caducidad</th>
                                            <th>Fecha Fab. / Recepción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${productionRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                traceabilityHtml += `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">⚙️ Fabricaciones</h3>
                        </div>
                        <div class="card-body">
                            <p style="color: var(--gray-500);">Este material aún no ha sido utilizado en ninguna producción</p>
                        </div>
                    </div>
                `;
            }
        }

        resultsContainer.innerHTML = traceabilityHtml;

    } catch (error) {
        resultsContainer.innerHTML = `<div class="error-message">Error al cargar trazabilidad: ${error.message}</div>`;
    }
}
