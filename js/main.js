import { fetchProducts, fetchRecommendations, fetchAnalytics } from './api.js';
import { state, setProducts, setFilteredProducts, setCategories, setPreferences, setFilters, getMetrics, setActiveFeature, getActiveFeature } from './state.js';
import { renderCategoryFilter, renderProducts, showLoading, showToast, renderPreferencesChips, renderMetrics, renderAnalyticsCharts, toggleAnalytics, openProductModal, closeProductModal, setActiveNav, renderFeatureCards, renderRecommendationSummary } from './ui.js';
import { filterProducts } from './filters.js';
import { savePreferences, loadPreferences, loadEssentialItems, addEssentialItem, removeEssentialItem } from './storage.js';
import { scrollToAnchor } from './utils.js';
import { auth, onAuthStateChanged, saveUserPreferences, saveRecommendations } from './firebase.js';
import { generateBudgetRecommendations, generateRecommendationSummary } from './recommendation.js';

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

    document.getElementById('searchBtn')?.addEventListener('click', () => {
        setFilters({ search: document.getElementById('searchInput')?.value.trim().toLowerCase() || '' });
        applyFilters();
    });

    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setFilters({ search: e.target.value.trim().toLowerCase() });
            applyFilters();
        }
    });

    document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
        setFilters({ category: e.target.value });
        applyFilters();
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

    const grid = document.getElementById('recommendationsGrid');
    grid?.addEventListener('click', (e) => {
        const card = e.target.closest('[data-product-index]');
        if (!card) return;
        const index = Number(card.getAttribute('data-product-index'));
        const product = state.filteredProducts[index];
        if (product) openProductModal(product);
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
}

async function loadProductsFlow() {
    showLoading(true);
    try {
        const data = await fetchProducts();
        setProducts(data.products || []);
        const categories = Array.from(new Set((data.products || []).map(p => p.category).filter(Boolean))).sort();
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
    renderProducts(products);
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
        
        // Update state with recommended products
        setFilteredProducts(recommendationResult.products);
        
        // Render products and summary
        renderProducts(recommendationResult.products);
        renderRecommendationSummary(recommendationResult);
        renderMetrics(getMetrics());
        
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

function navigateToSection(sectionId) {
    // Hide all main sections
    const sections = ['home', 'personalize', 'featuresBar', 'recommendations', 'analytics', 'search'];
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

// Make remove handler available globally for onclick
window.removeEssentialItemHandler = handleRemoveEssentialItem;
