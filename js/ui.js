import { extractDiscountPercent, getDiscountClass, formatCurrency } from './utils.js';

export function renderCategoryFilter(categories) {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    select.innerHTML = '<option value="">All</option>';
    categories.forEach(category => {
        const opt = document.createElement('option');
        opt.value = category;
        opt.textContent = category;
        select.appendChild(opt);
    });
}

export function renderProducts(products) {
    const grid = document.getElementById('recommendationsGrid');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h4>No matches yet</h4>
                <p>Adjust search, filters, or request fresh recommendations.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map((product, index) => createProductCard(product, index)).join('');
}

function createProductCard(product, index) {
    const percent = extractDiscountPercent(product.discount);
    const discountClass = percent > 0 ? getDiscountClass(percent) : '';
    return `
        <article class="product-card" data-product-index="${index}">
            <h4 class="product-name">${product.name}</h4>
            <span class="product-category">${product.category || 'General'}</span>
            <p class="product-quantity">${product.quantity || ''}</p>
            <div class="product-prices">
                <span class="original-price">${formatCurrency(product.original_price || 0)}</span>
                <span class="discounted-price">${formatCurrency(product.discounted_price || 0)}</span>
            </div>
            ${percent > 0 ? `<span class="discount-badge ${discountClass}">${product.discount}</span>` : ''}
        </article>
    `;
}

export function showLoading(show) {
    const loader = document.getElementById('loadingSpinner');
    if (!loader) return;
    loader.classList.toggle('is-hidden', !show);
}

export function showToast(message, type = 'info') {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    stack.appendChild(toast);
    setTimeout(() => toast.remove(), 3800);
}

export function renderPreferencesChips(preferences) {
    const chips = document.getElementById('preferencesChips');
    if (!chips) return;
    if (!preferences) {
        chips.innerHTML = '<span class="micro">No preferences saved yet.</span>';
        return;
    }

    const parts = [
        `Budget: ${formatCurrency(preferences.monthlyBudget || 0)}`,
        `Household: ${preferences.householdSize || '-'} ppl`,
        `Freq: ${preferences.purchaseFrequency || '-'}`,
        preferences.currentSeason ? `${preferences.currentSeason}` : ''
    ].filter(Boolean);

    chips.innerHTML = parts.map(text => `<span class="chip">${text}</span>`).join('');
}

export function renderMetrics({ deals, categories, avgSavings }) {
    const dealsEl = document.getElementById('metricDeals');
    const catEl = document.getElementById('metricCategories');
    const saveEl = document.getElementById('metricSavings');
    if (dealsEl) dealsEl.textContent = deals ?? '—';
    if (catEl) catEl.textContent = categories ?? '—';
    if (saveEl) saveEl.textContent = formatCurrency(avgSavings || 0);
}

export function renderAnalyticsCharts(data) {
    const { category_chart, price_discount_chart, top_deals_chart } = data;
    const catImg = document.getElementById('categoryChartImg');
    const priceImg = document.getElementById('priceDiscountChartImg');
    const dealsImg = document.getElementById('topDealsChartImg');
    if (catImg) catImg.src = `data:image/png;base64,${category_chart}`;
    if (priceImg) priceImg.src = `data:image/png;base64,${price_discount_chart}`;
    if (dealsImg) dealsImg.src = `data:image/png;base64,${top_deals_chart}`;
}

export function toggleAnalytics(show) {
    const section = document.getElementById('analytics');
    if (!section) return;
    section.classList.toggle('is-hidden', !show);
}

export function openProductModal(product) {
    const modal = document.getElementById('productModal');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;

    const savingsAmount = (product.original_price || 0) - (product.discounted_price || 0);
    const savingsPercent = product.original_price ? ((savingsAmount / product.original_price) * 100).toFixed(1) : 0;

    body.innerHTML = `
        <h3>${product.name}</h3>
        <p><strong>Category:</strong> ${product.category || 'General'}</p>
        <p><strong>Quantity:</strong> ${product.quantity || '—'}</p>
        <p><strong>Original:</strong> ${formatCurrency(product.original_price || 0)}</p>
        <p><strong>Discounted:</strong> ${formatCurrency(product.discounted_price || 0)}</p>
        <p><strong>Discount:</strong> ${product.discount || '—'}</p>
        <p><strong>You save:</strong> ${formatCurrency(savingsAmount)} (${savingsPercent}%)</p>
        <p class="micro">This card is dynamically generated based on live pricing and your constraints.</p>
    `;
    modal.classList.remove('is-hidden');
}

export function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.add('is-hidden');
}

export function setActiveNav(target) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === target);
    });
}

export function renderFeatureCards() {
    const carousel = document.getElementById('featuresCarousel');
    if (!carousel) return;

    const features = [
        { id: 'quantity', name: 'Quantity', icon: '📊', desc: 'Suggest optimal quantities within budget' },
        { id: 'seasonal', name: 'Seasonal', icon: '🌱', desc: 'Recommend seasonal & cheaper items' },
        { id: 'household', name: 'Household', icon: '👨‍👩‍👧‍👦', desc: 'Adjust groceries by family size/type' },
        { id: 'health', name: 'Health', icon: '💪', desc: 'Balance budget + nutrition' },
        { id: 'substitute', name: 'Substitute', icon: '🔄', desc: 'Suggest cheaper alternatives' },
        { id: 'savings', name: 'Savings Score', icon: '🏆', desc: 'Rank users/months by efficiency' },
        { id: 'prediction', name: 'Prediction', icon: '🔮', desc: 'Predict future grocery budget' },
        { id: 'explain', name: 'Explain', icon: '💡', desc: 'Explain why items are recommended' }
    ];

    carousel.innerHTML = features.map(feature => `
        <div class="feature-card" data-feature="${feature.id}" title="${feature.name}">
            <div class="feature-icon">${feature.icon}</div>
            <h4>${feature.name}</h4>
            <p>${feature.desc}</p>
        </div>
    `).join('');
}
