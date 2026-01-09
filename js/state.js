export const state = {
    products: [],
    filteredProducts: [],
    categories: [],
    preferences: null,
    filters: {
        search: '',
        category: '',
        discount: '',
        sort: ''
    },
    activeFeature: 'quantity',
    selectedQuantities: {} // Track selected quantities by product index
};

export function setProducts(products) {
    state.products = products || [];
    state.filteredProducts = products || [];
}

export function setFilteredProducts(products) {
    state.filteredProducts = products || [];
}

export function setCategories(categories) {
    state.categories = categories || [];
}

export function setPreferences(preferences) {
    state.preferences = preferences;
}

export function setFilters(nextFilters) {
    state.filters = { ...state.filters, ...nextFilters };
}

export function setActiveFeature(feature) {
    state.activeFeature = feature;
}

export function getActiveFeature() {
    return state.activeFeature;
}
export function setProductQuantity(productIndex, quantity) {
    const qty = Math.max(1, Math.min(99, parseInt(quantity) || 1));
    state.selectedQuantities[productIndex] = qty;
    
    // Update the product in filteredProducts if it exists
    if (state.filteredProducts[productIndex]) {
        state.filteredProducts[productIndex].selectedQuantity = qty;
    }
    
    return qty;
}

export function getProductQuantity(productIndex) {
    return state.selectedQuantities[productIndex] || 1;
}

export function clearQuantities() {
    state.selectedQuantities = {};
}
export function getMetrics() {
    const deals = state.products.length;
    const categories = state.categories.length;
    const avgSavings = computeAvgSavings(state.products);
    return { deals, categories, avgSavings };
}

function computeAvgSavings(products) {
    if (!products || products.length === 0) return 0;
    const total = products.reduce((sum, item) => sum + Math.max(0, (item.original_price || 0) - (item.discounted_price || 0)), 0);
    return Math.round(total / products.length);
}
