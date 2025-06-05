// Admin dashboard logic: product management, user management, transaction management, reports

const logoutBtn = document.getElementById('logout-btn');
const productForm = document.getElementById('product-form');
const productsTableBody = document.querySelector('#products-table tbody');
const productCancelBtn = document.getElementById('product-cancel-btn');

const transactionsTableBody = document.querySelector('#transactions-table tbody');

const totalRevenueEl = document.getElementById('total-revenue');
const totalCostEl = document.getElementById('total-cost');
const profitLossEl = document.getElementById('profit-loss');

const kasirForm = document.getElementById('kasir-form');
const kasirTableBody = document.querySelector('#kasir-table tbody');

let editProductId = null;

// Check auth state and role
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    alert('Access denied.');
    await auth.signOut();
    window.location.href = 'index.html';
  } else {
    loadProducts();
    loadTransactions();
    loadKasirs();
    loadReport();
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  window.location.href = 'index.html';
});

// Product management
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = productForm['product-name'].value.trim();
  const buyPrice = parseFloat(productForm['product-buy-price'].value);
  const sellPrice = parseFloat(productForm['product-sell-price'].value);
  const stock = parseInt(productForm['product-stock'].value);
  const category = productForm['product-category'].value.trim();

  if (!name || isNaN(buyPrice) || isNaN(sellPrice) || isNaN(stock)) {
    alert('Please fill all required fields correctly.');
    return;
  }

  try {
    if (editProductId) {
      await db.collection('products').doc(editProductId).update({
        name, buyPrice, sellPrice, stock, category
      });
      editProductId = null;
    } else {
      await db.collection('products').add({
        name, buyPrice, sellPrice, stock, category
      });
    }
    productForm.reset();
    loadProducts();
  } catch (error) {
    alert('Error saving product: ' + error.message);
  }
});

productCancelBtn.addEventListener('click', () => {
  editProductId = null;
  productForm.reset();
});

async function loadProducts() {
  productsTableBody.innerHTML = '';
  const snapshot = await db.collection('products').get();
  snapshot.forEach(doc => {
    const p = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.buyPrice}</td>
      <td>${p.sellPrice}</td>
      <td>${p.stock}</td>
      <td>${p.category || ''}</td>
      <td>
        <button class="edit-btn" data-id="${doc.id}">Edit</button>
        <button class="delete-btn" data-id="${doc.id}">Hapus</button>
      </td>
    `;
    productsTableBody.appendChild(tr);
  });

  // Attach event listeners for edit and delete buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const doc = await db.collection('products').doc(id).get();
      if (doc.exists) {
        const p = doc.data();
        editProductId = id;
        productForm['product-id'].value = id;
        productForm['product-name'].value = p.name;
        productForm['product-buy-price'].value = p.buyPrice;
        productForm['product-sell-price'].value = p.sellPrice;
        productForm['product-stock'].value = p.stock;
        productForm['product-category'].value = p.category || '';
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Yakin ingin menghapus produk ini?')) {
        try {
          await db.collection('products').doc(id).delete();
          loadProducts();
        } catch (error) {
          alert('Error menghapus produk: ' + error.message);
        }
      }
    });
  });
}

// Transaction management
async function loadTransactions() {
  transactionsTableBody.innerHTML = '';
  const snapshot = await db.collection('transactions').orderBy('timestamp', 'desc').get();
  snapshot.forEach(doc => {
    const t = doc.data();
    const tr = document.createElement('tr');
    const date = t.timestamp ? t.timestamp.toDate().toLocaleString() : '';
    tr.innerHTML = `
      <td>${doc.id}</td>
      <td>${t.kasirEmail || ''}</td>
      <td>${t.productName || ''}</td>
      <td>${t.quantity || ''}</td>
      <td>${t.totalPrice || ''}</td>
      <td>${date}</td>
      <td><button class="delete-transaction-btn" data-id="${doc.id}">Hapus</button></td>
    `;
    transactionsTableBody.appendChild(tr);
  });

  document.querySelectorAll('.delete-transaction-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const password = prompt('Masukkan password admin untuk verifikasi:');
      if (!password) return;
      try {
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        await db.collection('transactions').doc(id).delete();
        loadTransactions();
      } catch (error) {
        alert('Verifikasi gagal: ' + error.message);
      }
    });
  });
}

// Report: calculate profit/loss
async function loadReport() {
  let totalRevenue = 0;
  let totalCost = 0;
  const snapshot = await db.collection('transactions').get();
  for (const doc of snapshot.docs) {
    const t = doc.data();
    totalRevenue += t.totalPrice || 0;
    // Get product buy price for cost calculation
    if (t.productId) {
      const productDoc = await db.collection('products').doc(t.productId).get();
      if (productDoc.exists) {
        const product = productDoc.data();
        totalCost += (product.buyPrice || 0) * (t.quantity || 0);
      }
    }
  }
  totalRevenueEl.textContent = totalRevenue.toFixed(2);
  totalCostEl.textContent = totalCost.toFixed(2);
  profitLossEl.textContent = (totalRevenue - totalCost).toFixed(2);
}

// Kasir management
kasirForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = kasirForm['kasir-email'].value.trim();
  const password = kasirForm['kasir-password'].value;

  if (!email || !password) {
    alert('Email dan password harus diisi.');
    return;
  }

  try {
    // Create user with Firebase Authentication
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Save role in Firestore
    await db.collection('users').doc(user.uid).set({
      role: 'kasir',
      email: email
    });

    kasirForm.reset();
    loadKasirs();
  } catch (error) {
    alert('Error menambah kasir: ' + error.message);
  }
});

async function loadKasirs() {
  kasirTableBody.innerHTML = '';
  const snapshot = await db.collection('users').where('role', '==', 'kasir').get();
  snapshot.forEach(doc => {
    const user = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.email || ''}</td>
      <td><button class="delete-kasir-btn" data-id="${doc.id}">Hapus</button></td>
    `;
    kasirTableBody.appendChild(tr);
  });

  document.querySelectorAll('.delete-kasir-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Yakin ingin menghapus akun kasir ini?')) {
        try {
          // Delete user from Firebase Authentication and Firestore
          await db.collection('users').doc(id).delete();
          // Note: Deleting user from Firebase Auth requires Admin SDK, so here only Firestore doc is deleted
          loadKasirs();
        } catch (error) {
          alert('Error menghapus kasir: ' + error.message);
        }
      }
    });
  });
}

// Sidebar navigation logic

document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', function() {
    // Hapus kelas 'active' dari semua item
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    // Tambahkan kelas 'active' ke item yang diklik
    this.classList.add('active');

    // Sembunyikan semua section
    document.querySelectorAll('.content-section').forEach(section => section.style.display = 'none');
    // Tampilkan section yang sesuai dengan data-target
    const target = this.getAttribute('data-target');
    const section = document.getElementById(target);
    if (section) section.style.display = 'block';
  });
});

// Saat halaman pertama kali dibuka, tampilkan section pertama saja
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.content-section').forEach((section, idx) => {
    section.style.display = idx === 0 ? 'block' : 'none';
  });
});
