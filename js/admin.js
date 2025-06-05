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
  const brand = productForm['product-brand'] ? productForm['product-brand'].value.trim() : '';
  const type = productForm['product-type'] ? productForm['product-type'].value.trim() : '';
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
        name, brand, type, buyPrice, sellPrice, stock, category
      });
      editProductId = null;
    } else {
      await db.collection('products').add({
        name, brand, type, buyPrice, sellPrice, stock, category
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
      <td>${p.brand || ''}</td>
      <td>${p.type || ''}</td>
      <td>${p.buyPrice}</td>
      <td>${p.sellPrice}</td>
      <td>${p.stock}</td>
      <td>${p.category || ''}</td>
      <td class="space-x-2">
        <button class="edit-btn flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-md hover:bg-blue-700 transition" data-id="${doc.id}">
          <i class="fa fa-edit"></i> Edit
        </button>
        <button class="delete-btn flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-md hover:bg-red-700 transition" data-id="${doc.id}">
          <i class="fa fa-trash"></i> Hapus
        </button>
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
async function loadTransactions(filter = 'all') {
  transactionsTableBody.innerHTML = '';
  let query = db.collection('transactions').orderBy('timestamp', 'desc');

  const now = new Date();
  let startDate;

  if (filter === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (filter === 'weekly') {
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  } else if (filter === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (startDate) {
    query = query.where('timestamp', '>=', startDate);
  }

  const snapshot = await query.get();
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
        loadTransactions(filter);
      } catch (error) {
        alert('Verifikasi gagal: ' + error.message);
      }
    });
  });
}

document.getElementById('daily-transactions-btn').addEventListener('click', () => {
  loadTransactions('daily');
});

document.getElementById('weekly-transactions-btn').addEventListener('click', () => {
  loadTransactions('weekly');
});

document.getElementById('monthly-transactions-btn').addEventListener('click', () => {
  loadTransactions('monthly');
});

async function loadReport() {
  let totalRevenue = 0;
  let totalCost = 0;
  const snapshot = await db.collection('transactions').get();
  for (const doc of snapshot.docs) {
    const t = doc.data();
    totalRevenue += t.totalPrice || 0;
    if (t.productId) {
      const productDoc = await db.collection('products').doc(t.productId).get();
      if (productDoc.exists) {
        const product = productDoc.data();
        totalCost += (product.buyPrice || 0) * (t.quantity || 0);
      }
    }
  }
  totalRevenueEl.textContent = `Rp ${totalRevenue.toLocaleString('id-ID')}`;
  totalCostEl.textContent = `Rp ${totalCost.toLocaleString('id-ID')}`;
  const profitLoss = totalRevenue - totalCost;
  profitLossEl.textContent = `Rp ${profitLoss.toLocaleString('id-ID')}`;
  if (profitLoss >= 0) {
    profitLossEl.classList.remove('text-red-600');
    profitLossEl.classList.add('text-green-600');
  } else {
    profitLossEl.classList.remove('text-green-600');
    profitLossEl.classList.add('text-red-600');
  }
}
document.getElementById('reset-report-btn').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) {
    alert('Anda harus login terlebih dahulu.');
    return;
  }
  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'superadmin') {
    alert('Akses ditolak. Hanya Super Admin yang dapat mereset pendapatan.');
    return;
  }
  if (confirm('Apakah Anda yakin ingin mereset total pendapatan?')) {
    try {
      // Reset logic: delete all transactions or set total revenue to zero
      // Here, we delete all transactions as an example
      const snapshot = await db.collection('transactions').get();
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      loadReport();
      alert('Total pendapatan berhasil direset.');
    } catch (error) {
      alert('Gagal mereset total pendapatan: ' + error.message);
    }
  }
});

// Search products by Merek HP, Tipe HP, and HP or Aksesoris
document.getElementById('product-form').insertAdjacentHTML('beforebegin', `
  <div class="mb-4 flex gap-3">
    <input type="text" id="search-brand" placeholder="Cari Merek" class="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    <input type="text" id="search-type" placeholder="Cari Tipe" class="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    <select id="search-name" class="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500">
      <option value="">Semua</option>
      <option value="HP">HP</option>
      <option value="Aksesoris">Aksesoris</option>
    </select>
    <button id="search-btn" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">Cari</button>
    <button id="clear-search-btn" class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition">Reset</button>
  </div>
`);

document.getElementById('search-btn').addEventListener('click', async () => {
  const brand = document.getElementById('search-brand').value.trim().toLowerCase();
  const type = document.getElementById('search-type').value.trim().toLowerCase();
  const name = document.getElementById('search-name').value;

  const snapshot = await db.collection('products').get();
  const filtered = snapshot.docs.filter(doc => {
    const p = doc.data();
    const matchBrand = brand ? p.brand?.toLowerCase().includes(brand) : true;
    const matchType = type ? p.type?.toLowerCase().includes(type) : true;
    const matchName = name ? p.name === name : true;
    return matchBrand && matchType && matchName;
  });

  productsTableBody.innerHTML = '';
  filtered.forEach(doc => {
    const p = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.brand || ''}</td>
      <td>${p.type || ''}</td>
      <td>${p.buyPrice}</td>
      <td>${p.sellPrice}</td>
      <td>${p.stock}</td>
      <td>${p.category || ''}</td>
      <td class="space-x-2">
        <button class="edit-btn flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-md hover:bg-blue-700 transition" data-id="${doc.id}">
          <i class="fa fa-edit"></i> Edit
        </button>
        <button class="delete-btn flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-md hover:bg-red-700 transition" data-id="${doc.id}">
          <i class="fa fa-trash"></i> Hapus
        </button>
      </td>
    `;
    productsTableBody.appendChild(tr);
  });

  // Re-attach event listeners for new buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const doc = await db.collection('products').doc(id).get();
      if (doc.exists) {
        const p = doc.data();
        editProductId = id;
        productForm['product-id'].value = id;
        productForm['product-name'].value = p.name;
        productForm['product-brand'].value = p.brand || '';
        productForm['product-type'].value = p.type || '';
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
});

document.getElementById('clear-search-btn').addEventListener('click', () => {
  document.getElementById('search-brand').value = '';
  document.getElementById('search-type').value = '';
  document.getElementById('search-name').value = '';
  loadProducts();
});

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

const kasirShiftsSectionHTML = `
  <section id="kasir-shifts-section" class="content-section hidden">
    <h3 class="text-xl font-semibold mb-4 flex justify-between items-center">
      Shift Kasir
      <button id="close-shifts-btn" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm font-semibold">
        Tutup
      </button>
    </h3>
    <table id="kasir-shifts-table" class="w-full border-collapse border border-gray-300 text-left">
      <thead class="bg-indigo-100">
        <tr>
          <th class="border border-gray-300 px-3 py-2">Kasir</th>
          <th class="border border-gray-300 px-3 py-2">Shift Mulai</th>
          <th class="border border-gray-300 px-3 py-2">Shift Selesai</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </section>
`;

// Insert kasir shifts section after kasir management section
const kasirManagementSection = document.getElementById('kasir-management');
kasirManagementSection.insertAdjacentHTML('afterend', kasirShiftsSectionHTML);

const kasirShiftsSection = document.getElementById('kasir-shifts-section');
const kasirShiftsTableBody = document.querySelector('#kasir-shifts-table tbody');

document.getElementById('view-shifts-btn').addEventListener('click', async () => {
  // Show kasir shifts section and hide kasir management section
  kasirManagementSection.style.display = 'none';
  kasirShiftsSection.style.display = 'block';

  // Load kasir shifts data from Firestore collection 'kasirShifts'
  kasirShiftsTableBody.innerHTML = '';
  try {
    const snapshot = await db.collection('kasirShifts').orderBy('shiftStart', 'desc').get();
    snapshot.forEach(doc => {
      const shift = doc.data();
      const tr = document.createElement('tr');
      const shiftStart = shift.shiftStart ? shift.shiftStart.toDate().toLocaleString() : '';
      const shiftEnd = shift.shiftEnd ? shift.shiftEnd.toDate().toLocaleString() : '';
      tr.innerHTML = `
        <td>${shift.kasirEmail || ''}</td>
        <td>${shiftStart}</td>
        <td>${shiftEnd}</td>
      `;
      kasirShiftsTableBody.appendChild(tr);
    });
  } catch (error) {
    alert('Gagal memuat data shift kasir: ' + error.message);
  }
});

document.getElementById('close-shifts-btn').addEventListener('click', () => {
  // Hide kasir shifts section and show kasir management section
  kasirShiftsSection.style.display = 'none';
  kasirManagementSection.style.display = 'block';
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
          // Deleting user from Firebase Auth requires Admin SDK, so here we attempt to delete from Auth as well
          await db.collection('users').doc(id).delete();

          // Delete user from Firebase Authentication using Firebase Admin SDK is not possible from client
          // So we can only delete Firestore doc here, but we can sign in as admin and delete user via cloud function or admin panel

          // For now, just reload kasirs list
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
