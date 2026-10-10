const API_URL = '/api/purchases';
const SUPABASE_URL = 'https://toetkmsndyqeoaqjpqrf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZXRrbXNuZHlxZW9hcWpwcXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTM4NzUsImV4cCI6MjEwNzIyOTg3NX0.1c2qwoTXrh8l1gFnNKPRy9fpX5acFb_XCSaqHYWS8sc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let compras = [];
let compraEmEdicao = null;

function formatCurrency(value) {
  const numericValue = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numericValue);
}

function safeNumber(value) {
  const cleaned = String(value ?? '0').replace(/[R$\s.]/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCompra(item) {
  const total = safeNumber(item.valorTotal ?? item.valor_total ?? item.total ?? item.valor ?? 0);
  const pago = safeNumber(item.valorPago ?? item.valor_pago ?? item.pago ?? 0);
  const pendente = Math.max(total - pago, 0);

  return {
    ...item,
    id: String(item.id ?? item._id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    fornecedor: item.fornecedor || item.fornecedorNome || 'Fornecedor',
    nota: item.nota || item.notaFiscal || item.nf || '',
    dataCompra: item.dataCompra || item.data_compra || item.data || new Date().toISOString().slice(0, 10),
    formaPagamento: item.formaPagamento || item.forma_pagamento || item.pagamento || 'À vista',
    valorTotal: total,
    valorPago: pago,
    valorPendente: pendente,
    status: item.status || (pago >= total ? 'Pago' : 'Pendente')
  };
}

async function carregarCompras() {
  const status = document.getElementById('statusMessage');
  try {
    const { data, error } = await supabase
      .from('compras')
      .select('*')
      .order('data_compra', { ascending: false });

    if (error) throw error;

    compras = Array.isArray(data) ? data.map(normalizeCompra) : [];

    if (status) {
      status.textContent = 'Dados sincronizados com o Supabase';
      status.className = 'text-xs text-emerald-600';
    }

    renderDashboard();
    renderTabela();
  } catch (error) {
    console.error('Erro ao carregar compras:', error);
    if (status) {
      status.textContent = 'Erro ao carregar dados compartilhados';
      status.className = 'text-xs text-red-600';
    }

    compras = [];
    renderDashboard();
    renderTabela();
  }
}

async function salvarCompras() {
  try {
    const rows = compras.map((item) => ({
      id: String(item.id),
      fornecedor: item.fornecedor || 'Fornecedor',
      nota: item.nota || '',
      data_compra: item.dataCompra || new Date().toISOString().slice(0, 10),
      forma_pagamento: item.formaPagamento || 'À vista',
      valor_total: Number(item.valorTotal || 0),
      valor_pago: Number(item.valorPago || 0),
      valor_pendente: Number(item.valorPendente || 0),
      status: item.status || 'Pendente'
    }));

    const { error } = await supabase
      .from('compras')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao salvar compras:', error);
    return false;
  }
}

function renderDashboard() {
  const totalComprado = compras.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  const totalPago = compras.reduce((acc, item) => acc + Number(item.valorPago || 0), 0);
  const totalPendente = compras.reduce((acc, item) => acc + Number(item.valorPendente || 0), 0);

  const totalNode = document.getElementById('dash-total');
  if (totalNode) totalNode.textContent = formatCurrency(totalComprado);

  const countNode = document.getElementById('dash-count');
  if (countNode) countNode.textContent = `${compras.length} compra${compras.length === 1 ? '' : 's'} registrada${compras.length === 1 ? '' : 's'}`;

  const pagoNode = document.getElementById('dash-pago');
  if (pagoNode) pagoNode.textContent = formatCurrency(totalPago);

  const pagoPercentNode = document.getElementById('dash-pago-percent');
  if (pagoPercentNode) {
    const pct = totalComprado > 0 ? (totalPago / totalComprado) * 100 : 0;
    pagoPercentNode.textContent = `${pct.toFixed(0)}% do total`;
  }

  const pendenteNode = document.getElementById('dash-pendente');
  if (pendenteNode) pendenteNode.textContent = formatCurrency(totalPendente);

  const pendentePercentNode = document.getElementById('dash-pendente-percent');
  if (pendentePercentNode) {
    const pct = totalComprado > 0 ? (totalPendente / totalComprado) * 100 : 0;
    pendentePercentNode.textContent = `${pct.toFixed(0)}% pendente`;
  }
}

function renderTabela() {
  const tabelaBody = document.querySelector('table tbody') || document.getElementById('compras-tbody') || document.getElementById('table-body');
  if (!tabelaBody) return;

  if (!compras.length) {
    tabelaBody.innerHTML = `
      <tr>
        <td colspan="100%" class="px-4 py-10 text-center text-slate-500">
          Nenhuma compra cadastrada.
        </td>
      </tr>
    `;
    return;
  }

  tabelaBody.innerHTML = compras
    .slice()
    .sort((a, b) => new Date(b.dataCompra) - new Date(a.dataCompra))
    .map((item) => {
      const statusClass = item.valorPago >= item.valorTotal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
      return `
        <tr class="border-b border-slate-200 hover:bg-slate-50 text-sm">
          <td class="px-4 py-3 font-medium text-slate-700">${item.nota || '-'}</td>
          <td class="px-4 py-3">${item.fornecedor}</td>
          <td class="px-4 py-3">${item.dataCompra || '-'}</td>
          <td class="px-4 py-3">${item.formaPagamento}</td>
          <td class="px-4 py-3 font-semibold">${formatCurrency(item.valorTotal)}</td>
          <td class="px-4 py-3">${formatCurrency(item.valorPago)}</td>
          <td class="px-4 py-3">${formatCurrency(item.valorPendente)}</td>
          <td class="px-4 py-3">
            <span class="inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${item.status || 'Pendente'}</span>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <button data-action="editar" data-id="${item.id}" class="text-blue-600 hover:text-blue-800" title="Editar">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button data-action="excluir" data-id="${item.id}" class="text-red-600 hover:text-red-800" title="Excluir">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  document.querySelectorAll('[data-action="editar"]').forEach((button) => {
    button.addEventListener('click', () => abrirFormularioEdicao(button.dataset.id));
  });

  document.querySelectorAll('[data-action="excluir"]').forEach((button) => {
    button.addEventListener('click', () => excluirCompra(button.dataset.id));
  });
}

function preencherFormulario(item) {
  const modal = document.getElementById('purchase-modal') || document.getElementById('modal');
  if (modal) modal.classList.remove('hidden');

  const campos = {
    fornecedor: document.getElementById('fornecedor') || document.getElementById('input-fornecedor'),
    nota: document.getElementById('nota') || document.getElementById('input-nota'),
    dataCompra: document.getElementById('dataCompra') || document.getElementById('input-dataCompra'),
    formaPagamento: document.getElementById('formaPagamento') || document.getElementById('input-formaPagamento'),
    valorTotal: document.getElementById('valorTotal') || document.getElementById('input-valorTotal'),
    valorPago: document.getElementById('valorPago') || document.getElementById('input-valorPago')
  };

  if (campos.fornecedor) campos.fornecedor.value = item?.fornecedor || '';
  if (campos.nota) campos.nota.value = item?.nota || '';
  if (campos.dataCompra) campos.dataCompra.value = item?.dataCompra || new Date().toISOString().slice(0, 10);
  if (campos.formaPagamento) campos.formaPagamento.value = item?.formaPagamento || 'À vista';
  if (campos.valorTotal) campos.valorTotal.value = item?.valorTotal || '';
  if (campos.valorPago) campos.valorPago.value = item?.valorPago || '';
}

function abrirFormularioEdicao(id) {
  const item = compras.find((compra) => String(compra.id) === String(id));
  if (!item) return;

  compraEmEdicao = item;
  preencherFormulario(item);

  const submitButton = document.getElementById('submit-compra') || document.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Salvar Alterações';
}

function fecharModal() {
  const modal = document.getElementById('purchase-modal') || document.getElementById('modal');
  if (modal) modal.classList.add('hidden');

  compraEmEdicao = null;
  const submitButton = document.getElementById('submit-compra') || document.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Salvar Compra';

  const form = document.getElementById('purchase-form') || document.querySelector('form');
  if (form) form.reset();
}

function abrirModal() {
  compraEmEdicao = null;
  const modal = document.getElementById('purchase-modal') || document.getElementById('modal');
  if (modal) modal.classList.remove('hidden');

  const form = document.getElementById('purchase-form') || document.querySelector('form');
  if (form) form.reset();

  const submitButton = document.getElementById('submit-compra') || document.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Salvar Compra';
}

async function salvarCompraFormulario(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const fornecedor = (form.querySelector('[name="fornecedor"], #fornecedor, #input-fornecedor') || {}).value || '';
  const nota = (form.querySelector('[name="nota"], #nota, #input-nota') || {}).value || '';
  const dataCompra = (form.querySelector('[name="dataCompra"], #dataCompra, #input-dataCompra') || {}).value || new Date().toISOString().slice(0, 10);
  const formaPagamento = (form.querySelector('[name="formaPagamento"], #formaPagamento, #input-formaPagamento') || {}).value || 'À vista';
  const valorTotal = safeNumber((form.querySelector('[name="valorTotal"], #valorTotal, #input-valorTotal') || {}).value || 0);
  const valorPago = safeNumber((form.querySelector('[name="valorPago"], #valorPago, #input-valorPago') || {}).value || 0);

  if (!fornecedor.trim()) {
    alert('Informe o fornecedor.');
    return;
  }

  const compra = normalizeCompra({
    id: compraEmEdicao ? compraEmEdicao.id : `${Date.now()}`,
    fornecedor,
    nota,
    dataCompra,
    formaPagamento,
    valorTotal,
    valorPago,
    status: valorPago >= valorTotal ? 'Pago' : 'Pendente'
  });

  if (compraEmEdicao) {
    compras = compras.map((item) => String(item.id) === String(compraEmEdicao.id) ? compra : item);
  } else {
    compras.push(compra);
  }

  const ok = await salvarCompras();
  if (!ok) {
    alert('Não foi possível salvar a compra. Tente novamente.');
    return;
  }

  renderDashboard();
  renderTabela();
  fecharModal();
}

async function excluirCompra(id) {
  const confirmed = window.confirm('Deseja excluir esta compra?');
  if (!confirmed) return;

  compras = compras.filter((item) => String(item.id) !== String(id));
  const ok = await salvarCompras();

  if (!ok) {
    alert('Não foi possível excluir a compra.');
    return;
  }

  renderDashboard();
  renderTabela();
}

function exportToCSV() {
  if (!compras.length) {
    alert('Nenhuma compra para exportar.');
    return;
  }

  const linhas = [
    ['Fornecedor', 'Nota', 'Data', 'Pagamento', 'Valor Total', 'Valor Pago', 'Valor Pendente', 'Status'],
    ...compras.map((item) => [
      item.fornecedor,
      item.nota,
      item.dataCompra,
      item.formaPagamento,
      item.valorTotal,
      item.valorPago,
      item.valorPendente,
      item.status
    ])
  ];

  const csv = linhas
    .map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = 'compras.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function inicializarEventos() {
  const form = document.getElementById('purchase-form') || document.querySelector('form');
  if (form) {
    form.addEventListener('submit', salvarCompraFormulario);
  }

  const btnNovaCompra = document.querySelector('[onclick*="openModal"]') || document.getElementById('btn-nova-compra');
  if (btnNovaCompra) {
    btnNovaCompra.onclick = abrirModal;
  }

  const btnExportar = document.querySelector('[onclick*="exportToCSV"]') || document.getElementById('btn-exportar');
  if (btnExportar) {
    btnExportar.onclick = exportToCSV;
  }

  const btnFechar = document.getElementById('close-modal') || document.querySelector('[data-close="modal"]');
  if (btnFechar) {
    btnFechar.addEventListener('click', fecharModal);
  }

  const backdrop = document.getElementById('modal-backdrop') || document.getElementById('backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', fecharModal);
  }
}

window.onload = async function () {
  inicializarEventos();
  await carregarCompras();
};

window.openModal = abrirModal;
window.closeModal = fecharModal;
window.exportToCSV = exportToCSV;
window.resetFilters = function () {
  const form = document.getElementById('filter-form') || document.querySelector('form');
  if (form) form.reset();
  renderTabela();
};

window.addEventListener('DOMContentLoaded', inicializarEventos);
