// CONFIGURATION & CONSTANTS
const BUS_CAPACITY = 60;
const PRICE_PER_PERSON = 3.00;

// APPLICATION STATE
let state = {
    registrations: [],
    activeHighlightId: null, // ID of passenger currently highlighted
    editingId: null          // ID of passenger currently being edited in the form
};

// DOM ELEMENTS
const DOM = {
    form: document.getElementById('registration-form'),
    editIdInput: document.getElementById('edit-id'),
    leaderNameInput: document.getElementById('leader-name'),
    companionsInput: document.getElementById('companions-count'),
    paymentInput: document.getElementById('payment-amount'),
    btnSubmit: document.getElementById('btn-submit'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),
    
    // Live Cost Display
    calcSeats: document.getElementById('calc-seats'),
    calcTotal: document.getElementById('calc-total'),
    
    // Stats
    statOccupied: document.getElementById('stat-occupied'),
    statFree: document.getElementById('stat-free'),
    statCollected: document.getElementById('stat-collected'),
    statPending: document.getElementById('stat-pending'),
    capacityPercentage: document.getElementById('capacity-percentage'),
    
    // Seat Grid
    seatsContainer: document.getElementById('bus-seats-container'),
    
    // Table
    tableBody: document.getElementById('table-body'),
    noDataMsg: document.getElementById('no-data-msg'),
    searchInput: document.getElementById('search-input'),
    btnExport: document.getElementById('btn-export'),
    btnPrint: document.getElementById('btn-print'),
    
    // Modal
    paymentModal: document.getElementById('payment-overlay') || document.getElementById('payment-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalForm: document.getElementById('payment-update-form'),
    modalPassengerId: document.getElementById('modal-passenger-id'),
    modalPassengerName: document.getElementById('modal-passenger-name'),
    modalPassengerSeats: document.getElementById('modal-passenger-seats'),
    modalPassengerTotal: document.getElementById('modal-passenger-total'),
    modalPaymentInput: document.getElementById('modal-payment-input'),
    modalDebtPreview: document.getElementById('modal-debt-preview')
};

// INITIALIZATION (ASINCRÓNICA PARA CONSULTAR BD)
async function init() {
    setupEventListeners();
    updateLiveCalculations();
    await loadState();
    render();
}

// DATABASE ACTIONS (REEMPLAZA LOCALSTORAGE)
async function loadState() {
    try {
        const response = await fetch('api.php?action=list');
        if (!response.ok) {
            throw new Error(`Error en servidor: ${response.statusText}`);
        }
        state.registrations = await response.json();
    } catch (e) {
        console.error("Error al cargar registros desde MySQL:", e);
        alert("⚠️ No se pudo conectar a la base de datos MySQL.\n\nPor favor, verifica que:\n1. XAMPP esté iniciado.\n2. Los módulos Apache y MySQL estén encendidos.\n3. Hayas importado el archivo 'database.sql'.");
        state.registrations = [];
    }
}

// EVENT LISTENERS Setup
function setupEventListeners() {
    // Form submissions
    DOM.form.addEventListener('submit', handleFormSubmit);
    DOM.btnCancelEdit.addEventListener('click', cancelFormEdit);
    
    // Live cost updates on inputs change
    DOM.companionsInput.addEventListener('input', updateLiveCalculations);
    DOM.paymentInput.addEventListener('input', updateLiveCalculations);
    
    // Search filter
    DOM.searchInput.addEventListener('input', handleSearch);
    
    // Export CSV
    DOM.btnExport.addEventListener('click', exportCSV);
    
    // Print PDF
    DOM.btnPrint.addEventListener('click', triggerPrintPDF);
    
    // Modal controls
    DOM.modalCloseBtn.addEventListener('click', closePaymentModal);
    DOM.modalCancelBtn.addEventListener('click', closePaymentModal);
    DOM.modalForm.addEventListener('submit', handleModalPaymentSubmit);
    DOM.modalPaymentInput.addEventListener('input', updateModalDebtPreview);
}

// LIVE COST HELPERS
function updateLiveCalculations() {
    const companions = parseInt(DOM.companionsInput.value) || 0;
    const totalSeats = companions + 1;
    const totalCost = totalSeats * PRICE_PER_PERSON;
    
    DOM.calcSeats.textContent = `${totalSeats} ${totalSeats === 1 ? 'asiento' : 'asientos'}`;
    DOM.calcTotal.textContent = `$${totalCost.toFixed(2)}`;
    
    // Limit payment amount to the total cost to prevent excessive overpayment
    DOM.paymentInput.max = totalCost;
}

function updateModalDebtPreview() {
    const id = DOM.modalPassengerId.value;
    const reg = state.registrations.find(r => r.id === id);
    if (!reg) return;
    
    const payment = parseFloat(DOM.modalPaymentInput.value) || 0;
    const totalCost = reg.totalSeats * PRICE_PER_PERSON;
    const debt = Math.max(0, totalCost - payment);
    
    if (payment > totalCost) {
        DOM.modalDebtPreview.textContent = `¡Cuidado! El abono excede el costo total de $${totalCost.toFixed(2)}`;
        DOM.modalDebtPreview.className = "text-danger";
    } else {
        DOM.modalDebtPreview.textContent = `Deuda restante: $${debt.toFixed(2)}`;
        DOM.modalDebtPreview.className = debt === 0 ? "text-success" : "text-warning";
    }
}

// CALCULATE RESERVED SEATS UTILITY (CLIENT-SIDE UX CHECK)
function getOccupiedSeatsList(skipId = null) {
    const list = [];
    state.registrations.forEach(reg => {
        if (reg.id !== skipId && reg.seats) {
            list.push(...reg.seats);
        }
    });
    return list;
}

// RENDERING PIPELINE
function render() {
    renderDashboard();
    renderSeatsGrid();
    renderTable();
}

function renderDashboard() {
    let occupied = 0;
    let collected = 0;
    let pending = 0;
    
    state.registrations.forEach(reg => {
        occupied += reg.totalSeats;
        collected += reg.paidAmount;
        pending += (reg.totalSeats * PRICE_PER_PERSON) - reg.paidAmount;
    });
    
    const free = BUS_CAPACITY - occupied;
    const pct = ((occupied / BUS_CAPACITY) * 100).toFixed(0);
    
    // Update DOM texts
    DOM.statOccupied.textContent = occupied;
    DOM.statFree.textContent = free;
    DOM.statCollected.textContent = `$${collected.toFixed(2)}`;
    DOM.statPending.textContent = `$${pending.toFixed(2)}`;
    DOM.capacityPercentage.textContent = `${pct}%`;
    
    // Colors and warnings for capacity
    if (occupied >= BUS_CAPACITY) {
        DOM.capacityPercentage.style.color = 'var(--color-unpaid)';
        DOM.capacityPercentage.textContent += ' (Lleno)';
    } else if (occupied >= BUS_CAPACITY * 0.8) {
        DOM.capacityPercentage.style.color = 'var(--color-partial)';
    } else {
        DOM.capacityPercentage.style.color = 'var(--primary)';
    }
}

function renderSeatsGrid() {
    DOM.seatsContainer.innerHTML = '';
    
    // Create seating map
    const totalRows = 15;
    const occupiedMap = {}; // seatNum -> registration
    
    state.registrations.forEach(reg => {
        if (reg.seats) {
            reg.seats.forEach(sNum => {
                occupiedMap[sNum] = reg;
            });
        }
    });
    
    const searchQuery = DOM.searchInput.value.toLowerCase().trim();
    
    for (let r = 0; r < totalRows; r++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'seat-row';
        
        const seatIndices = [
            4 * r + 1, // A
            4 * r + 2, // B
            null,      // Aisle gap
            4 * r + 3, // C
            4 * r + 4  // D
        ];
        
        seatIndices.forEach((sNum, index) => {
            if (sNum === null) {
                const aisle = document.createElement('div');
                aisle.className = 'aisle-gap';
                rowEl.appendChild(aisle);
                return;
            }
            
            const seatEl = document.createElement('div');
            seatEl.className = 'seat';
            seatEl.textContent = sNum;
            
            const reg = occupiedMap[sNum];
            
            if (reg) {
                const debt = (reg.totalSeats * PRICE_PER_PERSON) - reg.paidAmount;
                let statusClass = 'unpaid';
                let statusText = 'Sin Pagar';
                
                if (debt <= 0) {
                    statusClass = 'paid';
                    statusText = 'Pagado';
                } else if (reg.paidAmount > 0) {
                    statusClass = 'partial';
                    statusText = 'Abonado';
                }
                
                seatEl.classList.add(statusClass);
                
                if (searchQuery && !reg.name.toLowerCase().includes(searchQuery)) {
                    seatEl.style.opacity = '0.2';
                }
                
                if (state.activeHighlightId === reg.id) {
                    seatEl.classList.add('active-highlight');
                }
                
                const tooltip = document.createElement('div');
                tooltip.className = 'seat-tooltip';
                tooltip.innerHTML = `
                    <div style="font-weight: 700; margin-bottom: 2px;">${reg.name}</div>
                    <div>Asiento #${sNum} (Grupo de ${reg.totalSeats})</div>
                    <div style="font-size: 0.7rem; margin-top: 3px; color: ${statusClass === 'paid' ? '#10b981' : (statusClass === 'partial' ? '#f59e0b' : '#ef4444')}">
                        ${statusText} - Abono: $${reg.paidAmount.toFixed(2)}
                    </div>
                `;
                seatEl.appendChild(tooltip);
                
                seatEl.addEventListener('click', () => {
                    highlightPassenger(reg.id);
                });
                
            } else {
                if (searchQuery) {
                    seatEl.style.opacity = '0.2';
                }
                
                const tooltip = document.createElement('div');
                tooltip.className = 'seat-tooltip';
                tooltip.innerHTML = `<span style="font-weight:600;">Asiento #${sNum}</span><br><span style="color:#94a3b8">Disponible</span>`;
                seatEl.appendChild(tooltip);
                
                seatEl.addEventListener('click', () => {
                    highlightPassenger(null);
                });
            }
            
            rowEl.appendChild(seatEl);
        });
        
        DOM.seatsContainer.appendChild(rowEl);
    }
}

function renderTable() {
    DOM.tableBody.innerHTML = '';
    const searchQuery = DOM.searchInput.value.toLowerCase().trim();
    
    const filtered = state.registrations.filter(reg => 
        reg.name.toLowerCase().includes(searchQuery)
    );
    
    if (filtered.length === 0) {
        DOM.noDataMsg.style.display = 'block';
        return;
    } else {
        DOM.noDataMsg.style.display = 'none';
    }
    
    filtered.forEach(reg => {
        const tr = document.createElement('tr');
        tr.id = `passenger-row-${reg.id}`;
        
        if (state.activeHighlightId === reg.id) {
            tr.classList.add('highlighted');
        }
        
        const totalCost = reg.totalSeats * PRICE_PER_PERSON;
        const debt = totalCost - reg.paidAmount;
        
        let statusBadge = '';
        if (debt <= 0) {
            statusBadge = '<span class="badge badge-paid">Pagado</span>';
        } else if (reg.paidAmount > 0) {
            statusBadge = `<span class="badge badge-partial">Abonado (Falta $${debt.toFixed(2)})</span>`;
        } else {
            statusBadge = '<span class="badge badge-unpaid">Sin Pagar</span>';
        }
        
        const seatsLabel = reg.seats ? reg.seats.join(', ') : 'Ninguno';
        
        tr.innerHTML = `
            <td>
                <div style="font-weight: 600; color: #fff;">${escapeHTML(reg.name)}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary)">Asientos: ${seatsLabel}</div>
            </td>
            <td style="text-align: center; font-weight: 500;">${reg.totalSeats}</td>
            <td class="fw-bold">$${totalCost.toFixed(2)}</td>
            <td class="text-success">$${reg.paidAmount.toFixed(2)}</td>
            <td class="${debt > 0 ? 'text-warning' : 'text-success'}">$${debt.toFixed(2)}</td>
            <td style="text-align: center;">${statusBadge}</td>
            <td>
                <div class="actions-cell" style="justify-content: center;">
                    <button class="btn-icon edit" onclick="editRegistration('${reg.id}')" title="Editar Registro">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px;">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="openPaymentModal('${reg.id}')" title="Actualizar Pago" style="color: var(--color-paid); border-color: rgba(16, 185, 129, 0.15)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px;">
                            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                            <line x1="12" y1="10" x2="12" y2="16"></line>
                            <path d="M8 12h8"></path>
                        </svg>
                    </button>
                    <button class="btn-icon delete" onclick="deleteRegistration('${reg.id}')" title="Eliminar Registro">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px;">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        tr.addEventListener('mouseenter', () => {
            state.activeHighlightId = reg.id;
            renderSeatsGrid();
        });
        
        tr.addEventListener('mouseleave', () => {
            state.activeHighlightId = null;
            renderSeatsGrid();
        });
        
        DOM.tableBody.appendChild(tr);
    });
}

// INTERACTIVE HIGHLIGHTING BETWEEN TABLE AND GRID
function highlightPassenger(id) {
    if (state.activeHighlightId === id) {
        state.activeHighlightId = null; // Toggle off
    } else {
        state.activeHighlightId = id;
    }
    
    renderSeatsGrid();
    renderTable();
    
    if (id) {
        const row = document.getElementById(`passenger-row-${id}`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            row.classList.add('highlighted');
        }
    }
}

// FORM MANIPULATION (SUBMIT / EDIT / CANCEL) - ASÍNCRONO
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = DOM.editIdInput.value;
    const name = DOM.leaderNameInput.value.trim();
    const companions = parseInt(DOM.companionsInput.value) || 0;
    const totalSeats = companions + 1;
    const paidAmount = parseFloat(DOM.paymentInput.value) || 0;
    
    if (!name) return;
    
    // Validación de cupo local rápida (para UX fluida)
    const currentOccupied = getOccupiedSeatsList(id ? id : null).length;
    const spaceLeft = BUS_CAPACITY - currentOccupied;
    
    if (totalSeats > spaceLeft) {
        alert(`No hay suficientes asientos disponibles. Quedan ${spaceLeft} cupos libres y solicitaste ${totalSeats}.`);
        return;
    }
    
    const totalCost = totalSeats * PRICE_PER_PERSON;
    if (paidAmount > totalCost) {
        if (!confirm(`El monto abonado ($${paidAmount.toFixed(2)}) supera el costo total del grupo ($${totalCost.toFixed(2)}). ¿Desea registrarlo de todas formas?`)) {
            return;
        }
    }
    
    // Preparar llamada AJAX a api.php
    const endpoint = id ? 'api.php?action=update' : 'api.php?action=create';
    const bodyData = id 
        ? { id, name, companions, paidAmount }
        : { name, companions, paidAmount };
        
    try {
        DOM.btnSubmit.disabled = true;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        
        const result = await response.json();
        
        if (!response.ok || result.status === 'error') {
            throw new Error(result.message || 'Error desconocido al guardar en el servidor.');
        }
        
        cancelFormEdit(); // Limpiar formulario
        await loadState(); // Cargar la nueva lista desde MySQL
        render();          // Renderizar UI
    } catch (err) {
        alert("⚠️ Error al guardar: " + err.message);
    } finally {
        DOM.btnSubmit.disabled = false;
    }
}

// Global functions attached to window for table action buttons onclick
window.editRegistration = function(id) {
    const reg = state.registrations.find(r => r.id === id);
    if (!reg) return;
    
    state.editingId = id;
    DOM.editIdInput.value = reg.id;
    DOM.leaderNameInput.value = reg.name;
    DOM.companionsInput.value = reg.companions;
    DOM.paymentInput.value = reg.paidAmount.toFixed(2);
    
    DOM.btnSubmit.querySelector('span').textContent = "Actualizar Registro";
    DOM.btnSubmit.style.background = "linear-gradient(135deg, var(--color-partial) 0%, #d97706 100%)";
    DOM.btnCancelEdit.style.display = 'block';
    
    updateLiveCalculations();
    DOM.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

function cancelFormEdit() {
    state.editingId = null;
    DOM.editIdInput.value = '';
    DOM.form.reset();
    
    DOM.btnSubmit.querySelector('span').textContent = "Guardar Registro";
    DOM.btnSubmit.style.background = "linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)";
    DOM.btnCancelEdit.style.display = 'none';
    
    updateLiveCalculations();
}

window.deleteRegistration = async function(id) {
    const reg = state.registrations.find(r => r.id === id);
    if (!reg) return;
    
    const confirmMsg = `¿Está seguro de eliminar el registro de "${reg.name}"?\nSe liberarán ${reg.totalSeats} asientos (${reg.seats.join(', ')}).`;
    if (confirm(confirmMsg)) {
        try {
            const response = await fetch('api.php?action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });
            
            const result = await response.json();
            if (!response.ok || result.status === 'error') {
                throw new Error(result.message || 'Error al eliminar el registro.');
            }
            
            if (state.editingId === id) {
                cancelFormEdit();
            }
            
            await loadState(); // Recargar datos de MySQL
            render();
        } catch (err) {
            alert("⚠️ Error al eliminar: " + err.message);
        }
    }
};

// QUICK PAYMENT UPDATE MODAL
window.openPaymentModal = function(id) {
    const reg = state.registrations.find(r => r.id === id);
    if (!reg) return;
    
    DOM.modalPassengerId.value = reg.id;
    DOM.modalPassengerName.textContent = reg.name;
    
    const totalCost = reg.totalSeats * PRICE_PER_PERSON;
    DOM.modalPassengerSeats.textContent = `${reg.totalSeats} ${reg.totalSeats === 1 ? 'asiento' : 'asientos'} (${reg.seats.join(', ')})`;
    DOM.modalPassengerTotal.textContent = `$${totalCost.toFixed(2)}`;
    
    DOM.modalPaymentInput.value = reg.paidAmount.toFixed(2);
    DOM.modalPaymentInput.max = totalCost; // ayuda visual
    
    updateModalDebtPreview();
    
    DOM.paymentModal.classList.add('active');
    DOM.modalPaymentInput.focus();
    DOM.modalPaymentInput.select();
};

function closePaymentModal() {
    DOM.paymentModal.classList.remove('active');
    DOM.modalForm.reset();
}

async function handleModalPaymentSubmit(e) {
    e.preventDefault();
    
    const id = DOM.modalPassengerId.value;
    const payment = parseFloat(DOM.modalPaymentInput.value) || 0;
    
    try {
        const response = await fetch('api.php?action=update_payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, paidAmount: payment })
        });
        
        const result = await response.json();
        if (!response.ok || result.status === 'error') {
            throw new Error(result.message || 'Error al guardar el abono.');
        }
        
        await loadState(); // Recargar datos
        render();
        closePaymentModal();
    } catch (err) {
        alert("⚠️ Error al guardar abono: " + err.message);
    }
}

// SEARCH FILTER HANDLER
function handleSearch() {
    renderSeatsGrid();
    renderTable();
}

// CSV EXPORT UTILITY
function exportCSV() {
    if (state.registrations.length === 0) {
        alert("No hay registros para exportar.");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Responsable,Cupos,Costo Total ($),Monto Abonado ($),Monto Pendiente ($),Estado,Asientos Asignados,Fecha Registro\n";
    
    state.registrations.forEach(reg => {
        const total = reg.totalSeats * PRICE_PER_PERSON;
        const debt = total - reg.paidAmount;
        let status = 'Sin Pagar';
        if (debt <= 0) status = 'Pagado';
        else if (reg.paidAmount > 0) status = 'Abonado';
        
        const row = [
            `"${reg.name.replace(/"/g, '""')}"`,
            reg.totalSeats,
            total.toFixed(2),
            reg.paidAmount.toFixed(2),
            debt.toFixed(2),
            status,
            `"${reg.seats.join('-')}"`,
            reg.createdAt || ''
        ];
        
        csvContent += row.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Reporte_Pasajeros_Bus_${date}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
}

// PRINT PDF UTILITY
function triggerPrintPDF() {
    let occupied = 0;
    let collected = 0;
    let pending = 0;
    
    state.registrations.forEach(reg => {
        occupied += reg.totalSeats;
        collected += reg.paidAmount;
        pending += (reg.totalSeats * PRICE_PER_PERSON) - reg.paidAmount;
    });
    
    const printDateEl = document.getElementById('print-date');
    const printOccupiedEl = document.getElementById('print-occupied-count');
    const printCollectedEl = document.getElementById('print-collected-amount');
    const printPendingEl = document.getElementById('print-pending-amount');
    
    if (printDateEl) printDateEl.textContent = new Date().toLocaleString('es-ES');
    if (printOccupiedEl) printOccupiedEl.textContent = `${occupied} / 60`;
    if (printCollectedEl) printCollectedEl.textContent = `$${collected.toFixed(2)}`;
    if (printPendingEl) printPendingEl.textContent = `$${pending.toFixed(2)}`;
    
    window.print();
}

// ESCAPE HTML HELPER
function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// RUN ON LOAD
document.addEventListener('DOMContentLoaded', init);
if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
}
