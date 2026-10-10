const purchaseForm = document.querySelector('#purchaseForm');
const purchaseList = document.querySelector('#purchaseList');

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

  const totalValue = (quantity * unitValue).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const newItem = document.createElement('li');
  newItem.innerHTML = `
    <div>
      <strong>${productName}</strong>
      <small>Fornecedor: ${supplier}</small>
    </div>
    <span class="price">${totalValue}</span>
  `;

  purchaseList.prepend(newItem);
  purchaseForm.reset();
  document.querySelector('#quantity').value = 1;
  document.querySelector('#unitValue').value = 0;
});
