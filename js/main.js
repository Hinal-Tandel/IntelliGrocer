import { fetchProducts, fetchRecommendations, fetchAnalytics } from './api.js';
import { state, setProducts, setFilteredProducts, setCategories, setPreferences, setFilters, getMetrics, setActiveFeature, getActiveFeature, setProductQuantity, getProductQuantity } from './state.js';
import { renderCategoryFilter, renderProducts, showLoading, showToast, renderPreferencesChips, renderMetrics, renderAnalyticsCharts, toggleAnalytics, openProductModal, closeProductModal, setActiveNav, renderFeatureCards, renderRecommendationSummary, renderReports, showReportModal } from './ui.js';
import { filterProducts } from './filters.js';
import { savePreferences, loadPreferences, loadEssentialItems, addEssentialItem, removeEssentialItem } from './storage.js';
import { scrollToAnchor, formatCurrency } from './utils.js';
<<<<<<< Updated upstream
import { auth, onAuthStateChanged, saveUserPreferences, saveRecommendations, searchProducts, searchByCategory, getCategories, saveRecommendationReport, getRecommendationReports, getRecommendationReport, deleteRecommendationReport, getUserProfile } from './firebase.js';
=======
import { auth, onAuthStateChanged, saveUserPreferences, saveRecommendations, searchProducts, searchByCategory, getCategories, saveRecommendationReport, getRecommendationReports, getRecommendationReport, getUserProfile } from './firebase.js';
>>>>>>> Stashed changes
import { generateBudgetRecommendations, generateRecommendationReport, generateHTMLReport } from './recommendation.js';

document.addEventListener('DOMContentLoaded', ensureAuthThenInit);

function ensureAuthThenInit() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            window.CURRENT_USER = user;
            initApp();
        }
    });
}

async function initApp() {
    checkAuthentication();
    bindEvents();
    hydratePreferencesFromStorage();
    renderFeatureCards();
    renderEssentialItems();
    
    // Only load products if user is authenticated
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        await loadProductsFlow();
        applyFilters();
        // Initialize by showing home section
        navigateToSection('#home');
    }
}

function checkAuthentication() {
    const currentUser = localStorage.getItem('currentUser');
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const welcomeSection = document.getElementById('welcomeSection');
    const authRequiredElements = document.querySelectorAll('.auth-required');
    
    if (currentUser) {
        // User is logged in
        const user = JSON.parse(currentUser);
        if (loginBtn) loginBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userName) userName.textContent = `Welcome, ${user.firstName || user.email}`;
        if (welcomeSection) welcomeSection.style.display = 'none';
        
        // Show authenticated content
        authRequiredElements.forEach(el => {
            el.style.display = '';
            el.classList.remove('auth-required');
        });
    } else {
        // User is not logged in
        if (loginBtn) loginBtn.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
        if (userName) userName.textContent = ''; // Clear any residual text
        if (welcomeSection) welcomeSection.style.display = 'block';
        
        // Hide authenticated content
        authRequiredElements.forEach(el => {
            el.style.display = 'none';
        });
    }
}

function bindEvents() {
    const form = document.getElementById('preferencesForm');
    form?.addEventListener('submit', handlePreferencesSubmit);
    form?.addEventListener('reset', () => {
        setPreferences(null);
        renderPreferencesChips(null);
        showToast('Preferences cleared.', 'info');
    });

    document.getElementById('numAdults')?.addEventListener('input', syncHouseholdSize);
    document.getElementById('numChildren')?.addEventListener('input', syncHouseholdSize);

    document.getElementById('quickRecommend')?.addEventListener('click', async () => {
        await handlePreferencesSubmit();
        await handleRecommendations();
    });

    document.getElementById('getRecommendationsBtn')?.addEventListener('click', handleRecommendations);
    document.getElementById('generateChartsBtn')?.addEventListener('click', handleAnalytics);
    document.getElementById('refreshProducts')?.addEventListener('click', loadProductsFlow);

    document.getElementById('heroStartBtn')?.addEventListener('click', () => navigateToSection('#personalize'));
    document.getElementById('heroBrowseBtn')?.addEventListener('click', () => navigateToSection('#search'));
    document.getElementById('heroSyncPrefs')?.addEventListener('click', () => navigateToSection('#personalize'));

    // Logout handler
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    document.querySelectorAll('[data-quick-filter]')?.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-quick-filter');
            const preset = type === 'high' ? { discount: 'high' } : { search: type };
            setFilters(preset);
            syncFilterInputs();
            applyFilters();
        });
    });

    document.getElementById('searchBtn')?.addEventListener('click', async () => {
        await handleSearch();
    });

    document.getElementById('searchInput')?.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handleSearch();
        }
    });

    document.getElementById('categoryFilter')?.addEventListener('change', async (e) => {
        const category = e.target.value;
        setFilters({ category });
        
        if (category) {
            // Use Firebase category search
            showLoading(true);
            try {
                const results = await searchByCategory(category);
                setFilteredProducts(results);
                renderProducts(results, 'searchResultsGrid');
                updateSearchResultsTitle(`Category: ${category}`, results.length);
                showSearchResultsHeader(true);
                showToast(`Found ${results.length} products in ${category}`, 'success');
            } catch (error) {
                console.error('Category search error:', error);
                applyFilters(); // Fallback to client-side
            } finally {
                showLoading(false);
            }
        } else {
            applyFilters();
            const searchSection = document.getElementById('search');
            if (searchSection && searchSection.style.display !== 'none') {
                updateSearchResultsTitle('All Products', state.filteredProducts?.length || 0);
                showSearchResultsHeader(true);
            }
        }
    });

    document.getElementById('discountFilter')?.addEventListener('change', (e) => {
        setFilters({ discount: e.target.value });
        applyFilters();
    });

    document.getElementById('priceSort')?.addEventListener('change', (e) => {
        setFilters({ sort: e.target.value });
        applyFilters();
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href');
            navigateToSection(target);
        });
    });

    // Handle clicks on both recommendation and search grids
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    recommendationsGrid?.addEventListener('click', (e) => {
        handleProductGridClick(e);
    });
    
    const searchGrid = document.getElementById('searchResultsGrid');
    searchGrid?.addEventListener('click', (e) => {
        handleProductGridClick(e);
    });

    document.getElementById('modalClose')?.addEventListener('click', closeProductModal);
    document.getElementById('productModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'productModal') closeProductModal();
    });

    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const feature = card.getAttribute('data-feature');
            handleFeatureSelection(feature);
        });
    });

    // Essential items handlers
    document.getElementById('addEssentialItemBtn')?.addEventListener('click', handleAddEssentialItem);
    document.getElementById('essentialItemSelect')?.addEventListener('change', handleEssentialItemSelectChange);

    // Report generation and profile handlers
    document.getElementById('generateReportBtn')?.addEventListener('click', handleGenerateReport);
    
    // Report card click delegation
    document.getElementById('reportsContainer')?.addEventListener('click', async (e) => {
        const viewBtn = e.target.closest('.view-report-btn');
        const downloadBtn = e.target.closest('.download-report-btn');
<<<<<<< Updated upstream
        const deleteBtn = e.target.closest('.delete-report-btn');
=======
>>>>>>> Stashed changes
        
        if (viewBtn) {
            const reportId = viewBtn.getAttribute('data-report-id');
            await handleViewReport(reportId);
        } else if (downloadBtn) {
            const reportId = downloadBtn.getAttribute('data-report-id');
            const format = downloadBtn.getAttribute('data-format') || 'html';
            await handleDownloadReport(reportId, format);
<<<<<<< Updated upstream
        } else if (deleteBtn) {
            const reportId = deleteBtn.getAttribute('data-report-id');
            await handleDeleteReport(reportId);
        }
    });
    
    // Items summary remove button handler
    document.getElementById('itemsSummaryBody')?.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            const index = Number(removeBtn.getAttribute('data-product-index'));
            handleRemoveItem(index);
=======
>>>>>>> Stashed changes
        }
    });
}

function handleProductGridClick(e) {
    const qtyDecrease = e.target.closest('.qty-decrease');
    const qtyIncrease = e.target.closest('.qty-increase');
    const qtyInput = e.target.closest('.qty-input');
    const card = e.target.closest('[data-product-index]');
    
    if (qtyDecrease || qtyIncrease) {
        e.stopPropagation();
        const index = Number((qtyDecrease || qtyIncrease).getAttribute('data-product-index'));
        const currentQty = getProductQuantity(index);
        const newQty = qtyDecrease ? currentQty - 1 : currentQty + 1;
        updateProductQuantity(index, newQty);
    } else if (qtyInput) {
        e.stopPropagation();
        qtyInput.addEventListener('change', (evt) => {
            const index = Number(evt.target.getAttribute('data-product-index'));
            updateProductQuantity(index, evt.target.value);
        });
    } else if (card && !e.target.closest('.quantity-selector')) {
        const index = Number(card.getAttribute('data-product-index'));
        const product = state.filteredProducts[index];
        if (product) openProductModal(product);
    }
}

function updateProductQuantity(index, quantity) {
    const qty = setProductQuantity(index, quantity);
    
    // Check if budget is exceeded
    if (state.preferences?.monthlyBudget) {
        const totalCost = calculateTotalCostWithQuantities();
        if (totalCost > state.preferences.monthlyBudget) {
            showToast(`Budget exceeded! Total: ${formatCurrency(totalCost)}, Budget: ${formatCurrency(state.preferences.monthlyBudget)}`, 'error');
        }
        // Update budget summary display
        updateBudgetSummary();
    }
    
    // Update the input field
    const input = document.querySelector(`.qty-input[data-product-index="${index}"]`);
    if (input) input.value = qty;
    
    // Update the total price display
    const totalSpan = document.querySelector(`.item-total[data-product-index="${index}"]`);
    const product = state.filteredProducts[index];
    if (totalSpan && product) {
        const total = (product.discounted_price || 0) * qty;
        totalSpan.textContent = formatCurrency(total);
    }
    
    // Update budget summary
    updateBudgetSummary();
}

function calculateTotalCostWithQuantities() {
    let total = 0;
    state.filteredProducts.forEach((product, index) => {
        const qty = getProductQuantity(index);
        const price = parseFloat(product.discounted_price) || 0;
        total += price * qty;
    });
    return total;
}

function updateBudgetSummary() {
    const summaryPanel = document.getElementById('budgetSummary');
    if (!summaryPanel || !state.preferences?.monthlyBudget) {
        if (summaryPanel) summaryPanel.style.display = 'none';
        return;
    }
    
    const budget = state.preferences.monthlyBudget;
    const totalCost = calculateTotalCostWithQuantities();
    const remaining = budget - totalCost;
    const isOverBudget = remaining < 0;
    
    // Show the panel
    summaryPanel.style.display = 'block';
    
    // Update values
    document.getElementById('budgetTotalCost').textContent = formatCurrency(totalCost);
    document.getElementById('budgetLimit').textContent = formatCurrency(budget);
    document.getElementById('budgetRemaining').textContent = formatCurrency(Math.abs(remaining));
    
    // Update status text and color
    const statusText = document.getElementById('budgetStatusText');
    const remainingEl = document.getElementById('budgetRemaining');
    
    if (isOverBudget) {
        statusText.textContent = '⚠️ Over Budget';
        statusText.style.color = 'var(--error)';
        remainingEl.style.color = 'var(--error)';
        remainingEl.parentElement.querySelector('.micro').textContent = 'Over by';
    } else {
        const percentage = (totalCost / budget * 100).toFixed(1);
        statusText.textContent = `✓ Within Budget (${percentage}% used)`;
        statusText.style.color = 'var(--success)';
        remainingEl.style.color = 'var(--success)';
        remainingEl.parentElement.querySelector('.micro').textContent = 'Remaining';
    }
}

function calculateTotalCostWithQuantities() {
    let total = 0;
    state.filteredProducts.forEach((product, index) => {
        const qty = getProductQuantity(index);
        const price = parseFloat(product.discounted_price) || 0;
        total += price * qty;
    });
    return total;
}

function updateBudgetSummary() {
    const budgetSummary = document.getElementById('budgetSummary');
    if (!budgetSummary || !state.preferences?.monthlyBudget) return;
    
    const totalCost = calculateTotalCostWithQuantities();
    const budget = state.preferences.monthlyBudget;
    const remaining = budget - totalCost;
    const isOverBudget = remaining < 0;
    
    // Show the summary
    budgetSummary.style.display = 'block';
    
    // Update status text
    const statusText = document.getElementById('budgetStatusText');
    if (statusText) {
        if (isOverBudget) {
            statusText.textContent = '⚠️ Over Budget';
            statusText.style.color = 'var(--danger, #e63946)';
        } else {
            const percentage = ((totalCost / budget) * 100).toFixed(1);
            statusText.textContent = `✓ Within Budget (${percentage}% used)`;
            statusText.style.color = 'var(--success, #06d6a0)';
        }
    }
    
    // Update cost displays
    const totalCostEl = document.getElementById('budgetTotalCost');
    if (totalCostEl) {
        totalCostEl.textContent = formatCurrency(totalCost);
        totalCostEl.style.color = isOverBudget ? 'var(--danger, #e63946)' : 'var(--accent)';
    }
    
    const budgetLimitEl = document.getElementById('budgetLimit');
    if (budgetLimitEl) {
        budgetLimitEl.textContent = formatCurrency(budget);
    }
    
    const remainingEl = document.getElementById('budgetRemaining');
    if (remainingEl) {
        remainingEl.textContent = formatCurrency(Math.abs(remaining));
        remainingEl.style.color = isOverBudget ? 'var(--danger, #e63946)' : 'var(--success, #06d6a0)';
        
        // Update label if over budget
        const label = remainingEl.previousElementSibling;
        if (label) {
            label.textContent = isOverBudget ? 'Over by' : 'Remaining';
        }
    }
    
    // Also update items summary
    updateItemsSummary();
}

function updateItemsSummary() {
    const summarySection = document.getElementById('itemsSummary');
    const summaryBody = document.getElementById('itemsSummaryBody');
    
    if (!summaryBody || !state.filteredProducts || state.filteredProducts.length === 0) {
        if (summarySection) summarySection.style.display = 'none';
        return;
    }
    
    // Show summary section
    if (summarySection) summarySection.style.display = 'block';
    
    let totalCost = 0;
    let totalItems = 0;
    
    const rows = state.filteredProducts.map((product, index) => {
        const qty = getProductQuantity(index);
        const price = parseFloat(product.discounted_price) || 0;
        const itemTotal = price * qty;
        totalCost += itemTotal;
        totalItems += qty;
        
        return `
            <tr style="border-bottom: 1px solid var(--border);" data-product-index="${index}">
                <td style="padding: 0.75rem;">
                    <strong>${product.name}</strong>
                    <br><small style="opacity: 0.7;">${product.quantity || ''}</small>
                </td>
                <td style="padding: 0.75rem;">${product.category || 'General'}</td>
                <td style="padding: 0.75rem; text-align: center;">
                    <span style="display: inline-block; padding: 0.25rem 0.75rem; background: var(--accent-alpha); border-radius: 12px; font-weight: 600;">${qty}</span>
                </td>
                <td style="padding: 0.75rem; text-align: right;">${formatCurrency(price)}</td>
                <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${formatCurrency(itemTotal)}</td>
                <td style="padding: 0.75rem; text-align: center;">
                    <button class="remove-item-btn" data-product-index="${index}" 
                        style="padding: 0.5rem 1rem; border: 1px solid var(--danger, #e63946); background: transparent; color: var(--danger, #e63946); border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 600; transition: all 0.2s;"
                        onmouseover="this.style.background='var(--danger, #e63946)'; this.style.color='white';"
                        onmouseout="this.style.background='transparent'; this.style.color='var(--danger, #e63946)';">
                        🗑️ Remove
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    summaryBody.innerHTML = rows;
    
    // Update totals
    const itemCountEl = document.getElementById('summaryItemCount');
    if (itemCountEl) itemCountEl.textContent = totalItems;
    
    const totalCostEl = document.getElementById('summaryTotalCost');
    if (totalCostEl) totalCostEl.textContent = formatCurrency(totalCost);
}

function handleRemoveItem(index) {
    if (!state.filteredProducts || index < 0 || index >= state.filteredProducts.length) return;
    
    const product = state.filteredProducts[index];
    const productName = product.name;
    
    // Remove from filtered products
    state.filteredProducts.splice(index, 1);
    
    // Re-render the recommendations grid
    renderProducts(state.filteredProducts, 'recommendationsGrid');
    
    // Update summaries
    updateBudgetSummary();
    updateItemsSummary();
    
    showToast(`${productName} removed from recommendations`, 'info');
}

async function loadProductsFlow() {
    showLoading(true);
    try {
        const data = await fetchProducts();
        setProducts(data.products || []);
        
        // Get categories from Firebase config or products
        let categories;
        try {
            categories = await getCategories();
        } catch (error) {
            console.error('Error fetching categories:', error);
            categories = Array.from(new Set((data.products || []).map(p => p.category).filter(Boolean))).sort();
        }
        
        setCategories(categories);
        renderCategoryFilter(categories);
        renderMetrics(getMetrics());
        showToast('Products synced', 'success');
    } catch (error) {
        showToast('Failed to load products. Ensure backend is running.', 'error');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

function applyFilters() {
    const products = filterProducts(state.products, state.filters);
    setFilteredProducts(products);
    // Determine which grid to render to based on active section
    const searchSection = document.getElementById('search');
    const isSearchActive = searchSection && searchSection.style.display !== 'none';
    const gridId = isSearchActive ? 'searchResultsGrid' : 'recommendationsGrid';
    renderProducts(products, gridId);
    
    // Show search results header if in search section
    if (isSearchActive) {
        showSearchResultsHeader(true);
        updateSearchResultsTitle('All Products', products.length);
    }
}

async function handleRecommendations() {
    if (!state.preferences) {
        showToast('Save your preferences first.', 'error');
        navigateToSection('#personalize');
        return;
    }

    showLoading(true);
    try {
        // Use the budget-based recommendation algorithm
        const recommendationResult = generateBudgetRecommendations(state.products, state.preferences);
        
        // Store recommendation result in state for report generation
        state.lastRecommendationResult = recommendationResult;
        
        // Update state with recommended products
        setFilteredProducts(recommendationResult.products);
        
        // Render products and summary
        renderProducts(recommendationResult.products, 'recommendationsGrid');
        renderRecommendationSummary(recommendationResult);
        renderMetrics(getMetrics());
        
        // Update budget summary
        updateBudgetSummary();
        
        // Save to Firestore
        if (window.CURRENT_USER?.uid) {
            try { 
                await saveRecommendations(window.CURRENT_USER.uid, recommendationResult.products); 
            } catch (e) { 
                console.error('Failed to save recommendations to Firestore', e); 
            }
        }
        
        // Navigate to recommendations section
        navigateToSection('#recommendations');
        
        // Update budget and items summary
        updateBudgetSummary();
        updateItemsSummary();
        
        showToast(`${recommendationResult.metrics.totalProducts} products recommended within budget!`, 'success');
    } catch (error) {
        showToast(error.message || 'Could not generate recommendations.', 'error');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

async function handleAnalytics() {
    showLoading(true);
    try {
        const data = await fetchAnalytics();
        renderAnalyticsCharts(data);
        showToast('Analytics generated.', 'success');
        // Scroll to analytics section within personalize page
        const analyticsSection = document.getElementById('analytics');
        if (analyticsSection) {
            analyticsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch (error) {
        showToast('Failed to generate analytics.', 'error');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

async function handlePreferencesSubmit(event) {
    event?.preventDefault();
    const form = document.getElementById('preferencesForm');
    if (!form) return;

    const formData = new FormData(form);
    const preferences = {
        monthlyBudget: parseFloat(formData.get('monthlyBudget')),
        householdSize: parseInt(formData.get('householdSize'), 10),
        numAdults: parseInt(formData.get('numAdults'), 10),
        numChildren: parseInt(formData.get('numChildren'), 10),
        currentSeason: formData.get('currentSeason'),
        pastSpend: parseFloat(formData.get('pastSpend')),
        purchaseFrequency: formData.get('purchaseFrequency'),
        essentialPriority: formData.get('essentialPriority')
    };

    setPreferences(preferences);
    savePreferences(preferences);
    if (window.CURRENT_USER?.uid) {
        try { await saveUserPreferences(window.CURRENT_USER.uid, preferences); } catch (e) { console.error('Failed to save preferences to Firestore', e); }
    }
    renderPreferencesChips(preferences);
    showToast('Preferences saved.', 'success');
    return preferences;
}

function hydratePreferencesFromStorage() {
    const saved = loadPreferences();
    if (!saved) {
        renderPreferencesChips(null);
        return;
    }

    setPreferences(saved);
    renderPreferencesChips(saved);
    populateForm(saved);
}

function populateForm(preferences) {
    const assign = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };
    assign('monthlyBudget', preferences.monthlyBudget);
    assign('householdSize', preferences.householdSize);
    assign('numAdults', preferences.numAdults);
    assign('numChildren', preferences.numChildren);
    assign('currentSeason', preferences.currentSeason);
    assign('pastSpend', preferences.pastSpend);
    assign('purchaseFrequency', preferences.purchaseFrequency);

    const radios = document.getElementsByName('essentialPriority');
    radios.forEach(radio => {
        radio.checked = radio.value === preferences.essentialPriority;
    });
}

function syncFilterInputs() {
    const { search, category, discount, sort } = state.filters;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = search;
    const cat = document.getElementById('categoryFilter');
    if (cat) cat.value = category;
    const disc = document.getElementById('discountFilter');
    if (disc) disc.value = discount;
    const sortSel = document.getElementById('priceSort');
    if (sortSel) sortSel.value = sort;
}

function syncHouseholdSize() {
    const adults = parseInt(document.getElementById('numAdults')?.value || '0', 10);
    const children = parseInt(document.getElementById('numChildren')?.value || '0', 10);
    const total = adults + children;
    const household = document.getElementById('householdSize');
    if (household && total > 0) household.value = total;
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

async function navigateToSection(sectionId) {
    // Hide all main sections
    const sections = ['home', 'personalize', 'featuresBar', 'recommendations', 'analytics', 'search', 'profile'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Update active nav link
    setActiveNav(sectionId);
    
    // Show the requested section
    const targetSection = sectionId.replace('#', '');
    const sectionElement = document.getElementById(targetSection);
    
    if (sectionElement) {
        sectionElement.style.display = '';
        
        // Special handling for personalize - also show features, recommendations, and analytics
        if (targetSection === 'personalize') {
            const featuresSection = document.getElementById('featuresBar');
            const recommendationsSection = document.getElementById('recommendations');
            const analyticsSection = document.getElementById('analytics');
            if (featuresSection) featuresSection.style.display = '';
            if (recommendationsSection) recommendationsSection.style.display = '';
            if (analyticsSection) {
                analyticsSection.style.display = '';
                analyticsSection.classList.remove('is-hidden');
            }
        }
        
        // Special handling for recommendations - show features bar too
        if (targetSection === 'recommendations') {
            const featuresSection = document.getElementById('featuresBar');
            if (featuresSection) featuresSection.style.display = '';
        }
        
        // Special handling for search - show all products initially
        if (targetSection === 'search') {
            if (state.products && state.products.length > 0) {
                setFilteredProducts(state.products);
                renderProducts(state.products, 'searchResultsGrid');
                updateSearchResultsTitle('All Products', state.products.length);
                showSearchResultsHeader(true);
            }
        }
        
        // Special handling for profile - load reports
        if (targetSection === 'profile') {
            await loadProfileSection();
        }
        
        // Scroll to section
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function handleFeatureSelection(feature) {
    setActiveFeature(feature);
    
    document.querySelectorAll('.feature-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-feature="${feature}"]`)?.classList.add('active');
    
    const featureNames = {
        quantity: 'Smart Quantity Optimization',
        seasonal: 'Seasonal Grocery Intelligence',
        household: 'Household-Aware Recommendations',
        health: 'Health-Aware Budget Optimization',
        substitute: 'Substitute Product Recommendation',
        savings: 'Savings Score & Monthly Ranking',
        prediction: 'Next Month Budget Prediction',
        explain: 'Recommendation Explanation Engine'
    };
    
    showToast(`Switched to: ${featureNames[feature] || feature}`, 'success');
    
    if (state.preferences) {
        handleRecommendations();
    }
}

function handleEssentialItemSelectChange() {
    const select = document.getElementById('essentialItemSelect');
    const customInput = document.getElementById('customEssentialItemInput');
    
    if (!select || !customInput) return;
    
    if (select.value === 'others') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
    }
}

async function handleAddEssentialItem() {
    const select = document.getElementById('essentialItemSelect');
    const customInput = document.getElementById('customEssentialItemInput');
    let itemToAdd = '';
    
    if (select?.value === 'others') {
        itemToAdd = customInput?.value?.trim();
        if (!itemToAdd) {
            showToast('Please enter a custom item name.', 'error');
            customInput?.focus();
            return;
        }
    } else {
        itemToAdd = select?.value;
        if (!itemToAdd) {
            showToast('Please select an item first.', 'error');
            return;
        }
    }
    
    await addEssentialItem(itemToAdd);
    await renderEssentialItems();
    showToast(`${itemToAdd} added to essential items.`, 'success');
    
    // Reset select and input
    if (select) select.value = '';
    if (customInput) {
        customInput.value = '';
        customInput.style.display = 'none';
    }
}

async function renderEssentialItems() {
    const items = await loadEssentialItems();
    const container = document.getElementById('essentialItemsListContainer');
    const listElement = document.getElementById('essentialItemsList');
    
    if (!container || !listElement) return;
    
    if (items.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    listElement.innerHTML = items.map(item => `
        <div class="chip" style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${item}</span>
            <button 
                type="button" 
                onclick="window.removeEssentialItemHandler('${item}')" 
                style="background: none; border: none; color: var(--text); cursor: pointer; padding: 0; font-size: 1.2rem; line-height: 1;"
                title="Remove ${item}"
            >×</button>
        </div>
    `).join('');
}

async function handleRemoveEssentialItem(item) {
    await removeEssentialItem(item);
    await renderEssentialItems();
    showToast(`${item} removed from essential items.`, 'info');
}

// Handle search with Firebase
async function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput?.value.trim() || '';
    
    if (!searchTerm) {
        // If empty, show all products
        setFilters({ search: '' });
        applyFilters();
        updateSearchResultsTitle('All Products', state.products?.length || 0);
        showSearchResultsHeader(true);
        return;
    }
    
    showLoading(true);
    try {
        const results = await searchProducts(searchTerm, 50);
        setFilteredProducts(results);
        renderProducts(results, 'searchResultsGrid');
        updateSearchResultsTitle(`Search: "${searchTerm}"`, results.length);
        showSearchResultsHeader(true);
        
        if (results.length > 0) {
            showToast(`Found ${results.length} products for "${searchTerm}"`, 'success');
        } else {
            showToast(`No products found for "${searchTerm}"`, 'info');
        }
        
        // Update filter state
        setFilters({ search: searchTerm });
    } catch (error) {
        console.error('Search error:', error);
        showToast('Search failed. Using local results.', 'error');
        // Fallback to client-side search
        setFilters({ search: searchTerm.toLowerCase() });
        applyFilters();
        updateSearchResultsTitle(`Search: "${searchTerm}"`, state.filteredProducts?.length || 0);
        showSearchResultsHeader(true);
    } finally {
        showLoading(false);
    }
}

function updateSearchResultsTitle(title, count) {
    const titleElement = document.getElementById('searchResultsTitle');
    if (titleElement) {
        titleElement.textContent = `${title} (${count})`;
    }
}

function showSearchResultsHeader(show) {
    const header = document.getElementById('searchResultsHeader');
    if (header) {
        header.style.display = show ? 'block' : 'none';
    }
}

// Make remove handler available globally for onclick
window.removeEssentialItemHandler = handleRemoveEssentialItem;

async function loadProfileSection() {
    if (!window.CURRENT_USER?.uid) {
        showToast('Please log in to view your profile', 'error');
        return;
    }

    showLoading(true);
    try {
        // Load user profile info
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        document.getElementById('profileName').textContent = currentUser?.firstName || currentUser?.email || 'User';
        document.getElementById('profileEmail').textContent = currentUser?.email || '—';

        // Load reports
        const reports = await getRecommendationReports(window.CURRENT_USER.uid);
        document.getElementById('profileReportCount').textContent = reports.length;
        renderReports(reports);
    } catch (error) {
        console.error('Failed to load profile:', error);
        showToast('Failed to load profile data', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleGenerateReport() {
    if (!window.CURRENT_USER?.uid) {
        showToast('Please log in to generate reports', 'error');
        return;
    }

    if (!state.preferences) {
        showToast('Please save your preferences first', 'error');
        navigateToSection('#personalize');
        return;
    }

<<<<<<< Updated upstream
    if (!state.lastRecommendationResult || !state.lastRecommendationResult.products || state.lastRecommendationResult.products.length === 0) {
=======
    if (!state.filteredProducts || state.filteredProducts.length === 0) {
>>>>>>> Stashed changes
        showToast('Please generate recommendations first', 'error');
        navigateToSection('#personalize');
        return;
    }

    showLoading(true);
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const userName = currentUser?.firstName || currentUser?.email || 'User';

<<<<<<< Updated upstream
        // Use the stored recommendation result directly
        const recommendationResult = state.lastRecommendationResult;
        
        // Add selected quantities to products
        const productsWithQuantities = recommendationResult.products.map((product, index) => ({
=======
        // Create recommendation result with quantities
        const productsWithQuantities = state.filteredProducts.map((product, index) => ({
>>>>>>> Stashed changes
            ...product,
            selectedQuantity: getProductQuantity(index)
        }));

<<<<<<< Updated upstream
        // Update recommendation result with quantities
        const updatedRecommendationResult = {
            ...recommendationResult,
            products: productsWithQuantities
        };

        const report = generateRecommendationReport(updatedRecommendationResult, state.preferences, userName);
=======
        const recommendationResult = {
            products: productsWithQuantities,
            totalCost: calculateTotalCostWithQuantities(),
            totalSavings: productsWithQuantities.reduce((sum, p) => {
                const savings = (parseFloat(p.original_price) || 0) - (parseFloat(p.discounted_price) || 0);
                return sum + (savings * (p.selectedQuantity || 1));
            }, 0),
            remainingBudget: state.preferences.monthlyBudget - calculateTotalCostWithQuantities(),
            metrics: getMetrics()
        };

        const report = generateRecommendationReport(recommendationResult, state.preferences, userName);
>>>>>>> Stashed changes
        await saveRecommendationReport(window.CURRENT_USER.uid, report);

        showToast('Report generated successfully!', 'success');
        await loadProfileSection();
    } catch (error) {
        console.error('Failed to generate report:', error);
<<<<<<< Updated upstream
        showToast(`Failed to generate report: ${error.message}`, 'error');
=======
        showToast('Failed to generate report', 'error');
>>>>>>> Stashed changes
    } finally {
        showLoading(false);
    }
}

async function handleViewReport(reportId) {
    if (!window.CURRENT_USER?.uid) return;

    showLoading(true);
    try {
        const report = await getRecommendationReport(window.CURRENT_USER.uid, reportId);
        if (report) {
            showReportModal(report);
        } else {
            showToast('Report not found', 'error');
        }
    } catch (error) {
        console.error('Failed to load report:', error);
        showToast('Failed to load report', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleDownloadReport(reportId, format = 'html') {
    if (!window.CURRENT_USER?.uid) return;

    showLoading(true);
    try {
        const report = await getRecommendationReport(window.CURRENT_USER.uid, reportId);
        if (!report) {
            showToast('Report not found', 'error');
            return;
        }

        const htmlContent = generateHTMLReport(report);

        if (format === 'pdf') {
            // Open in new window for printing to PDF
            const printWindow = window.open('', '_blank');
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        } else if (format === 'word') {
            // Generate Word document using MHTML
            generateWordReport(htmlContent, report);
        } else {
            // Download as HTML
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `IntelliGrocer_Report_${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        showToast(`Report downloaded as ${format.toUpperCase()}`, 'success');
    } catch (error) {
        console.error('Failed to download report:', error);
        showToast('Failed to download report', 'error');
    } finally {
        showLoading(false);
    }
}

function generateWordReport(htmlContent, report) {
    // Create MHTML format for Word
    const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="BOUNDARY"

--BOUNDARY
Content-Type: text/html; charset="utf-8"
Content-Location: report.html

${htmlContent}

--BOUNDARY--`;

    const blob = new Blob([mhtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IntelliGrocer_Report_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
<<<<<<< Updated upstream

async function handleDeleteReport(reportId) {
    if (!window.CURRENT_USER?.uid) return;

    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
        return;
    }

    showLoading(true);
    try {
        await deleteRecommendationReport(window.CURRENT_USER.uid, reportId);
        showToast('Report deleted successfully', 'success');
        await loadProfileSection();
    } catch (error) {
        console.error('Failed to delete report:', error);
        showToast('Failed to delete report', 'error');
    } finally {
        showLoading(false);
    }
}
=======
>>>>>>> Stashed changes
