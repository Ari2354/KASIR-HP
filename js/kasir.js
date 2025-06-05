const logoutBtn = document.getElementById('logout-btn');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const productsContainer = document.getElementById('products-container');
const cartItemsContainer = document.getElementById('cart-items');
const checkoutBtn = document.getElementById('checkout-btn');
const loadingSpinner = document.getElementById('loading-spinner');

let currentUserEmail = null;
let products = [];
let cart = [];

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

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

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

logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('Gagal logout. Silakan coba lagi.', 'error');
  }
});

async function loadProducts() {
  try {
    showSpinner();
    const snapshot = await db.collection('products').get();
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts(products);
    loadCategories(products);
  } catch (error) {
    console.error('Load products error:', error);
    showNotification('Gagal memuat daftar produk.', 'error');
  } finally {
    hideSpinner();
  }
}

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
        ${product.stock <= 0 ? 'disabled' : ''}
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

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  if (product.stock <= 0) {
    showNotification('Stok produk habis.', 'error');
    return;
  }

  const cartItem = cart.find(item => item.id === productId);
  if (cartItem) {
    if (cartItem.quantity >= product.stock) {
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

function renderCart() {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="text-gray-500">Keranjang kosong</p>';
    checkoutBtn.disabled = true;
    return;
  }

  let total = 0;
  cartItemsContainer.innerHTML = '';
  
  cart.forEach(item => {
    const itemTotal = (item.price || 0) * item.quantity;
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

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  showNotification('Produk dihapus dari keranjang.', 'success');
  renderCart();
}

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

searchInput.addEventListener('input', filterProducts);
categorySelect.addEventListener('change', filterProducts);

checkoutBtn.addEventListener('click', async () => {
  if (cart.length === 0) return;

  try {
    showSpinner();
    
    const transaction = {
      kasirEmail: currentUserEmail,
      items: cart.map(item => ({
        productId: item.id,
        brand: item.brand,
        type: item.type,
        quantity: item.quantity,
        pricePerUnit: item.price,
        totalPrice: item.price * item.quantity
      })),
      totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    const transactionRef = await db.collection('transactions').add(transaction);

    await Promise.all(cart.map(item => 
      db.collection('products').doc(item.id).update({
        stock: firebase.firestore.FieldValue.increment(-item.quantity)
      })
    ));

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

renderCart();
