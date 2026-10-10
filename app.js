const STORAGE_KEY = 'chefcontrol_purchases_v1';

let purchases = loadPurchases();

function loadPurchases() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function savePurchases() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
}

function formatCurrency(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(number);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function getParcelaResumo(purchase) {
  const payment = purchase.formaPagamento || '';
  const numberOfInstallments = parseInt(payment.match(/(\d+)x/i)?.[1] || '0', 10);
  if (numberOfInstallments <= 1) return 'À vista';

  const parcelas = [];
  for (let i = 1; i <= numberOfInstallments; i++) {
    const field = `p${i}-pago`;
    const pago = purchase[field] === true || purchase[field] === 'true';
    parcelas.push(pago ? `P${i}: pago` : `P${i}: pend.`);
  }
  return parcelas.join(' • ');
}

function calculateStatus(purchase) {
  const total = Number(purchase.valorTotal) || 0;
  const paid = Number(purchase.valorPago) || 0;
  if (paid >= total) return 'Pago';
  if (paid > 0) return 'Parcial';
  return 'Pendente';
}

function renderDashboard() {
  const totalComprado = purchases.reduce((sum, item) => sum + (Number(item.valorTotal) || 0), 0);
  const totalPago = purchases.reduce((sum, item) => sum + (Number(item.valorPago) || 0), 0);
  const totalPendente = purchases.reduce((sum, item) => sum + (Math.max((Number(item.valorTotal) || 0) - (Number(item.valorPago) || 0), 0)), 0);

  const dashTotal = document.getElementById('dash-total');
  const dashCount = document.getElementById('dash-count');
  const dashPago = document.getElementById('dash-pago');
  const dashPagoPercent = document.getElementById('dash-pago-percent');
  const dashPendente = document.getElementById('dash-pendente');
  const dashPendenteCount = document.getElementById('dash-pendente-count');
  const dashDevolucoes = document.getElementById('dash-devolucoes');

  if (dashTotal) dashTotal.textContent = formatCurrency(totalComprado);
  if (dashCount) dashCount.textContent = `${purchases.length} compras registradas`;
  if (dashPago) dashPago.textContent = formatCurrency(totalPago);
  if (dashPagoPercent) {
    const percent = totalComprado > 0 ? (totalPago / totalComprado) * 100 : 0;
    dashPagoPercent.textContent = `${percent.toFixed(0)}% do total`;
  }
  if (dashPendente) dashPendente.textContent = formatCurrency(totalPendente);
  if (dashPendenteCount) {
    const pendCount = purchases.filter((item) => (Number(item.valorPago) || 0) < (Number(item.valorTotal) || 0)).length;
    dashPendenteCount.textContent = `${pendCount} parcelas a pagar`;
  }
  if (dashDevolucoes) {
    const devolucoes = purchases.filter((item) => String(item.teveDevolucao || '').toLowerCase() === 'sim').length;
    dashDevolucoes.textContent = String(devolucoes);
  }
}

function applyFilters() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('filter-status')?.value || 'todos';
  const devolucaoFilter = document.getElementById('filter-devolucao')?.value || 'todos';

  let filtered = [...purchases];

  if (search) {
    filtered = filtered.filter((item) => {
      const text = `${item.nota || ''} ${item.fornecedor || ''}`.toLowerCase();
      return text.includes(search);
    });
  }

  if (statusFilter !== 'todos') {
    filtered = filtered.filter((item) => {
      const status = calculateStatus(item);
      return statusFilter === 'pago' ? status === 'Pago' : statusFilter === 'parcial' ? status === 'Parcial' : status === 'Pendente';
    });
  }

  if (devolucaoFilter !== 'todos') {
    const hasDevolucao = devolucaoFilter === 'sim';
    filtered = filtered.filter((item) => String(item.teveDevolucao || 'Não').toLowerCase() === (hasDevolucao ? 'sim' : 'nao'));
  }

  renderTable(filtered);
}

function renderTable(list = purchases) {
  const tableBody = document.getElementById('purchases-table-body');
  const emptyState = document.getElementById('empty-state');

  if (!tableBody) return;

  if (!list.length) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  tableBody.innerHTML = list
    .slice()
    .sort((a, b) => new Date(b.dataCompra || 0) - new Date(a.dataCompra || 0))
    .map((purchase) => {
      const status = calculateStatus(purchase);
      const statusClass = status === 'Pago'
        ? 'bg-emerald-100 text-emerald-700'
        : status === 'Parcial'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-rose-100 text-rose-700';

      const devolucao = String(purchase.teveDevolucao || 'Não');
      const devolucaoClass = devolucao.toLowerCase() === 'sim' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700';

      return `
        <tr class="border-b border-slate-200 hover:bg-slate-50 text-sm">
          <td class="py-3.5 px-4">
            <div class="font-medium text-slate-800">${purchase.nota || '-'}</div>
            <div class="text-xs text-slate-500">${formatDate(purchase.dataCompra)}</div>
          </td>
          <td class="py-3.5 px-4">
            <div class="font-medium text-slate-800">${purchase.fornecedor || '-'}</div>
            <div class="text-xs text-slate-500">${purchase.local || 'Local não informado'}</div>
          </td>
          <td class="py-3.5 px-4 font-semibold text-slate-800">${formatCurrency(purchase.valorTotal || 0)}</td>
          <td class="py-3.5 px-4 text-slate-700">${purchase.formaPagamento || 'Pix'}</td>
          <td class="py-3.5 px-4 text-slate-600">${getParcelaResumo(purchase)}</td>
          <td class="py-3.5 px-4">
            <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}">${status}</span>
          </td>
          <td class="py-3.5 px-4 text-center">
            <span class="inline-flex px-2 py-1 rounded-full text-xs font-semibold ${devolucaoClass}">${devolucao}</span>
          </td>
          <td class="py-3.5 px-4 text-right">
            <div class="flex items-center justify-end gap-2">
              <button type="button" data-action="edit" data-id="${purchase.id}" class="text-blue-600 hover:text-blue-800" title="Editar">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button type="button" data-action="delete" data-id="${purchase.id}" class="text-rose-600 hover:text-rose-800" title="Excluir">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  tableBody.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      const purchase = purchases.find((item) => String(item.id) === String(id));
      if (!purchase) return;
      openModal();
      fillForm(purchase);
    });
  });

  tableBody.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      deletePurchase(id);
    });
  });
}

function toggleBoletoFields() {
  const select = document.getElementById('formaPagamento');
  const container = document.getElementById('boletos-container');
  if (!select || !container) return;

  const value = select.value || '';
  const isBoleto = value.toLowerCase().includes('boleto');
  container.style.display = isBoleto ? 'block' : 'none';
}

function openModal() {
  const modal = document.getElementById('purchase-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('purchase-modal');
  if (modal) modal.classList.add('hidden');

  const form = document.getElementById('purchase-form');
  if (form) form.reset();
  document.getElementById('purchase-id').value = '';
  toggleBoletoFields();
}

function fillForm(purchase) {
  const form = document.getElementById('purchase-form');
  if (!form) return;

  document.getElementById('purchase-id').value = purchase.id || '';
  document.getElementById('nota').value = purchase.nota || '';
  document.getElementById('dataCompra').value = purchase.dataCompra || '';
  document.getElementById('fornecedor').value = purchase.fornecedor || '';
  document.getElementById('valorTotal').value = purchase.valorTotal || 0;
  document.getElementById('formaPagamento').value = purchase.formaPagamento || 'Pix';
  document.getElementById('teveDevolucao').value = purchase.teveDevolucao || 'Não';
  document.getElementById('observacoes').value = purchase.observacoes || '';

  const boletoKeys = ['p1-vencimento', 'p1-pagamento', 'p1-pago', 'p2-vencimento', 'p2-pagamento', 'p2-pago', 'p3-vencimento', 'p3-pagamento', 'p3-pago'];
  boletoKeys.forEach((key) => {
    const el = document.getElementById(key);
    if (!el) return;
    const fieldName = key.replace(/^p\d+-/, '');
    const value = purchase[key] ?? (fieldName === 'pago' ? false : '');
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = value || '';
  });

  toggleBoletoFields();
}

function deletePurchase(id) {
  const confirmed = window.confirm('Deseja excluir esta compra?');
  if (!confirmed) return;

  purchases = purchases.filter((item) => String(item.id) !== String(id));
  savePurchases();
  renderDashboard();
  applyFilters();
}

function handleFormSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const id = document.getElementById('purchase-id').value || String(Date.now());
  const nota = document.getElementById('nota').value.trim();
  const dataCompra = document.getElementById('dataCompra').value;
  const fornecedor = document.getElementById('fornecedor').value.trim();
  const valorTotal = Number(document.getElementById('valorTotal').value) || 0;
  const formaPagamento = document.getElementById('formaPagamento').value;
  const teveDevolucao = document.getElementById('teveDevolucao').value;
  const observacoes = document.getElementById('observacoes').value.trim();

  if (!nota || !dataCompra || !fornecedor || valorTotal <= 0) {
    alert('Preencha corretamente os campos obrigatórios.');
    return;
  }

  const purchase = {
    id,
    nota,
    dataCompra,
    fornecedor,
    local: 'Fornecedor',
    valorTotal,
    formaPagamento,
    teveDevolucao,
    observacoes,
    valorPago: Number(document.getElementById('valorPago')?.value || 0),
    p1-vencimento: document.getElementById('p1-vencimento')?.value || '',
    p1-pagamento: document.getElementById('p1-pagamento')?.value || '',
    p1-pago: document.getElementById('p1-pago')?.checked || false,
    p2-vencimento: document.getElementById('p2-vencimento')?.value || '',
    p2-pagamento: document.getElementById('p2-pagamento')?.value || '',
    p2-pago: document.getElementById('p2-pago')?.checked || false,
    p3-vencimento: document.getElementById('p3-vencimento')?.value || '',
    p3-pagamento: document.getElementById('p3-pagamento')?.value || '',
    p3-pago: document.getElementById('p3-pago')?.checked || false
  };

  const existingIndex = purchases.findIndex((item) => String(item.id) === String(id));
  if (existingIndex >= 0) {
    purchases[existingIndex] = purchase;
  } else {
    purchases.unshift(purchase);
  }

  const paidValue = [purchase['p1-pago'], purchase['p2-pago'], purchase['p3-pago']].filter(Boolean).length > 0
    ? Math.min(valorTotal, valorTotal)
    : 0;

  purchase.valorPago = paidValue;
  purchase.status = calculateStatus(purchase);

  savePurchases();
  renderDashboard();
  applyFilters();
  closeModal();
}

function exportToCSV() {
  if (!purchases.length) {
    alert('Nenhuma compra para exportar.');
    return;
  }

  const headers = ['Nota', 'Data', 'Fornecedor', 'Valor Total', 'Forma de Pagamento', 'Status', 'Devolução'];
  const rows = purchases.map((item) => [
    item.nota || '',
    item.dataCompra || '',
    item.fornecedor || '',
    String(item.valorTotal || 0),
    item.formaPagamento || '',
    calculateStatus(item),
    item.teveDevolucao || 'Não'
  ]);

  const csv = [headers, ...rows]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'compras.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function resetFilters() {
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('filter-status');
  const devolucaoFilter = document.getElementById('filter-devolucao');

  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = 'todos';
  if (devolucaoFilter) devolucaoFilter.value = 'todos';

  renderTable(purchases);
}

function setupInitialUI() {
  const form = document.getElementById('purchase-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  const modal = document.getElementById('purchase-modal');
  if (modal) {
    modal.classList.add('hidden');
  }

  toggleBoletoFields();
  renderDashboard();
  renderTable();
}

window.openModal = openModal;
window.closeModal = closeModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportToCSV = exportToCSV;
window.toggleBoletoFields = toggleBoletoFields;
window.handleFormSubmit = handleFormSubmit;

document.addEventListener('DOMContentLoaded', () => {
  setupInitialUI();
});
