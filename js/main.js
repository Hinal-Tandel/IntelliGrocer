import { fetchProducts, fetchRecommendations, fetchAnalytics } from './api.js';
import { state, setProducts, setFilteredProducts, setCategories, setPreferences, setFilters, getMetrics, setActiveFeature, getActiveFeature } from './state.js';
import { renderCategoryFilter, renderProducts, showLoading, showToast, renderPreferencesChips, renderMetrics, renderAnalyticsCharts, toggleAnalytics, openProductModal, closeProductModal, setActiveNav, renderFeatureCards, renderRecommendationSummary, renderReports, renderProfileInfo, showReportModal } from './ui.js';
import { filterProducts } from './filters.js';
import { savePreferences, loadPreferences, loadEssentialItems, addEssentialItem, removeEssentialItem } from './storage.js';
import { scrollToAnchor } from './utils.js';
import { auth, onAuthStateChanged, saveUserPreferences, saveRecommendations, searchProducts, searchByCategory, getCategories, saveRecommendationReport, getRecommendationReports, getRecommendationReport, getUserProfile } from './firebase.js';
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

    // Profile and reports handlers
    document.getElementById('generateReportBtn')?.addEventListener('click', handleGenerateReport);
    
    // Delegate event handlers for report cards (since they're dynamically created)
    document.getElementById('reportsList')?.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-report-btn');
        const downloadToggleBtn = e.target.closest('.download-toggle-btn');
        const downloadFormatBtn = e.target.closest('.download-format-btn');
        
        if (viewBtn) {
            const reportId = viewBtn.getAttribute('data-report-id');
            handleViewReport(reportId);
        } else if (downloadToggleBtn) {
            const reportId = downloadToggleBtn.getAttribute('data-report-id');
            toggleDownloadMenu(reportId);
        } else if (downloadFormatBtn) {
            const reportId = downloadFormatBtn.getAttribute('data-report-id');
            const format = downloadFormatBtn.getAttribute('data-format');
            handleDownloadReport(reportId, format);
            closeAllDownloadMenus();
        }
    });
    
    // Download format selection from modal
    document.addEventListener('click', (e) => {
        const downloadFormatBtn = e.target.closest('.download-format-btn');
        if (downloadFormatBtn && !e.target.closest('#reportsList')) {
            const reportId = downloadFormatBtn.getAttribute('data-report-id');
            const format = downloadFormatBtn.getAttribute('data-format');
            handleDownloadReport(reportId, format);
        }
        
        // Close dropdowns when clicking outside
        if (!e.target.closest('.download-dropdown') && !e.target.closest('.download-toggle-btn')) {
            closeAllDownloadMenus();
        }
    });

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
        const card = e.target.closest('[data-product-index]');
        if (!card) return;
        const index = Number(card.getAttribute('data-product-index'));
        const product = state.filteredProducts[index];
        if (product) openProductModal(product);
    });
    
    const searchGrid = document.getElementById('searchResultsGrid');
    searchGrid?.addEventListener('click', (e) => {
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
        
        // Update state with recommended products
        setFilteredProducts(recommendationResult.products);
        
        // Render products and summary
        renderProducts(recommendationResult.products, 'recommendationsGrid');
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
        
        // Special handling for search - show all products initially
        if (targetSection === 'search') {
            if (state.products && state.products.length > 0) {
                setFilteredProducts(state.products);
                renderProducts(state.products, 'searchResultsGrid');
                updateSearchResultsTitle('All Products', state.products.length);
                showSearchResultsHeader(true);
            }
        }
        
        // Special handling for profile - load user reports
        if (targetSection === 'profile') {
            loadUserReports();
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

// Report handling functions
async function handleGenerateReport() {
    if (!state.preferences) {
        showToast('Please save your preferences first.', 'error');
        navigateToSection('#personalize');
        return;
    }
    
    if (!state.filteredProducts || state.filteredProducts.length === 0) {
        showToast('Please generate recommendations first.', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userName = currentUser.firstName || currentUser.displayName || currentUser.email || 'User';
        
        // Generate recommendation result using the budget algorithm
        const recommendationResult = generateBudgetRecommendations(state.filteredProducts, state.preferences);
        
        // Generate the report
        const report = generateRecommendationReport(recommendationResult, state.preferences, userName);
        
        // Save to Firebase
        if (window.CURRENT_USER?.uid) {
            await saveRecommendationReport(window.CURRENT_USER.uid, report);
        }
        
        // Reload reports list
        await loadUserReports();
        
        showToast('Report generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Failed to generate report.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleViewReport(reportId) {
    showLoading(true);
    try {
        if (!window.CURRENT_USER?.uid) {
            showToast('Please log in to view reports.', 'error');
            return;
        }
        
        const report = await getRecommendationReport(window.CURRENT_USER.uid, reportId);
        
        if (!report) {
            showToast('Report not found.', 'error');
            return;
        }
        
        showReportModal(report);
    } catch (error) {
        console.error('Error viewing report:', error);
        showToast('Failed to load report.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleDownloadReport(reportId, format = 'html') {
    showLoading(true);
    try {
        if (!window.CURRENT_USER?.uid) {
            showToast('Please log in to download reports.', 'error');
            return;
        }
        
        const report = await getRecommendationReport(window.CURRENT_USER.uid, reportId);
        
        if (!report) {
            showToast('Report not found.', 'error');
            return;
        }
        
        const dateStr = new Date(report.timestamp).toISOString().split('T')[0];
        
        if (format === 'html') {
            // Generate HTML report
            const htmlContent = generateHTMLReport(report);
            const blob = new Blob([htmlContent], { type: 'text/html' });
            downloadFile(blob, `IntelliGrocer_Report_${dateStr}.html`);
            showToast('HTML report downloaded successfully!', 'success');
        } else if (format === 'pdf') {
            // Generate PDF using print
            const htmlContent = generateHTMLReport(report);
            const printWindow = window.open('', '_blank');
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Wait for content to load then trigger print
            setTimeout(() => {
                printWindow.print();
                showToast('PDF print dialog opened. Save as PDF.', 'success');
            }, 500);
        } else if (format === 'word') {
            // Generate Word-compatible HTML
            const htmlContent = generateWordReport(report);
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            downloadFile(blob, `IntelliGrocer_Report_${dateStr}.doc`);
            showToast('Word document downloaded successfully!', 'success');
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        showToast('Failed to download report.', 'error');
    } finally {
        showLoading(false);
    }
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateWordReport(report) {
    // Generate Word-compatible HTML with MHTML format
    const categoriesHTML = Object.entries(report.categoryBreakdown)
        .sort((a, b) => b[1].totalCost - a[1].totalCost)
        .map(([category, data]) => `
            <tr>
                <td>${category}</td>
                <td>${data.count}</td>
                <td>₹${data.totalCost.toFixed(2)}</td>
                <td>₹${data.totalSavings.toFixed(2)}</td>
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
    
    return `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>IntelliGrocer - Recommendation Report</title>
            <style>
                body {
                    font-family: Calibri, Arial, sans-serif;
                    margin: 40px;
                }
                h1 { color: #2c3e50; text-align: center; }
                h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th, td {
                    padding: 10px;
                    text-align: left;
                    border: 1px solid #ddd;
                }
                th {
                    background-color: #3498db;
                    color: white;
                    font-weight: bold;
                }
                .summary-table td {
                    font-weight: bold;
                }
                .savings { color: #27ae60; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>🛒 IntelliGrocer Recommendation Report</h1>
            <p style="text-align: center; color: #7f8c8d;">Generated on ${report.reportDate}</p>
            <p style="text-align: center; color: #7f8c8d;">For: ${report.userName}</p>
            
            <h2>Summary</h2>
            <table class="summary-table">
                <tr>
                    <td>Total Products:</td>
                    <td>${report.summary.totalProducts}</td>
                    <td>Essential Items:</td>
                    <td>${report.summary.essentialItems}</td>
                </tr>
                <tr>
                    <td>Total Cost:</td>
                    <td>₹${report.summary.totalCost.toFixed(2)}</td>
                    <td class="savings">Total Savings:</td>
                    <td class="savings">₹${report.summary.totalSavings.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Budget:</td>
                    <td>₹${report.preferences.monthlyBudget}</td>
                    <td>Remaining Budget:</td>
                    <td>₹${report.summary.remainingBudget.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Budget Utilization:</td>
                    <td>${report.summary.budgetUtilization}%</td>
                    <td>Average Discount:</td>
                    <td>${report.summary.averageDiscount.toFixed(1)}%</td>
                </tr>
            </table>
            
            <h2>User Preferences</h2>
            <table>
                <tr>
                    <th>Monthly Budget</th>
                    <th>Household Size</th>
                    <th>Season</th>
                    <th>Purchase Frequency</th>
                </tr>
                <tr>
                    <td>₹${report.preferences.monthlyBudget}</td>
                    <td>${report.preferences.householdSize} people</td>
                    <td>${report.preferences.currentSeason}</td>
                    <td>${report.preferences.purchaseFrequency}</td>
                </tr>
            </table>
            
            <h2>Category Breakdown</h2>
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Products</th>
                        <th>Total Cost</th>
                        <th>Total Savings</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoriesHTML}
                </tbody>
            </table>
            
            <h2>All Recommended Products</h2>
            <table>
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
            
            <p style="text-align: center; color: #7f8c8d; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
                Generated by IntelliGrocer - Smart Grocery Management System<br>
                Report ID: ${report.id}
            </p>
        </body>
        </html>
    `;
}

function toggleDownloadMenu(reportId) {
    const menu = document.querySelector(`.download-menu[data-report-id="${reportId}"]`);
    if (menu) {
        const isVisible = menu.style.display !== 'none';
        closeAllDownloadMenus();
        menu.style.display = isVisible ? 'none' : 'block';
    }
}

function closeAllDownloadMenus() {
    document.querySelectorAll('.download-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

async function loadUserReports() {
    if (!window.CURRENT_USER?.uid) return;
    
    try {
        const reports = await getRecommendationReports(window.CURRENT_USER.uid);
        renderReports(reports);
        
        // Update profile info
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        renderProfileInfo(currentUser, reports.length);
    } catch (error) {
        console.error('Error loading reports:', error);
        showToast('Failed to load reports.', 'error');
    }
}

// Make remove handler available globally for onclick
window.removeEssentialItemHandler = handleRemoveEssentialItem;
