const API_BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Request failed');
    }
    return response.json();
}

export async function fetchProducts() {
    return request('/api/products');
}

export async function fetchRecommendations(preferences) {
    const body = preferences ? { preferences } : {};
    return request('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

export async function fetchAnalytics() {
    return request('/api/analytics');
}
