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

export function renderProducts(products, gridId = 'recommendationsGrid') {
    const grid = document.getElementById(gridId);
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
    const savedQuantity = product.selectedQuantity || 1;
    
    return `
        <article class="product-card" data-product-index="${index}" data-product-id="${product.id || index}">
            <h4 class="product-name">${product.name}</h4>
            <span class="product-category">${product.category || 'General'}</span>
            <p class="product-quantity">${product.quantity || ''}</p>
            <div class="product-prices">
                <span class="original-price">${formatCurrency(product.original_price || 0)}</span>
                <span class="discounted-price">${formatCurrency(product.discounted_price || 0)}</span>
            </div>
            ${percent > 0 ? `<span class="discount-badge ${discountClass}">${product.discount}</span>` : ''}
            <div class="quantity-selector" style="margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
                <button class="qty-btn qty-decrease" data-product-index="${index}" style="width: 32px; height: 32px; border: 1px solid var(--border); background: var(--surface); border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center;">−</button>
                <input type="number" class="qty-input" data-product-index="${index}" value="${savedQuantity}" min="1" max="99" style="width: 50px; text-align: center; padding: 0.5rem; border: 1px solid var(--border); border-radius: 6px; font-weight: 600;">
                <button class="qty-btn qty-increase" data-product-index="${index}" style="width: 32px; height: 32px; border: 1px solid var(--border); background: var(--surface); border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center;">+</button>
            </div>
            <div class="total-price" style="margin-top: 0.5rem; text-align: center; font-weight: 600; color: var(--secondary);">
                Total: <span class="item-total" data-product-index="${index}">${formatCurrency((product.discounted_price || 0) * savedQuantity)}</span>
            </div>
        </article>
    `;
}

export function renderReports(reports) {
    const noReportsMessage = document.getElementById('noReportsMessage');
    const reportsList = document.getElementById('reportsList');
    const reportCount = document.getElementById('profileReportCount');
    
    if (reportCount) {
        reportCount.textContent = reports.length;
    }
    
    if (!reports || reports.length === 0) {
        if (noReportsMessage) noReportsMessage.style.display = 'block';
        if (reportsList) reportsList.style.display = 'none';
        return;
    }
    
    if (noReportsMessage) noReportsMessage.style.display = 'none';
    if (reportsList) {
        reportsList.style.display = 'grid';
        reportsList.innerHTML = reports.map(report => createReportCard(report)).join('');
    }
}

function createReportCard(report) {
    const date = new Date(report.timestamp).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="report-card panel-card" data-report-id="${report.id}">
            <div class="report-header">
                <h4>📊 Report - ${date}</h4>
                <span class="pill">${report.summary.totalProducts} products</span>
            </div>
            <div class="report-stats" style="margin: 1rem 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                <div>
                    <strong>Budget:</strong> ₹${report.preferences.monthlyBudget}
                </div>
                <div>
                    <strong>Used:</strong> ${report.summary.budgetUtilization}%
                </div>
                <div>
                    <strong>Total Cost:</strong> ₹${report.summary.totalCost.toFixed(2)}
                </div>
                <div class="savings-highlight">
                    <strong>Savings:</strong> ₹${report.summary.totalSavings.toFixed(2)}
                </div>
            </div>
            <div class="report-actions" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn btn-secondary btn-sm view-report-btn" data-report-id="${report.id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <div class="dropdown" style="position: relative; flex: 1;">
                    <button class="btn btn-ghost btn-sm download-toggle-btn" data-report-id="${report.id}" style="width: 100%;">
                        <i class="fas fa-download"></i> Download ▾
                    </button>
                    <div class="download-menu" data-report-id="${report.id}" style="display: none; position: absolute; bottom: 100%; left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); margin-bottom: 0.25rem; z-index: 10;">
                        <button class="download-format-btn" data-report-id="${report.id}" data-format="html" style="width: 100%; padding: 0.5rem; border: none; background: none; cursor: pointer; text-align: left; transition: background 0.2s;">
                            <i class="fas fa-file-code"></i> HTML
                        </button>
                        <button class="download-format-btn" data-report-id="${report.id}" data-format="pdf" style="width: 100%; padding: 0.5rem; border: none; background: none; cursor: pointer; text-align: left; transition: background 0.2s;">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <button class="download-format-btn" data-report-id="${report.id}" data-format="word" style="width: 100%; padding: 0.5rem; border: none; background: none; cursor: pointer; text-align: left; transition: background 0.2s;">
                            <i class="fas fa-file-word"></i> Word
                        </button>
                    </div>
                </div>
                <button class="btn btn-ghost btn-sm delete-report-btn" data-report-id="${report.id}" style="color: var(--danger, #e63946);">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

export function renderProfileInfo(user, reportCount = 0) {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileReportCount = document.getElementById('profileReportCount');
    
    if (profileName) {
        profileName.textContent = user.firstName || user.displayName || 'User';
    }
    if (profileEmail) {
        profileEmail.textContent = user.email || '—';
    }
    if (profileReportCount) {
        profileReportCount.textContent = reportCount;
    }
}

export function showReportModal(report) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('reportViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reportViewModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <button class="close" id="reportModalClose" aria-label="Close">✕</button>
                <div id="reportModalBody" style="padding: 2rem; max-height: calc(90vh - 4rem); overflow-y: auto;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('reportModalClose').addEventListener('click', () => {
            modal.classList.add('is-hidden');
        });
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'reportViewModal') {
                modal.classList.add('is-hidden');
            }
        });
    }
    
    const modalBody = document.getElementById('reportModalBody');
    
    const categoriesHTML = Object.entries(report.categoryBreakdown)
        .sort((a, b) => b[1].totalCost - a[1].totalCost)
        .map(([category, data]) => `
            <tr>
                <td>${category}</td>
                <td>${data.count}</td>
                <td>₹${data.totalCost.toFixed(2)}</td>
                <td class="savings-highlight">₹${data.totalSavings.toFixed(2)}</td>
            </tr>
        `).join('');
    
    const productsHTML = report.products.map((product, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.quantity || '-'}</td>
            <td>₹${product.originalPrice.toFixed(2)}</td>
            <td>₹${product.discountedPrice.toFixed(2)}</td>
            <td>${product.discount || '-'}</td>
            <td>${product.isEssential ? '✓' : ''}</td>
        </tr>
    `).join('');
    
    modalBody.innerHTML = `
        <h2>📊 Recommendation Report</h2>
        <p class="micro">Generated on ${report.reportDate}</p>
        
        <div style="margin: 2rem 0;">
            <h3>Summary</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div class="panel-card">
                    <p class="eyebrow">Products</p>
                    <h4>${report.summary.totalProducts}</h4>
                </div>
                <div class="panel-card">
                    <p class="eyebrow">Total Cost</p>
                    <h4>₹${report.summary.totalCost.toFixed(2)}</h4>
                </div>
                <div class="panel-card" style="border-left: 3px solid var(--accent);">
                    <p class="eyebrow">Savings</p>
                    <h4 class="savings-highlight">₹${report.summary.totalSavings.toFixed(2)}</h4>
                </div>
                <div class="panel-card">
                    <p class="eyebrow">Budget Used</p>
                    <h4>${report.summary.budgetUtilization}%</h4>
                </div>
            </div>
        </div>
        
        <div style="margin: 2rem 0;">
            <h3>Category Breakdown</h3>
            <table class="data-table" style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Products</th>
                        <th>Total Cost</th>
                        <th>Savings</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoriesHTML}
                </tbody>
            </table>
        </div>
        
        <div style="margin: 2rem 0;">
            <h3>All Recommended Products</h3>
            <table class="data-table" style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Original</th>
                        <th>Discounted</th>
                        <th>Discount</th>
                        <th>Essential</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsHTML}
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 2rem; text-align: center;">
            <h4 style="margin-bottom: 1rem;">Download Report</h4>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary download-format-btn" data-report-id="${report.id}" data-format="html">
                    <i class="fas fa-file-code"></i> HTML
                </button>
                <button class="btn btn-secondary download-format-btn" data-report-id="${report.id}" data-format="pdf">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
                <button class="btn btn-ghost download-format-btn" data-report-id="${report.id}" data-format="word">
                    <i class="fas fa-file-word"></i> Word
                </button>
            </div>
        </div>
    `;
    
    modal.classList.remove('is-hidden');
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
export function renderRecommendationSummary(recommendationResult) {
    const { totalCost, totalSavings, remainingBudget, metrics } = recommendationResult;
    
    // Create or update the summary section
    let summarySection = document.getElementById('recommendationSummary');
    
    if (!summarySection) {
        // Create the summary section if it doesn't exist
        const recommendationsSection = document.getElementById('recommendations');
        if (!recommendationsSection) return;
        
        summarySection = document.createElement('div');
        summarySection.id = 'recommendationSummary';
        summarySection.className = 'recommendation-summary';
        
        // Insert before the grid
        const grid = document.getElementById('recommendationsGrid');
        recommendationsSection.insertBefore(summarySection, grid);
    }
    
    // Format currency
    const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;
    
    summarySection.innerHTML = `
        <div class="summary-card">
            <h4>📊 Budget Recommendation Summary</h4>
            <div class="summary-grid">
                <div class="summary-item highlight">
                    <span class="summary-label">Total Products Selected</span>
                    <span class="summary-value">${metrics.totalProducts}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Essential Items</span>
                    <span class="summary-value">${metrics.essentialItems}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Non-Essential Items</span>
                    <span class="summary-value">${metrics.nonEssentialItems}</span>
                </div>
                <div class="summary-item highlight">
                    <span class="summary-label">Total Cost</span>
                    <span class="summary-value">${formatCurrency(totalCost)}</span>
                </div>
                <div class="summary-item success">
                    <span class="summary-label">Total Savings</span>
                    <span class="summary-value">${formatCurrency(totalSavings)}</span>
                </div>
                <div class="summary-item ${remainingBudget > 0 ? 'success' : 'warning'}">
                    <span class="summary-label">Remaining Budget</span>
                    <span class="summary-value">${formatCurrency(remainingBudget)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Average Discount</span>
                    <span class="summary-value">${metrics.averageDiscount.toFixed(1)}%</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Average Score</span>
                    <span class="summary-value">${metrics.averageScore.toFixed(1)}/170</span>
                </div>
            </div>
            <p class="micro">Products are ranked by: Essential items first → Higher recommendation score → Lower discounted price</p>
        </div>
    `;
}