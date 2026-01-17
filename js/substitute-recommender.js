/**
 * Substitute Product Recommendation System
 * Client-side integration for KNN-based recommendations
 */

class SubstituteRecommender {
  constructor(recommendationsData = null) {
    this.recommendations = recommendationsData || {};
    this.isLoaded = false;
    this.loadPromise = this.loadRecommendations();
  }

  /**
   * Load recommendations from substitutes_recommendations.json
   */
  async loadRecommendations() {
    try {
      const response = await fetch('substitutes_recommendations.json');
      if (response.ok) {
        this.recommendations = await response.json();
        this.isLoaded = true;
        console.log('✓ Loaded substitute recommendations for', Object.keys(this.recommendations).length, 'products');
      }
    } catch (error) {
      console.warn('Could not load recommendations JSON:', error);
    }
  }

  /**
   * Wait for recommendations to load
   */
  async waitForLoad() {
    await this.loadPromise;
  }

  /**
   * Get substitutes for a product
   * @param {string} productName - Product name to find substitutes for
   * @param {number} limit - Maximum number of substitutes to return
   * @returns {Array} Array of substitute products
   */
  getSubstitutes(productName, limit = 5) {
    const data = this.recommendations[productName];
    if (!data || !data.substitutes) {
      return [];
    }
    return data.substitutes.slice(0, limit);
  }

  /**
   * Get all substitutes for multiple products
   * @param {Array} productNames - Array of product names
   * @param {number} limit - Maximum substitutes per product
   * @returns {Object} Map of product names to their substitutes
   */
  getMultipleSubstitutes(productNames, limit = 3) {
    const results = {};
    productNames.forEach(name => {
      const subs = this.getSubstitutes(name, limit);
      if (subs.length > 0) {
        results[name] = subs;
      }
    });
    return results;
  }

  /**
   * Get savings amount for a product's best substitute
   * @param {string} productName - Product name
   * @returns {number} Savings in rupees (0 if no substitute available)
   */
  getSavingsAmount(productName) {
    const subs = this.getSubstitutes(productName, 1);
    if (subs.length === 0) return 0;
    return parseFloat(subs[0].price_difference) || 0;
  }

  /**
   * Get total potential savings for a basket of products
   * @param {Array} productNames - Array of product names
   * @returns {number} Total savings in rupees
   */
  getTotalSavings(productNames) {
    return productNames.reduce((total, name) => {
      return total + Math.abs(this.getSavingsAmount(name));
    }, 0);
  }

  /**
   * Check if a product has substitutes
   * @param {string} productName - Product name
   * @returns {boolean} True if substitutes exist
   */
  hasSubstitutes(productName) {
    return productName in this.recommendations && 
           this.recommendations[productName].substitutes.length > 0;
  }

  /**
   * Get recommendation statistics
   * @returns {Object} Statistics about available recommendations
   */
  getStats() {
    let totalProducts = 0;
    let productsWithSubs = 0;
    let totalSubs = 0;
    let totalPotentialSavings = 0;

    Object.entries(this.recommendations).forEach(([productName, data]) => {
      totalProducts++;
      if (data.substitutes && data.substitutes.length > 0) {
        productsWithSubs++;
        totalSubs += data.substitutes.length;
        totalPotentialSavings += data.substitutes[0].price_difference || 0;
      }
    });

    return {
      totalProducts,
      productsWithSubs,
      coverage: ((productsWithSubs / totalProducts) * 100).toFixed(2) + '%',
      totalSubstitutes: totalSubs,
      totalPotentialSavings: totalPotentialSavings.toFixed(2),
      avgSubstitutesPerProduct: (totalSubs / productsWithSubs).toFixed(2)
    };
  }

  /**
   * Format a substitute for display
   * @param {Object} substitute - Substitute product data
   * @returns {string} Formatted HTML string
   */
  formatSubstituteCard(substitute) {
    const savings = Math.abs(substitute.price_difference).toFixed(2);
    const discount = substitute.discount_pct.toFixed(1);
    
    return `
      <div class="substitute-card">
        <div class="substitute-name">${substitute.name}</div>
        <div class="substitute-details">
          <span class="price">₹${substitute.discounted_price.toFixed(2)}</span>
          <span class="discount-badge">${discount}% OFF</span>
        </div>
        <div class="substitute-savings">
          💰 Save ₹${savings}
        </div>
        <div class="substitute-reason">${substitute.name} is ${savings > 0 ? 'cheaper' : 'more expensive'}</div>
      </div>
    `;
  }

  /**
   * Display substitutes in an HTML container
   * @param {string} productName - Product name
   * @param {string} containerId - ID of container element
   * @param {number} limit - Maximum substitutes to display
   */
  displaySubstitutes(productName, containerId, limit = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const subs = this.getSubstitutes(productName, limit);
    
    if (subs.length === 0) {
      container.innerHTML = '<p class="no-substitutes">No cheaper alternatives available</p>';
      return;
    }

    const html = `
      <div class="substitutes-container">
        <h4>💡 Cheaper Alternatives</h4>
        <div class="substitutes-grid">
          ${subs.map(sub => this.formatSubstituteCard(sub)).join('')}
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  }

  /**
   * Add recommendation badge to a product element
   * @param {HTMLElement} productElement - Product DOM element
   * @param {string} productName - Product name
   */
  addRecommendationBadge(productElement, productName) {
    if (!this.hasSubstitutes(productName)) return;

    const savings = this.getSavingsAmount(productName);
    if (savings > 0) {
      const badge = document.createElement('div');
      badge.className = 'recommendation-badge';
      badge.innerHTML = `💰 Save ₹${savings.toFixed(2)}`;
      productElement.appendChild(badge);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubstituteRecommender;
}
