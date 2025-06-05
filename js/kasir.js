// Kasir dashboard logic: transaction and shift management

const logoutBtn = document.getElementById('logout-btn');
const productSelect = document.getElementById('product-select');
const productQuantity = document.getElementById('product-quantity');
const totalPriceInput = document.getElementById('total-price');
const transactionForm = document.getElementById('transaction-form');

const startShiftBtn = document.getElementById('start-shift-btn');
const currentShiftInfo = document.getElementById('current-shift-info');

const receiptSection = document.getElementById('receipt-section');
const receiptPre = document.getElementById('receipt');
const printReceiptBtn = document.getElementById('print-receipt-btn');

let currentShiftId = null;
let currentUserEmail = null;

// Check auth state and role
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  currentUserEmail = user.email;
  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'kasir') {
    alert('Access denied.');
    await auth.signOut();
    window.location.href = 'index.html';
  } else {
    loadProducts();
    loadCurrentShift();
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  window.location.href = 'index.html';
});

// Load products into select dropdown
async function loadProducts() {
  productSelect.innerHTML = '<option value="">Pilih Produk</option>';
  const snapshot = await db.collection('products').get();
  snapshot.forEach(doc => {
    const p = doc.data();
    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = `${p.name} - Rp ${p.sellPrice}`;
    option.dataset.sellPrice = p.sellPrice;
    productSelect.appendChild(option);
  });
}

// Calculate total price on quantity or product change
productSelect.addEventListener('change', calculateTotal);
productQuantity.addEventListener('input', calculateTotal);

function calculateTotal() {
  const selectedOption = productSelect.options[productSelect.selectedIndex];
  if (!selectedOption || !selectedOption.value) {
    totalPriceInput.value = '';
    return;
  }
  const price = parseFloat(selectedOption.dataset.sellPrice) || 0;
  const quantity = parseInt(productQuantity.value) || 0;
  const total = price * quantity;
  totalPriceInput.value = total.toFixed(2);
}

// Save transaction
transactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const productId = productSelect.value;
  const quantity = parseInt(productQuantity.value);
  if (!productId || isNaN(quantity) || quantity <= 0) {
    alert('Pilih produk dan masukkan jumlah yang valid.');
    return;
  }

  try {
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      alert('Produk tidak ditemukan.');
      return;
    }
    const product = productDoc.data();
    if (product.stock < quantity) {
      alert('Stok produk tidak cukup.');
      return;
    }

    const totalPrice = product.sellPrice * quantity;

    // Save transaction
    await db.collection('transactions').add({
      kasirEmail: currentUserEmail,
      productId,
      productName: product.name,
      quantity,
      totalPrice,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update product stock
    await db.collection('products').doc(productId).update({
      stock: product.stock - quantity
    });

    // Show receipt
    showReceipt(product.name, quantity, product.sellPrice, totalPrice);

    // Reset form
    transactionForm.reset();
    totalPriceInput.value = '';
  } catch (error) {
    alert('Error menyimpan transaksi: ' + error.message);
  }
});

function showReceipt(name, quantity, price, total) {
  const date = new Date().toLocaleString();
  const receiptText = 
`Arum Mobile
Jl. Sumatra 11 No 41, Sumbersari, Jember
No HP: 081331089534

Produk: ${name}
Jumlah: ${quantity}
Harga Satuan: Rp ${price.toFixed(2)}
Total: Rp ${total.toFixed(2)}

Tanggal: ${date}

Terima kasih atas kunjungan Anda!
`;
  receiptPre.textContent = receiptText;
  receiptSection.style.display = 'block';
}

// Print receipt
printReceiptBtn.addEventListener('click', () => {
  window.print();
});

// Shift management
startShiftBtn.addEventListener('click', async () => {
  try {
    const shiftDoc = await db.collection('shifts').add({
      kasirEmail: currentUserEmail,
      startTime: firebase.firestore.FieldValue.serverTimestamp()
    });
    currentShiftId = shiftDoc.id;
    loadCurrentShift();
  } catch (error) {
    alert('Error memulai shift: ' + error.message);
  }
});

async function loadCurrentShift() {
  const snapshot = await db.collection('shifts')
    .where('kasirEmail', '==', currentUserEmail)
    .orderBy('startTime', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    currentShiftInfo.textContent = 'Belum ada shift aktif.';
    currentShiftId = null;
  } else {
    const shift = snapshot.docs[0].data();
    const startTime = shift.startTime ? shift.startTime.toDate().toLocaleString() : '';
    currentShiftInfo.textContent = `Shift aktif dimulai pada: ${startTime}`;
    currentShiftId = snapshot.docs[0].id;
  }
}
