// Kasir dashboard logic with enhanced features and error handling

// DOM Elements
const logoutBtn = document.getElementById('logout-btn');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const productsContainer = document.getElementById('products-container');
const cartItemsContainer = document.getElementById('cart-items');
const checkoutBtn = document.getElementById('checkout-btn');
const loadingSpinner = document.getElementById('loading-spinner');

// State management
let currentUserEmail = null;
let products = [];
let cart = [];

// Utility Functions
function showSpinner() {
  loadingSpinner.classList.remove('hidden');
}

function hideSpinner() {
  loadingSpinner.classList.add('hidden');
}

function showNotification(message, type = 'error', duration = 3000) {
  const container = document.getElementById('notification-container');
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 p-4 rounded-lg ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
  notification.textContent = message;
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, duration);
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// Generate receipt text for dot matrix printer
function generateReceiptText(cart) {
  const date = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  let receiptText = 
`=====================================
           ARUM MOBILE
   Jl. Sumatra 11 No 41
   Sumbersari, Jember
   Telp: 081331089534
=====================================
Tanggal: ${date}
Kasir  : ${currentUserEmail}
=====================================
ITEM                  QTY     TOTAL
-------------------------------------
`;

  cart.forEach(item => {
    const itemName = `${item.brand || ''} ${item.type || ''}`.padEnd(20);
    const qty = `${item.quantity}`.padStart(3);
    const total = formatCurrency(item.price * item.quantity).padStart(12);
    receiptText += `${itemName} ${qty} ${total}\n`;
  });

  const totalAmount = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);

  receiptText += `
=====================================
TOTAL${formatCurrency(totalAmount).padStart(28)}
=====================================

      Terima kasih atas
      kunjungan Anda!

=====================================`;

  return receiptText;
}

// Print receipt using window.print()
function printReceipt(receiptText) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          body {
            font-family: monospace;
            white-space: pre;
            margin: 0;
            padding: 20px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>${receiptText}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
  printWindow.close();
}

// Authentication check
auth.onAuthStateChanged(async (user) => {
  try {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    
    currentUserEmail = user.email;
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists || userDoc.data().role !== 'kasir') {
      showNotification('Akses ditolak. Anda tidak memiliki izin kasir.', 'error');
      await auth.signOut();
      window.location.href = 'index.html';
    } else {
      await loadProducts();
    }
  } catch (error) {
    console.error('Auth error:', error);
    showNotification('Terjadi kesalahan saat memverifikasi akses.', 'error');
  }
});

// Logout handler
logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('Gagal logout. Silakan coba lagi.', 'error');
  }
});

// Load products from Firestore
async function loadProducts() {
  try {
    showSpinner();
    const snapshot = await db.collection('products').get();
    products = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Product loaded:', data);
      return {
        id: doc.id,
        brand: data.brand || '',
        type: data.type || '',
        description: data.description || '',
        price: data.sellPrice || 0,
        stock: data.stock || 0,
        category: data.category || ''
      };
    });
    renderProducts(products);
    loadCategories(products);
  } catch (error) {
    console.error('Load products error:', error);
    showNotification('Gagal memuat daftar produk.', 'error');
  } finally {
    hideSpinner();
  }
}

// Load unique categories from products
function loadCategories(products) {
  const categories = [...new Set(products.map(p => p.category || 'Uncategorized'))];
  categorySelect.innerHTML = '<option value="">Semua Kategori</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
}

// Render products to the UI
function renderProducts(productsToRender) {
  productsContainer.innerHTML = '';
  if (productsToRender.length === 0) {
    productsContainer.innerHTML = '<p class="text-gray-500">Tidak ada produk ditemukan.</p>';
    return;
  }
  productsToRender.forEach(product => {
    const card = document.createElement('div');
    card.className = 'border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm hover:shadow-md transition-shadow';
    card.innerHTML = `
      <div>
        <h4 class="font-semibold text-lg">${product.brand || ''} ${product.type || ''}</h4>
        <p class="text-sm text-gray-600 mt-1">${product.description || ''}</p>
        <p class="mt-2 text-lg font-bold text-indigo-600">${formatCurrency(product.price || 0)}</p>
        <p class="text-sm text-gray-500">Stok: ${product.stock || 0}</p>
      </div>
      <button 
        class="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
        data-id="${product.id}"
        ${(product.stock || 0) <= 0 ? 'disabled' : ''}
      >
        Tambah ke Keranjang
      </button>
    `;
    productsContainer.appendChild(card);
  });

  productsContainer.querySelectorAll('button').forEach(button => {
    if (!button.disabled) {
      button.addEventListener('click', () => {
        const productId = button.getAttribute('data-id');
        addToCart(productId);
      });
    }
  });
}

// Add product to cart
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  if ((product.stock || 0) <= 0) {
    showNotification('Stok produk habis.', 'error');
    return;
  }

  const cartItem = cart.find(item => item.id === productId);
  if (cartItem) {
    if (cartItem.quantity >= (product.stock || 0)) {
      showNotification('Stok tidak mencukupi.', 'error');
      return;
    }
    cartItem.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  
  showNotification('Produk ditambahkan ke keranjang.', 'success');
  renderCart();
}

// Render cart items
function renderCart() {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="text-gray-500">Keranjang kosong</p>';
    checkoutBtn.disabled = true;
    return;
  }

  let total = 0;
  cartItemsContainer.innerHTML = '';
  
  cart.forEach(item => {
    const itemTotal = (item.price || 0) * (item.quantity || 0);
    total += itemTotal;

    const div = document.createElement('div');
    div.className = 'flex justify-between items-start border-b py-3';
    div.innerHTML = `
      <div class="flex-1">
        <p class="font-semibold">${item.brand || ''} ${item.type || ''}</p>
        <p class="text-sm text-gray-600">
          ${formatCurrency(item.price || 0)} x ${item.quantity}
        </p>
      </div>
      <div class="text-right ml-4">
        <p class="font-semibold">${formatCurrency(itemTotal)}</p>
        <button class="text-red-600 hover:text-red-800" data-id="${item.id}">Hapus</button>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });

  const totalDiv = document.createElement('div');
  totalDiv.className = 'mt-4 pt-4 border-t';
  totalDiv.innerHTML = `
    <div class="flex justify-between items-center">
      <p class="font-semibold">Total:</p>
      <p class="font-bold text-lg">${formatCurrency(total)}</p>
    </div>
  `;
  cartItemsContainer.appendChild(totalDiv);

  checkoutBtn.disabled = false;

  cartItemsContainer.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      const productId = button.getAttribute('data-id');
      removeFromCart(productId);
    });
  });
}

// Remove product from cart
function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  showNotification('Produk dihapus dari keranjang.', 'success');
  renderCart();
}

// Filter products based on search and category
function filterProducts() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = categorySelect.value;
  
  const filtered = products.filter(product => {
    const matchesSearch = 
      (product.brand?.toLowerCase().includes(searchTerm) || false) ||
      (product.type?.toLowerCase().includes(searchTerm) || false) ||
      (product.description?.toLowerCase().includes(searchTerm) || false);
    
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  renderProducts(filtered);
}

// Event listeners for search and category filter
searchInput.addEventListener('input', filterProducts);
categorySelect.addEventListener('change', filterProducts);

// Checkout handler
checkoutBtn.addEventListener('click', async () => {
  if (cart.length === 0) return;

  const paymentMethodSelect = document.getElementById('payment-method');
  const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : 'cash';

  try {
    showSpinner();
    
    // Generate receipt text first
    const receiptText = generateReceiptText(cart, paymentMethod);
    
    // Create transaction object with null checks and payment method
    const transaction = {
      kasirEmail: currentUserEmail,
      paymentMethod: paymentMethod,
      items: cart.map(item => ({
        productId: item.id,
        brand: item.brand || '',
        type: item.type || '',
        quantity: item.quantity || 0,
        pricePerUnit: item.price || 0,
        totalPrice: (item.price || 0) * (item.quantity || 0)
      })),
      totalAmount: cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      receipt: receiptText
    };

    // Add transaction
    const transactionRef = await db.collection('transactions').add(transaction);

    // Update product stock
    await Promise.all(cart.map(item => 
      db.collection('products').doc(item.id).update({
        stock: firebase.firestore.FieldValue.increment(-(item.quantity || 0))
      })
    ));

    // Print receipt
    printReceipt(receiptText);

    showNotification('Transaksi berhasil!', 'success');
    cart = [];
    renderCart();
    await loadProducts();

  } catch (error) {
    console.error('Checkout error:', error);
    showNotification('Gagal memproses transaksi.', 'error');
  } finally {
    hideSpinner();
  }
});

// Fetch and display daily sales report
async function loadDailySalesReport() {
  try {
    showSpinner();
    const salesReportContent = document.getElementById('sales-report-content');
    salesReportContent.textContent = 'Memuat laporan...';

    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date();
    endOfDay.setHours(23,59,59,999);

    const snapshot = await db.collection('transactions')
      .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
      .where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
      .orderBy('timestamp', 'asc')
      .get();

    if (snapshot.empty) {
      salesReportContent.textContent = 'Tidak ada transaksi hari ini.';
      return;
    }

    let reportText = 'Laporan Penjualan Harian\n========================\n\n';
    let totalSales = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const date = data.timestamp ? data.timestamp.toDate().toLocaleTimeString('id-ID') : '';
      const payment = data.paymentMethod || 'N/A';
      const amount = data.totalAmount || 0;
      totalSales += amount;
      reportText += `${date} | ${payment.padEnd(12)} | ${formatCurrency(amount)}\n`;
    });

    reportText += `\nTotal Penjualan: ${formatCurrency(totalSales)}`;

    salesReportContent.textContent = reportText;
  } catch (error) {
    console.error('Load daily sales report error:', error);
    showNotification('Gagal memuat laporan penjualan.', 'error');
  } finally {
    hideSpinner();
  }
}

// Print daily sales report
const printReportBtn = document.getElementById('print-report-btn');
if (printReportBtn) {
  printReportBtn.addEventListener('click', () => {
    const salesReportContent = document.getElementById('sales-report-content');
    if (!salesReportContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Penjualan Harian</title>
          <style>
            body {
              font-family: monospace;
              white-space: pre;
              margin: 0;
              padding: 20px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>${salesReportContent.textContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  });
}

// Load daily sales report on page load
window.addEventListener('load', () => {
  loadDailySalesReport();
});

// Initial render
renderCart();
