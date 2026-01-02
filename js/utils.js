export function extractDiscountPercent(discountStr) {
    if (!discountStr) return 0;
    const match = discountStr.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
}

export function getDiscountClass(percent) {
    if (percent >= 40) return 'discount-high';
    if (percent >= 20) return 'discount-medium';
    return 'discount-low';
}

export function formatCurrency(amount) {
    if (Number.isNaN(amount)) return '₹0';
    return `₹${Number(amount).toFixed(2)}`;
}

export function scrollToAnchor(selector) {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}
