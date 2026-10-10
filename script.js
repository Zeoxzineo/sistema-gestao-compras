const STORAGE_KEY = 'sistema-gestao-compras-itens';
const fallbackStore = {};

function getStorage() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return localStorage;
  } catch (error) {
    try {
      return sessionStorage;
    } catch (sessionError) {
      return {
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(fallbackStore, key) ? fallbackStore[key] : null;
        },
        setItem(key, value) {
          fallbackStore[key] = String(value);
        },
        removeItem(key) {
          delete fallbackStore[key];
        }
      };
    }
  }
}

function loadPurchases() {
  const storage = getStorage();
  const raw = storage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function savePurchases(items) {
  const storage = getStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const purchaseForm = document.querySelector('#purchaseForm');
const purchaseList = document.querySelector('#purchaseList');

function renderPurchases() {
  const purchases = loadPurchases();
  purchaseList.innerHTML = '';

  if (purchases.length === 0) {
    const empty = document.createElement('li');
    empty.innerHTML = `
      <div>
        <strong>Nenhuma compra salva</strong>
        <small>Cadastre seu primeiro pedido acima.</small>
      </div>
    `;
    purchaseList.appendChild(empty);
    return;
  }

  purchases.forEach((item) => {
    const totalValue = Number(item.totalValue || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <div>
        <strong>${item.productName}</strong>
        <small>Fornecedor: ${item.supplier}</small>
      </div>
      <span class="price">${totalValue}</span>
    `;

    purchaseList.appendChild(listItem);
  });
}

purchaseForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const productName = document.querySelector('#productName').value.trim();
  const supplier = document.querySelector('#supplier').value.trim();
  const quantity = Number(document.querySelector('#quantity').value);
  const unitValue = Number(document.querySelector('#unitValue').value);

  if (!productName || !supplier || quantity <= 0 || unitValue < 0) {
    alert('Preencha todos os campos corretamente.');
    return;
  }

  const purchases = loadPurchases();
  const totalValue = quantity * unitValue;

  purchases.unshift({
    id: Date.now(),
    productName,
    supplier,
    quantity,
    unitValue,
    totalValue,
    createdAt: new Date().toISOString()
  });

  savePurchases(purchases);
  renderPurchases();
  purchaseForm.reset();
  document.querySelector('#quantity').value = 1;
  document.querySelector('#unitValue').value = 0;
});

renderPurchases();
