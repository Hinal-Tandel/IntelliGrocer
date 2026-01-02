import { extractDiscountPercent } from './utils.js';

export function filterProducts(products, { search, category, discount, sort }) {
    let result = Array.isArray(products) ? [...products] : [];

    if (search) {
        const term = search.toLowerCase();
        result = result.filter(p =>
            (p.name || '').toLowerCase().includes(term) ||
            (p.category || '').toLowerCase().includes(term)
        );
    }

    if (category) {
        result = result.filter(p => p.category === category);
    }

    if (discount) {
        result = result.filter(p => {
            const percent = extractDiscountPercent(p.discount);
            if (discount === 'high') return percent > 40;
            if (discount === 'medium') return percent >= 20 && percent <= 40;
            if (discount === 'low') return percent > 0 && percent < 20;
            return true;
        });
    }

    if (sort === 'low-high') {
        result.sort((a, b) => (a.discounted_price || 0) - (b.discounted_price || 0));
    } else if (sort === 'high-low') {
        result.sort((a, b) => (b.discounted_price || 0) - (a.discounted_price || 0));
    }

    return result;
}
