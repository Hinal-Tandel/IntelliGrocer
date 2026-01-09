import { auth, onAuthStateChanged, signOut, getProducts, addProduct, updateProduct, deleteProduct, getDeals, addDeal, updateDeal, deleteDeal } from './firebase.js';

let currentProducts = [];
let currentDeals = [];

function parseDiscountPercent(discount) {
  if (!discount) return 0;
  const m = String(discount).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function formatCurrency(n) {
  const num = Number(n) || 0;
  return `₹${num.toFixed(2)}`;
}

function guardRole() {
  const role = localStorage.getItem('loginRole') || 'user';
  if (role !== 'admin') {
    // Not admin role; kick to user app
    window.location.replace('index.html');
  }
}

async function loadData() {
  try {
    console.log('[Admin] Loading products from Firebase...');
    const list = await getProducts();
    const products = Array.isArray(list) ? list : [];
    console.log('[Admin] Fetched', products.length, 'products');
    currentProducts = products;

    // Stats
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const avgDisc = products.length
      ? (products.reduce((s,p)=> s + parseDiscountPercent(p.discount), 0) / products.length)
      : 0;
    document.getElementById('statItems').textContent = products.length;
    document.getElementById('statCats').textContent = categories.length;
    document.getElementById('statAvgDisc').textContent = `${avgDisc.toFixed(1)}%`;
    
    // Set user name in header
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.textContent = `${user.firstName || user.email} (Admin)`;
    }

    // Load deals (non-blocking)
    try {
      await loadDealsData();
    } catch (err) {
      console.error('Failed to load deals:', err);
      const dealsTable = document.getElementById('dealsTableBody');
      if (dealsTable) {
        dealsTable.innerHTML = '<tr><td colspan="6" style="padding: 1.5rem; text-align: center; color: var(--text-soft);">Failed to load deals. Click "Add Deal" to create one.</td></tr>';
      }
    }

    // Discount overview: group by category average discount
    const byCat = new Map();
    for (const p of products) {
      const key = p.category || 'General';
      const arr = byCat.get(key) || [];
      arr.push(parseDiscountPercent(p.discount));
      byCat.set(key, arr);
    }
    const overview = [...byCat.entries()].map(([cat, arr]) => ({
      cat,
      avg: arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : 0
    })).sort((a,b)=> b.avg - a.avg);
    document.getElementById('discountOverview').innerHTML = overview.map(o => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--border);">
        <span>${o.cat}</span>
        <strong style="color: var(--secondary);">${o.avg.toFixed(1)}%</strong>
      </div>
    `).join('');

    // Items table with edit/delete buttons
    const tbody = document.getElementById('itemsTableBody');
    tbody.innerHTML = products.map(p => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding:.75rem;">${p.name || '-'}</td>
      <td style="padding:.75rem;">${p.category || '-'}</td>
      <td style="padding:.75rem;">${p.quantity || '-'}</td>
      <td style="padding:.75rem;">${formatCurrency(p.original_price || 0)}</td>
      <td style="padding:.75rem;">${formatCurrency(p.discounted_price || 0)}</td>
      <td style="padding:.75rem;"><span class="chip" style="background: rgba(52,152,219,.12); color: var(--secondary);">${p.discount || '-'}</span></td>
      <td style="padding:.75rem;"><span class="chip" style="${p.is_essential ? 'background: rgba(46,213,115,.15); color:#2ecc71;' : 'background: var(--surface-muted); color: var(--text-soft);'}">${p.is_essential ? 'Yes' : 'No'}</span></td>
      <td style="padding:.75rem;">
        <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
          <button 
            class="btn" 
            onclick="editProduct('${p.id}')" 
            style="padding:.5rem .75rem; font-size:.85rem; background: rgba(52,152,219,0.1); color: var(--secondary); border: 1px solid rgba(52,152,219,0.3); display: flex; align-items: center; gap: 0.35rem;"
            title="Edit product"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>
          <button 
            class="btn" 
            onclick="confirmDelete('${p.id}')" 
            style="padding:.5rem .75rem; font-size:.85rem; background: rgba(231,76,60,0.1); color: #e74c3c; border: 1px solid rgba(231,76,60,0.3); display: flex; align-items: center; gap: 0.35rem;"
            title="Delete product"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  } catch (error) {
    console.error('Error loading data:', error);
    document.getElementById('itemsTableBody').innerHTML = '<tr><td colspan="8" style="padding: 1.5rem; text-align: center; color: #e74c3c;">Failed to load data. Please refresh the page.</td></tr>';
  }
}

// Modal management
function openModal(title = 'Add Product') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('productModal').classList.remove('is-hidden');
}

function closeModal() {
  document.getElementById('productModal').classList.add('is-hidden');
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
}

// Add product
function showAddForm() {
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  
  // Update button text for add mode
  document.getElementById('saveButtonText').innerHTML = '💾 Save Product';
  
  openModal('Add Product');
}

// Edit product
window.editProduct = function(productId) {
  const product = currentProducts.find(p => p.id === productId);
  if (!product) return;
  
  document.getElementById('productId').value = productId;
  document.getElementById('productName').value = product.name || '';
  document.getElementById('productCategory').value = product.category || '';
  document.getElementById('productQuantity').value = product.quantity || '';
  document.getElementById('productOriginalPrice').value = product.original_price || 0;
  document.getElementById('productDiscountedPrice').value = product.discounted_price || 0;
  document.getElementById('productDiscount').value = product.discount || '';
  document.getElementById('productEssential').checked = product.is_essential === true || product.is_essential === 'true';
  
  // Update button text for edit mode
  document.getElementById('saveButtonText').innerHTML = '💾 Update Product';
  
  openModal('Edit Product');
};

// Delete product
window.confirmDelete = async function(productId) {
  const product = currentProducts.find(p => p.id === productId);
  if (!product) return;
  
  if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
    try {
      await deleteProduct(productId);
      showToast('Product deleted successfully!', 'success');
      await loadData();
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete product: ' + error.message, 'error');
    }
  }
};

// Save product (add or update)
async function handleProductSubmit(e) {
  e.preventDefault();
  
  const productId = document.getElementById('productId').value;
  const productData = {
    name: document.getElementById('productName').value.trim(),
    category: document.getElementById('productCategory').value.trim(),
    quantity: document.getElementById('productQuantity').value.trim(),
    original_price: parseFloat(document.getElementById('productOriginalPrice').value) || 0,
    discounted_price: parseFloat(document.getElementById('productDiscountedPrice').value) || 0,
    discount: document.getElementById('productDiscount').value.trim(),
    is_essential: document.getElementById('productEssential').checked
  };
  
  console.log('[Admin] Saving product', productId ? '(update)' : '(new)', productData);
  try {
    if (productId) {
      // Update existing
      console.log('[Admin] Updating product ID:', productId);
      await updateProduct(productId, productData);
      showToast('Product updated successfully!', 'success');
    } else {
      // Add new
      console.log('[Admin] Adding new product');
      const newId = await addProduct(productData);
      console.log('[Admin] Product added with ID:', newId);
      showToast('Product added successfully!', 'success');
    }
    
    closeModal();
    console.log('[Admin] Reloading product table...');
    await loadData();
    console.log('[Admin] Product table reloaded');
  } catch (error) {
    console.error('Save error:', error);
    showToast('Failed to save product: ' + error.message, 'error');
  }
}

function showToast(message, type = 'info') {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function wireEvents() {
  document.getElementById('logoutAdmin')?.addEventListener('click', async () => {
    try { await signOut(auth); } catch {}
    localStorage.removeItem('currentUser');
    window.location.replace('login.html');
  });
  
  // Add product button
  document.getElementById('addProductBtn')?.addEventListener('click', showAddForm);
  
  // Modal controls
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('cancelBtn')?.addEventListener('click', closeModal);
  document.getElementById('productModal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  });
  
  // Product form submit
  document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
  
  // Deal modal controls
  document.getElementById('addDealBtn')?.addEventListener('click', showAddDealForm);
  document.getElementById('cancelDealBtn')?.addEventListener('click', closeDealModal);
  document.getElementById('dealModal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeDealModal();
  });
  
  // Deal form submit
  document.getElementById('dealForm')?.addEventListener('submit', handleDealSubmit);
}

// ============= Deals Management =============

async function loadDealsData() {
  console.log('[Admin] Loading deals from Firebase...');
  try {
    const deals = await getDeals();
    currentDeals = Array.isArray(deals) ? deals : [];
    console.log('[Admin] Fetched', currentDeals.length, 'deals');
    
    const tbody = document.getElementById('dealsTableBody');
    if (!tbody) {
      console.error('[Admin] Deals table body element not found');
      return;
    }
    
    if (currentDeals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="padding: 1.5rem; text-align: center; color: var(--text-soft);">No deals found. Click "Add Deal" to create one.</td></tr>';
      return;
    }
    
    tbody.innerHTML = currentDeals.map(deal => {
      const statusColors = {
        active: 'background: rgba(46,213,115,.15); color:#2ecc71;',
        inactive: 'background: var(--surface-muted); color: var(--text-soft);',
        scheduled: 'background: rgba(255,179,0,.15); color:#f39c12;'
      };
      
      return `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding:.75rem; font-weight:500;">${deal.productName || '-'}</td>
          <td style="padding:.75rem;">${deal.category || '-'}</td>
          <td style="padding:.75rem;"><span class="chip" style="background: rgba(52,152,219,.12); color: var(--secondary); font-weight:600;">${deal.discount || '-'}</span></td>
          <td style="padding:.75rem;"><span class="chip" style="background: rgba(155,89,182,.12); color:#9b59b6; font-weight:600;">${deal.priority || 5}</span></td>
          <td style="padding:.75rem;"><span class="chip" style="${statusColors[deal.status] || statusColors.inactive}">${(deal.status || 'inactive').toUpperCase()}</span></td>
          <td style="padding:.75rem;">
            <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
              <button 
                class="btn" 
                onclick="editDeal('${deal.id}')" 
                style="padding:.5rem .75rem; font-size:.85rem; background: rgba(52,152,219,0.1); color: var(--secondary); border: 1px solid rgba(52,152,219,0.3); display: flex; align-items: center; gap: 0.35rem;"
                title="Edit deal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit
              </button>
              <button 
                class="btn" 
                onclick="confirmDeleteDeal('${deal.id}')" 
                style="padding:.5rem .75rem; font-size:.85rem; background: rgba(231,76,60,0.1); color: #e74c3c; border: 1px solid rgba(231,76,60,0.3); display: flex; align-items: center; gap: 0.35rem;"
                title="Delete deal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    console.log('[Admin] Rendered', currentDeals.length, 'deals in table');
  } catch (error) {
    console.error('[Admin] Error loading deals:', error);
    const tbody = document.getElementById('dealsTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 1.5rem; text-align: center; color: #e74c3c;">Failed to load deals: ${error.message}</td></tr>`;
    }
    throw error;
  }
}

function showAddDealForm() {
  document.getElementById('dealModalTitle').textContent = 'Add Deal';
  document.getElementById('dealForm').reset();
  document.getElementById('dealId').value = '';
  document.getElementById('saveDealBtnText').textContent = 'Save Deal';
  document.getElementById('dealModal').classList.remove('is-hidden');
}

window.editDeal = function(dealId) {
  const deal = currentDeals.find(d => d.id === dealId);
  if (!deal) return;
  
  document.getElementById('dealModalTitle').textContent = 'Edit Deal';
  document.getElementById('dealId').value = deal.id;
  document.getElementById('dealProductName').value = deal.productName || '';
  document.getElementById('dealProductId').value = deal.productId || '';
  document.getElementById('dealCategory').value = deal.category || '';
  document.getElementById('dealDiscount').value = deal.discount || '';
  document.getElementById('dealPriority').value = deal.priority || 5;
  document.getElementById('dealStatus').value = deal.status || 'active';
  document.getElementById('saveDealBtnText').textContent = 'Update Deal';
  document.getElementById('dealModal').classList.remove('is-hidden');
};

window.confirmDeleteDeal = async function(dealId) {
  const deal = currentDeals.find(d => d.id === dealId);
  if (!deal) return;
  
  if (confirm(`Delete deal "${deal.productName}"? This action cannot be undone.`)) {
    try {
      await deleteDeal(dealId);
      showToast('Deal deleted successfully', 'success');
      await loadDealsData();
    } catch (err) {
      console.error('Delete deal error:', err);
      showToast('Failed to delete deal', 'error');
    }
  }
};

function closeDealModal() {
  document.getElementById('dealModal').classList.add('is-hidden');
  document.getElementById('dealForm').reset();
}

async function handleDealSubmit(e) {
  e.preventDefault();
  const dealId = document.getElementById('dealId').value.trim();
  const dealData = {
    productName: document.getElementById('dealProductName').value.trim(),
    productId: document.getElementById('dealProductId').value.trim(),
    category: document.getElementById('dealCategory').value.trim(),
    discount: document.getElementById('dealDiscount').value.trim(),
    priority: parseInt(document.getElementById('dealPriority').value) || 5,
    status: document.getElementById('dealStatus').value
  };
  
  try {
    if (dealId) {
      // Update existing deal
      await updateDeal(dealId, dealData);
      showToast('Deal updated successfully', 'success');
    } else {
      // Add new deal
      await addDeal(dealData);
      showToast('Deal added successfully', 'success');
    }
    closeDealModal();
    await loadDealsData();
  } catch (err) {
    console.error('Save deal error:', err);
    showToast('Failed to save deal', 'error');
  }
}

function ensureAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace('login.html');
    } else {
      loadData();
    }
  });
}

(function init(){
  guardRole();
  wireEvents();
  ensureAuth();
})();
