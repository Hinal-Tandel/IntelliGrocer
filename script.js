// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// Global state
let allProducts = [];
let filteredProducts = [];
let categories = new Set();
let userPreferences = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadSavedPreferences();
});

// Initialize the application
async function initializeApp() {
    await loadProducts();
    populateCategoryFilter();
    displayProducts(allProducts);
}

// Setup event listeners
function setupEventListeners() {
    // User Preferences Form
    document.getElementById('preferencesForm').addEventListener('submit', handlePreferencesSubmit);
    
    // Auto-calculate household validation
    document.getElementById('numAdults').addEventListener('input', validateHouseholdSize);
    document.getElementById('numChildren').addEventListener('input', validateHouseholdSize);
    
    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Filter and sort
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('discountFilter').addEventListener('change', applyFilters);
    document.getElementById('priceSort').addEventListener('change', applyFilters);

    // Recommendations
    document.getElementById('getRecommendationsBtn').addEventListener('click', getRecommendations);

    // Analytics
    document.getElementById('generateChartsBtn').addEventListener('click', generateAnalytics);

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavigation(e.target.getAttribute('href'));
        });
    });

    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('productModal');
        if (e.target === modal) closeModal();
    });
}

// Load products from the backend
async function loadProducts() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (!response.ok) throw new Error('Failed to load products');
        
        const data = await response.json();
        allProducts = data.products;
        filteredProducts = [...allProducts];
        
        // Extract categories
        allProducts.forEach(product => {
            if (product.category) categories.add(product.category);
        });
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showError('Failed to load products. Make sure the Python server is running.');
        console.error('Error loading products:', error);
    }
}

// Display products in the grid
function displayProducts(products) {
    const grid = document.getElementById('recommendationsGrid');
    
    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h4>No products found</h4>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => createProductCard(product)).join('');
    
    // Add click listeners to product cards
    document.querySelectorAll('.product-card').forEach((card, index) => {
        card.addEventListener('click', () => showProductDetails(products[index]));
    });
}

// Create a product card HTML
function createProductCard(product) {
    const discountPercent = extractDiscountPercent(product.discount);
    const discountClass = getDiscountClass(discountPercent);
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <h4 class="product-name">${product.name}</h4>
            <span class="product-category">${product.category}</span>
            <p class="product-quantity">📦 ${product.quantity}</p>
            <div class="product-prices">
                <span class="original-price">₹${product.original_price.toFixed(2)}</span>
                <span class="discounted-price">₹${product.discounted_price.toFixed(2)}</span>
            </div>
            ${discountPercent > 0 ? `<span class="discount-badge ${discountClass}">${product.discount}</span>` : ''}
        </div>
    `;
}

// Extract numeric discount percentage
function extractDiscountPercent(discountStr) {
    if (!discountStr) return 0;
    const match = discountStr.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
}

// Get discount class based on percentage
function getDiscountClass(percent) {
    if (percent >= 40) return 'discount-high';
    if (percent >= 20) return 'discount-medium';
    return 'discount-low';
}

// Handle search functionality
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
    }
    
    applyFilters();
}

// Handle user preferences form submission
async function handlePreferencesSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    userPreferences = {
        monthlyBudget: parseFloat(formData.get('monthlyBudget')),
        householdSize: parseInt(formData.get('householdSize')),
        numAdults: parseInt(formData.get('numAdults')),
        numChildren: parseInt(formData.get('numChildren')),
        currentSeason: formData.get('currentSeason'),
        pastSpend: parseFloat(formData.get('pastSpend')),
        purchaseFrequency: formData.get('purchaseFrequency'),
        essentialPriority: formData.get('essentialPriority')
    };
    
    // Save to localStorage
    localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
    
    // Show success message
    alert('✅ Preferences saved successfully! Getting personalized recommendations...');
    
    // Get personalized recommendations
    await getRecommendations();
    
    // Scroll to recommendations
    document.getElementById('recommendations').scrollIntoView({ behavior: 'smooth' });
}

// Load saved preferences from localStorage
function loadSavedPreferences() {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
        userPreferences = JSON.parse(saved);
        
        // Populate form with saved values
        document.getElementById('monthlyBudget').value = userPreferences.monthlyBudget;
        document.getElementById('householdSize').value = userPreferences.householdSize;
        document.getElementById('numAdults').value = userPreferences.numAdults;
        document.getElementById('numChildren').value = userPreferences.numChildren;
        document.getElementById('currentSeason').value = userPreferences.currentSeason;
        document.getElementById('pastSpend').value = userPreferences.pastSpend;
        document.getElementById('purchaseFrequency').value = userPreferences.purchaseFrequency;
        
        // Set radio button
        const essentialRadios = document.getElementsByName('essentialPriority');
        essentialRadios.forEach(radio => {
            if (radio.value === userPreferences.essentialPriority) {
                radio.checked = true;
            }
        });
    }
}

// Validate household size
function validateHouseholdSize() {
    const adults = parseInt(document.getElementById('numAdults').value) || 0;
    const children = parseInt(document.getElementById('numChildren').value) || 0;
    const householdSize = document.getElementById('householdSize');
    
    const total = adults + children;
    if (total > 0) {
        householdSize.value = total;
    }
}

// Apply filters and sorting
function applyFilters() {
    let products = [...filteredProducts];
    
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter').value;
    if (categoryFilter) {
        products = products.filter(p => p.category === categoryFilter);
    }
    
    // Discount filter
    const discountFilter = document.getElementById('discountFilter').value;
    if (discountFilter) {
        products = products.filter(p => {
            const discount = extractDiscountPercent(p.discount);
            if (discountFilter === 'high') return discount > 40;
            if (discountFilter === 'medium') return discount >= 20 && discount <= 40;
            if (discountFilter === 'low') return discount < 20 && discount > 0;
            return true;
        });
    }
    
    // Price sorting
    const priceSort = document.getElementById('priceSort').value;
    if (priceSort === 'low-high') {
        products.sort((a, b) => a.discounted_price - b.discounted_price);
    } else if (priceSort === 'high-low') {
        products.sort((a, b) => b.discounted_price - a.discounted_price);
    }
    
    displayProducts(products);
}

// Populate category filter dropdown
function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    const sortedCategories = Array.from(categories).sort();
    
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Get AI-powered recommendations
async function getRecommendations() {
    showLoading(true);
    try {
        // Prepare request body
        const requestBody = userPreferences ? { preferences: userPreferences } : {};
        
        const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) throw new Error('Failed to get recommendations');
        
        const data = await response.json();
        filteredProducts = data.recommendations;
        displayProducts(filteredProducts);
        showLoading(false);
        
        // Show preference-based message if applicable
        if (userPreferences) {
            const budgetInfo = `Budget: ₹${userPreferences.monthlyBudget}, Household: ${userPreferences.householdSize} members`;
            console.log(`Personalized recommendations based on: ${budgetInfo}`);
        }
        
        // Scroll to recommendations
        document.getElementById('recommendations').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        showLoading(false);
        showError('Failed to get recommendations. Please try again.');
        console.error('Error getting recommendations:', error);
    }
}

// Generate analytics charts
async function generateAnalytics() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics`);
        if (!response.ok) throw new Error('Failed to generate analytics');
        
        const data = await response.json();
        
        // Display charts
        document.getElementById('categoryChartImg').src = `data:image/png;base64,${data.category_chart}`;
        document.getElementById('priceDiscountChartImg').src = `data:image/png;base64,${data.price_discount_chart}`;
        document.getElementById('topDealsChartImg').src = `data:image/png;base64,${data.top_deals_chart}`;
        
        showLoading(false);
        alert('Analytics generated successfully!');
    } catch (error) {
        showLoading(false);
        showError('Failed to generate analytics. Please try again.');
        console.error('Error generating analytics:', error);
    }
}

// Show product details in modal
function showProductDetails(product) {
    const modalBody = document.getElementById('modalBody');
    const savingsAmount = (product.original_price - product.discounted_price).toFixed(2);
    const savingsPercent = ((savingsAmount / product.original_price) * 100).toFixed(1);
    
    modalBody.innerHTML = `
        <h3>${product.name}</h3>
        <p><strong>Category:</strong> ${product.category}</p>
        <p><strong>Quantity:</strong> ${product.quantity}</p>
        <p><strong>Original Price:</strong> ₹${product.original_price.toFixed(2)}</p>
        <p><strong>Discounted Price:</strong> ₹${product.discounted_price.toFixed(2)}</p>
        <p><strong>Discount:</strong> ${product.discount}</p>
        <p><strong>You Save:</strong> ₹${savingsAmount} (${savingsPercent}%)</p>
        <p style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ddd;">
            <em>This product offers great value! ${savingsPercent > 30 ? '🔥 Hot Deal!' : ''}</em>
        </p>
    `;
    
    document.getElementById('productModal').classList.remove('hidden');
}

// Close modal
function closeModal() {
    document.getElementById('productModal').classList.add('hidden');
}

// Handle navigation
function handleNavigation(target) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === target) {
            link.classList.add('active');
        }
    });
    
    // Show/hide sections
    if (target === '#analytics') {
        document.getElementById('analytics').classList.remove('hidden');
    } else {
        document.getElementById('analytics').classList.add('hidden');
    }
    
    // Scroll to section
    document.querySelector(target).scrollIntoView({ behavior: 'smooth' });
}

// Show/hide loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

// Show error message
function showError(message) {
    alert('Error: ' + message);
}

// Utility: Format currency
function formatCurrency(amount) {
    return `₹${amount.toFixed(2)}`;
}
