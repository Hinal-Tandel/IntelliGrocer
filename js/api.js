import { getProducts as fsGetProducts, getRecommendations as fsGetRecommendations, getAnalytics as fsGetAnalytics } from './firebase.js';

export async function fetchProducts() {
    const products = await fsGetProducts();
    return { products };
}

// Basic client-side recommendation: prioritize higher discounts, filter by preferences if provided
export async function fetchRecommendations(preferences) {
    const products = await fsGetProducts();
    let recs = Array.isArray(products) ? [...products] : [];
    
    // Filter by monthly budget
    if (preferences?.monthlyBudget) {
        // Prefer items with discounted_price within budget window
        recs = recs.filter(p => (p.discounted_price ?? p.price ?? 0) <= preferences.monthlyBudget);
    }
    
    // Prioritize essentials if user has selected that option
    if (preferences?.essentialPriority === 'yes') {
        // Filter to only show essential items
        recs = recs.filter(p => p.is_essential === true || p.is_essential === 'true');
    }
    
    // Sort by discount percent descending if available
    recs.sort((a, b) => {
        const ad = parseInt(String(a.discount || '').replace(/[^0-9]/g, ''), 10) || 0;
        const bd = parseInt(String(b.discount || '').replace(/[^0-9]/g, ''), 10) || 0;
        return bd - ad;
    });

    return { recommendations: recs.slice(0, 50) };
}

export async function fetchAnalytics() {
    const data = await fsGetAnalytics();
    return data;
}
