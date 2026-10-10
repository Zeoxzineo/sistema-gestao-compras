// Key for local storage persistence
const STORAGE_KEY = 'chefcontrol_purchases_db';

// Initial Mock Data if LocalStorage is empty
const initialMockData = [
    {
        id: "101",
        nota: "NF-8821",
        dataCompra: "2026-10-01",
        fornecedor: "Hortifruti Santa Marta",
        valorTotal: 1450.00,
        formaPagamento: "Boleto 3x",
        p1: { vencimento: "2026-10-05", pagamento: "2026-10-05", pago: true },
        p2: { vencimento: "2026-10-15", pagamento: "", pago: false },
        p3: { vencimento: "2026-10-25", pagamento: "", pago: false },
        teveDevolucao: "Sim",
        observacoes: "Veio 1 caixa de tomate amassada. Fornecedor deu desconto proporcional na P2."
    },
    {
        id: "102",
        nota: "NF-9042",
        dataCompra: "2026-10-03",
        fornecedor: "Distribuidora de Carnes Prime",
        valorTotal: 3200.50,
        formaPagamento: "Boleto 2x",
        p1: { vencimento: "2026-10-10", pagamento: "2026-10-09", pago: true },
        p2: { vencimento: "2026-10-20", pagamento: "2026-10-20", pago: true },
        p3: { vencimento: "", pagamento: "", pago: false },
        teveDevolucao: "Não",
        observacoes: "Entregue dentro do prazo, carnes com ótima qualidade."
    },
    {
        id: "103",
        nota: "Pix-4401",
        dataCompra: "2026-10-08",
        fornecedor: "Bebidas & Cia Ltda",
        valorTotal: 890.00,
        formaPagamento: "Pix",
        p1: { vencimento: "", pagamento: "2026-10-08", pago: true },
        p2: { vencimento: "", pagamento: "", pago: false },
        p3: { vencimento: "", pagamento: "", pago: false },
        teveDevolucao: "Não",
        observacoes: "Pago à vista via Pix no momento da entrega."
    }
];

let purchases = [];

// Load data from LocalStorage or initialize with mock data
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            purchases = JSON.parse(stored);
        } catch(e) {
            purchases = [...initialMockData];
        }
    } else {
        purchases = [...initialMockData];
        saveData();
    }
    renderTable();
    updateDashboard();
}

// Save data to LocalStorage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
    updateDashboard();
}

// Format Currency BRL
function formatMoney(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

// Format Date to PT-BR
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Calculate payment progress of a purchase
function getPurchaseStatus(item) {
    if (['Pix', 'Cartão de Crédito', 'Cartão de Débito'].includes(item.formaPagamento)) {
        return { label: 'Concluído', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', code: 'pago' };
    }

    let totalParc = 1;
    if (item.formaPagamento === 'Boleto 2x') totalParc = 2;
    if (item.formaPagamento === 'Boleto 3x') totalParc = 3;

    let pagas = 0;
    if (item.p1 && item.p1.pago) pagas++;
    if (totalParc >= 2 && item.p2 && item.p2.pago) pagas++;
    if (totalParc === 3 && item.p3 && item.p3.pago) pagas++;

    if (pagas === totalParc) {
        return { label: 'Concluído', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', code: 'pago' };
    } else if (pagas > 0) {
        return { label: `Parcial (${pagas}/${totalParc})`, color: 'bg-amber-100 text-amber-800 border-amber-200', code: 'parcial' };
    } else {
        return { label: 'Pendente', color: 'bg-rose-100 text-rose-800 border-rose-200', code: 'pendente' };
    }
}

// Update financial dashboard cards
function updateDashboard() {
    let total = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let countDevolucoes = 0;
    let parcelasAbertasCount = 0;

    purchases.forEach(item => {
        const itemVal = parseFloat(item.valorTotal) || 0;
        total += itemVal;

        if (item.teveDevolucao === 'Sim') {
            countDevolucoes++;
        }

        if (['Pix', 'Cartão de Crédito', 'Cartão de Débito'].includes(item.formaPagamento)) {
            totalPago += itemVal;
        } else {
            let totalParc = 1;
            if (item.formaPagamento === 'Boleto 2x') totalParc = 2;
            if (item.formaPagamento === 'Boleto 3x') totalParc = 3;

            const parcVal = itemVal / totalParc;

            if (item.p1 && item.p1.pago) totalPago += parcVal; else { totalPendente += parcVal; parcelasAbertasCount++; }
            if (totalParc >= 2) {
                if (item.p2 && item.p2.pago) totalPago += parcVal; else { totalPendente += parcVal; parcelasAbertasCount++; }
            }
            if (totalParc === 3) {
                if (item.p3 && item.p3.pago) totalPago += parcVal; else { totalPendente += parcVal; parcelasAbertasCount++; }
            }
        }
    });

    document.getElementById('dash-total').innerText = formatMoney(total);
    document.getElementById('dash-count').innerText = `${purchases.length} compras cadastradas`;

    document.getElementById('dash-pago').innerText = formatMoney(totalPago);
    const perc = total > 0 ? Math.round((totalPago / total) * 100) : 0;
    document.getElementById('dash-pago-percent').innerText = `${perc}% do valor total quitado`;

    document.getElementById('dash-pendente').innerText = formatMoney(totalPendente);
    document.getElementById('dash-pendente-count').innerText = `${parcelasAbertasCount} parcelas pendentes`;

    document.getElementById('dash-devolucoes').innerText = countDevolucoes;
}

// Render Purchases Table with filters applied
function renderTable() {
    const tbody = document.getElementById('purchases-table-body');
    const emptyState = document.getElementById('empty-state');
    tbody.innerHTML = '';

    const search = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const devFilter = document.getElementById('filter-devolucao').value;

    const filtered = purchases.filter(item => {
        const matchesSearch = item.nota.toLowerCase().includes(search) || item.fornecedor.toLowerCase().includes(search);
        const statusObj = getPurchaseStatus(item);
        const matchesStatus = statusFilter === 'todos' || statusObj.code === statusFilter;
        const matchesDev = devFilter === 'todos' || (devFilter === 'sim' && item.teveDevolucao === 'Sim') || (devFilter === 'nao' && item.teveDevolucao === 'Não');

        return matchesSearch && matchesStatus && matchesDev;
    });

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    filtered.forEach(item => {
        const statusObj = getPurchaseStatus(item);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 transition text-slate-700 border-b border-slate-100';

        // Parcelas Render HTML
        let parcelasHtml = '';
        if (['Pix', 'Cartão de Crédito', 'Cartão de Débito'].includes(item.formaPagamento)) {
            parcelasHtml = `<span class="text-slate-400 text-xs italic">À vista (${item.formaPagamento})</span>`;
        } else {
            let totalParc = 1;
            if (item.formaPagamento === 'Boleto 2x') totalParc = 2;
            if (item.formaPagamento === 'Boleto 3x') totalParc = 3;

            const renderP = (num, pData) => {
                if (num > totalParc || !pData) return '';
                const isPago = pData.pago;
                return `
                    <div class="flex items-center justify-between text-xs py-0.5 px-2 rounded ${isPago ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                        <span>P${num}: ${formatDate(pData.vencimento)}</span>
                        <button onclick="toggleParcelaPago('${item.id}', ${num})" title="${isPago ? 'Marcar como Pendente' : 'Dar Baixa em Parcela'}" class="ml-2 font-bold hover:scale-110 transition">
                            <i class="fa-solid ${isPago ? 'fa-circle-check text-emerald-600' : 'fa-circle-notch text-slate-400'}"></i>
                        </button>
                    </div>
                `;
            };

            parcelasHtml = `
                <div class="space-y-1 max-w-[170px]">
                    ${renderP(1, item.p1)}
                    ${totalParc >= 2 ? renderP(2, item.p2) : ''}
                    ${totalParc === 3 ? renderP(3, item.p3) : ''}
                </div>
            `;
        }

        tr.innerHTML = `
            <td class="py-3 px-4">
                <div class="font-bold text-slate-900">${escapeHtml(item.nota)}</div>
                <div class="text-xs text-slate-400"><i class="fa-regular fa-calendar mr-1"></i>${formatDate(item.dataCompra)}</div>
            </td>
            <td class="py-3 px-4">
                <div class="font-medium text-slate-800">${escapeHtml(item.fornecedor)}</div>
                ${item.observacoes ? `<div class="text-xs text-slate-500 truncate max-w-xs" title="${escapeHtml(item.observacoes)}"><i class="fa-regular fa-comment mr-1"></i>${escapeHtml(item.observacoes)}</div>` : ''}
            </td>
            <td class="py-3 px-4 font-bold text-slate-900">
                ${formatMoney(item.valorTotal)}
            </td>
            <td class="py-3 px-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    ${escapeHtml(item.formaPagamento)}
                </span>
            </td>
            <td class="py-3 px-4">
                ${parcelasHtml}
            </td>
            <td class="py-3 px-4">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusObj.color}">
                    ${statusObj.label}
                </span>
            </td>
            <td class="py-3 px-4 text-center">
                ${item.teveDevolucao === 'Sim' ? 
                    `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700" title="Possui devolução registrada">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i> Sim
                     </span>` : 
                    `<span class="text-slate-400 text-xs">Não</span>`}
            </td>
            <td class="py-3 px-4 text-right space-x-1">
                <button onclick="editPurchase('${item.id}')" class="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition" title="Editar Compra">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deletePurchase('${item.id}')" class="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition" title="Excluir Compra">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// Helper to prevent XSS
function escapeHtml(str) {
    return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Show/Hide Boleto installment fields dynamically
function toggleBoletoFields() {
    const forma = document.getElementById('formaPagamento').value;
    const container = document.getElementById('boletos-container');
    const p1 = document.getElementById('p1-block');
    const p2 = document.getElementById('p2-block');
    const p3 = document.getElementById('p3-block');

    if (forma.startsWith('Boleto')) {
        container.classList.remove('hidden');
        p1.classList.remove('hidden');

        if (forma === 'Boleto 1x') {
            p2.classList.add('hidden');
            p3.classList.add('hidden');
        } else if (forma === 'Boleto 2x') {
            p2.classList.remove('hidden');
            p3.classList.add('hidden');
        } else if (forma === 'Boleto 3x') {
            p2.classList.remove('hidden');
            p3.classList.remove('hidden');
        }
    } else {
        container.classList.add('hidden');
    }
}

// Open Modal (New or Edit)
function openModal(isEdit = false) {
    const modal = document.getElementById('purchase-modal');
    const modalTitle = document.getElementById('modal-title');
    if (!isEdit) {
        document.getElementById('purchase-form').reset();
        document.getElementById('purchase-id').value = '';
        document.getElementById('dataCompra').value = new Date().toISOString().split('T')[0];
        modalTitle.innerHTML = `<i class="fa-solid fa-cart-plus text-emerald-400 mr-2"></i> Cadastrar Nova Compra`;
        toggleBoletoFields();
    }
    modal.classList.remove('hidden');
}

// Close Modal
function closeModal() {
    document.getElementById('purchase-modal').classList.add('hidden');
}

// Handle Form Submit
function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('purchase-id').value || Date.now().toString();
    const forma = document.getElementById('formaPagamento').value;

    const newPurchase = {
        id: id,
        nota: document.getElementById('nota').value.trim(),
        dataCompra: document.getElementById('dataCompra').value,
        fornecedor: document.getElementById('fornecedor').value.trim(),
        valorTotal: parseFloat(document.getElementById('valorTotal').value) || 0,
        formaPagamento: forma,
        p1: {
            vencimento: document.getElementById('p1-vencimento').value,
            pagamento: document.getElementById('p1-pagamento').value,
            pago: document.getElementById('p1-pago').checked
        },
        p2: {
            vencimento: document.getElementById('p2-vencimento').value,
            pagamento: document.getElementById('p2-pagamento').value,
            pago: document.getElementById('p2-pago').checked
        },
        p3: {
            vencimento: document.getElementById('p3-vencimento').value,
            pagamento: document.getElementById('p3-pagamento').value,
            pago: document.getElementById('p3-pago').checked
        },
        teveDevolucao: document.getElementById('teveDevolucao').value,
        observacoes: document.getElementById('observacoes').value.trim()
    };

    const existingIndex = purchases.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
        purchases[existingIndex] = newPurchase;
    } else {
        purchases.unshift(newPurchase);
    }

    saveData();
    renderTable();
    closeModal();
}

// Populate Form for Edit
function editPurchase(id) {
    const item = purchases.find(p => p.id === id);
    if (!item) return;

    document.getElementById('purchase-id').value = item.id;
    document.getElementById('nota').value = item.nota;
    document.getElementById('dataCompra').value = item.dataCompra;
    document.getElementById('fornecedor').value = item.fornecedor;
    document.getElementById('valorTotal').value = item.valorTotal;
    document.getElementById('formaPagamento').value = item.formaPagamento;

    toggleBoletoFields();

    if (item.p1) {
        document.getElementById('p1-vencimento').value = item.p1.vencimento || '';
        document.getElementById('p1-pagamento').value = item.p1.pagamento || '';
        document.getElementById('p1-pago').checked = !!item.p1.pago;
    }
    if (item.p2) {
        document.getElementById('p2-vencimento').value = item.p2.vencimento || '';
        document.getElementById('p2-pagamento').value = item.p2.pagamento || '';
        document.getElementById('p2-pago').checked = !!item.p2.pago;
    }
    if (item.p3) {
        document.getElementById('p3-vencimento').value = item.p3.vencimento || '';
        document.getElementById('p3-pagamento').value = item.p3.pagamento || '';
        document.getElementById('p3-pago').checked = !!item.p3.pago;
    }

    document.getElementById('teveDevolucao').value = item.teveDevolucao || 'Não';
    document.getElementById('observacoes').value = item.observacoes || '';

    document.getElementById('modal-title').innerHTML = `<i class="fa-solid fa-pen-to-square text-emerald-400 mr-2"></i> Editar Registro de Compra`;
    openModal(true);
}

// Delete Purchase
function deletePurchase(id) {
    if (confirm('Tem certeza de que deseja excluir permanentemente esta compra?')) {
        purchases = purchases.filter(p => p.id !== id);
        saveData();
        renderTable();
    }
}

// Toggle Single Installment Payment Status directly from table
function toggleParcelaPago(purchaseId, numParc) {
    const item = purchases.find(p => p.id === purchaseId);
    if (!item) return;

    const key = `p${numParc}`;
    if (item[key]) {
        item[key].pago = !item[key].pago;
        if (item[key].pago && !item[key].pagamento) {
            item[key].pagamento = new Date().toISOString().split('T')[0];
        }
        saveData();
        renderTable();
    }
}

// Apply Search & Filters
function applyFilters() {
    renderTable();
}

// Reset Filters
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-status').value = 'todos';
    document.getElementById('filter-devolucao').value = 'todos';
    renderTable();
}

// Export Purchases to CSV
function exportToCSV() {
    if (purchases.length === 0) {
        alert('Não há registros para exportar.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Nº Nota;Data;Fornecedor;Valor Total;Forma Pagamento;Devolucao;Observacoes\n";

    purchases.forEach(item => {
        const row = [
            `"${item.nota}"`,
            `"${item.dataCompra}"`,
            `"${item.fornecedor}"`,
            `"${item.valorTotal}"`,
            `"${item.formaPagamento}"`,
            `"${item.teveDevolucao}"`,
            `"${(item.observacoes || '').replace(/"/g, '""')}"`
        ].join(";");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `compras_restaurante_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize on Load
window.onload = function() {
    loadData();
};