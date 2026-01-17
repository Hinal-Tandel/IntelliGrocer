/**
 * Substitute Recommendation UI Integration
 * Handles user interactions for showing substitutes based on preferences
 */

class PreferenceBasedRecommender {
  constructor() {
    this.recommender = null;
    this.selectedEssentialItems = [];
    this.recommendationModal = null;
    this.init();
  }

  /**
   * Initialize the recommender system
   */
  async init() {
    // Initialize main recommender
    this.recommender = new SubstituteRecommender();
    
    // Wait for JSON to load before setting up event listeners
    try {
      await this.recommender.waitForLoad();
      this.setupEventListeners();
      console.log('✓ Preference-based recommender initialized with loaded recommendations');
    } catch (error) {
      console.error('✗ Failed to initialize recommender:', error);
      // Still setup event listeners even if loading fails
      this.setupEventListeners();
    }
  }

  /**
   * Setup event listeners for substitute button
   */
  setupEventListeners() {
    // Listen for clicks on substitute buttons (product cards, search results, etc.)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-show-substitutes') || 
          e.target.closest('.btn-show-substitutes')) {
        const button = e.target.closest('.btn-show-substitutes');
        const productName = button.getAttribute('data-product-name');
        console.log('✓ Substitute button clicked for:', productName);
        this.showSubstituteRecommendations(productName);
        e.preventDefault();
      }

      // Listen for add to cart buttons in recommendation modal
      if (e.target.classList.contains('btn-add-substitute')) {
        const button = e.target;
        const originalProductName = button.getAttribute('data-product-name');
        const substituteName = button.getAttribute('data-substitute-name');
        const modal = button.closest('.modal-overlay');
        console.log('Add substitute clicked:', { originalProductName, substituteName });
        this.swapProductWithSubstitute(originalProductName, substituteName, modal);
        e.preventDefault();
      }

      // Listen for view buttons in recommendation modal
      if (e.target.classList.contains('btn-view-substitute')) {
        const button = e.target;
        const substituteName = button.getAttribute('data-substitute-name');
        const modal = button.closest('.modal-overlay');
        this.viewProductDetails(substituteName, modal);
        e.preventDefault();
      }
    });

    // Listen for substitute button in product modal
    const modalSubstituteBtn = document.getElementById('modalSubstituteBtn');
    if (modalSubstituteBtn) {
      modalSubstituteBtn.addEventListener('click', () => {
        const productName = document.getElementById('modalProductName')?.textContent;
        if (productName) {
          this.showSubstituteRecommendations(productName);
        }
      });
    }
  }

  /**
   * Get currently selected essential items from preferences
   */
  getSelectedEssentialItems() {
    const essentialList = document.getElementById('essentialItemsList');
    if (!essentialList) return [];
    
    const items = [];
    essentialList.querySelectorAll('.chip').forEach(chip => {
      const itemText = chip.textContent.trim().replace('×', '').trim();
      if (itemText) items.push(itemText);
    });
    return items;
  }

  /**
   * Filter recommendations based on selected preferences
   */
  filterRecommendationsByPreferences(allRecommendations) {
    const selectedEssentials = this.getSelectedEssentialItems();
    
    // If no preferences selected, return all recommendations
    if (selectedEssentials.length === 0) {
      return allRecommendations;
    }

    // Filter: Only return recommendations for selected essential items
    return allRecommendations.filter(rec => {
      // Check if recommendation name contains any of the essential items
      // OR if it's marked as essential in the product data
      return rec.is_essential === true;
    });
  }

  /**
   * Show substitute recommendations modal
   */
  showSubstituteRecommendations(productName) {
    const substitutes = this.recommender.getSubstitutes(productName, 5);
    const selectedEssentials = this.getSelectedEssentialItems();

    console.log(`Fetching substitutes for "${productName}":`, substitutes);

    if (!substitutes || substitutes.length === 0) {
      console.log(`No substitutes found for "${productName}"`);
    }
    
    // Find the original product in either filtered or master products
    let originalProduct = null;
    if (window.state?.filteredProducts) {
      originalProduct = window.state.filteredProducts.find(p => 
        p.name.toLowerCase() === productName.toLowerCase()
      );
    }
    if (!originalProduct && window.state?.products) {
      originalProduct = window.state.products.find(p => 
        p.name.toLowerCase() === productName.toLowerCase()
      );
    }

    // Create modal HTML
    const modalHTML = this.createRecommendationModal(productName, substitutes, selectedEssentials);
    
    // Insert into page
    this.displayModal(modalHTML);
    
    // Store the original product reference in the modal for later use
    if (originalProduct) {
      setTimeout(() => {
        const modal = document.getElementById('recommendationModalOverlay');
        if (modal) {
          modal.dataset.originalProduct = JSON.stringify(originalProduct);
        }
      }, 50);
    }
  }

  /**
   * Create recommendation modal HTML
   */
  createRecommendationModal(productName, substitutes, selectedEssentials) {
    if (substitutes.length === 0) {
      return `
        <div class="modal-overlay" id="recommendationModalOverlay">
          <div class="modal-content recommendation-modal">
            <div class="modal-header">
              <h2>💡 Substitute Recommendations</h2>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
              <div class="no-recommendations">
                <p><strong>${productName}</strong> has no cheaper alternatives available in the same category.</p>
                <p class="micro">This is already the best price for this product!</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
          </div>
        </div>
      `;
    }

    // Build substitutes cards
    const substitutesHTML = substitutes.map((sub, index) => {
      const isBudgetOption = selectedEssentials.length > 0 && sub.is_essential === true;
      const badgeClass = isBudgetOption ? 'budget-pick' : '';
      
      return `
        <div class="recommendation-card ${badgeClass}">
          <div class="card-header">
            <h4>${sub.name}</h4>
            ${isBudgetOption ? '<span class="badge budget-badge">💰 Budget Pick</span>' : ''}
          </div>
          <div class="card-body">
            <div class="price-comparison">
              <div class="price-item original">
                <span class="label">Original</span>
                <span class="price">₹${sub.original_price.toFixed(2)}</span>
              </div>
              <div class="price-item current">
                <span class="label">Sale Price</span>
                <span class="price">₹${sub.discounted_price.toFixed(2)}</span>
              </div>
            </div>
            <div class="savings-info">
              <span class="savings-amount">💰 Save ₹${Math.abs(sub.price_difference).toFixed(2)}</span>
              <span class="discount-pct">${sub.discount_pct.toFixed(1)}% OFF</span>
            </div>
            <div class="similarity-score">
              <span class="label">Similarity</span>
              <div class="score-bar">
                <div class="score-fill" style="width: ${(1 - sub.knn_distance) * 100}%"></div>
              </div>
              <span class="score-text">${((1 - sub.knn_distance) * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div class="card-footer" style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm btn-add-substitute" style="flex: 1;" data-product-name="${productName}" data-substitute-name="${sub.name}">
              ✓ Add to Cart
            </button>
            <button class="btn btn-secondary btn-sm btn-view-substitute" style="flex: 1;" data-substitute-name="${sub.name}">
              👁 View
            </button>
          </div>
        </div>
      `;
    }).join('');

    const selectedEssentialsDisplay = selectedEssentials.length > 0 
      ? `<p class="preferences-info"><strong>Filtered by preferences:</strong> ${selectedEssentials.join(', ')}</p>`
      : '<p class="preferences-info">Showing all available alternatives</p>';

    return `
      <div class="modal-overlay" id="recommendationModalOverlay">
        <div class="modal-content recommendation-modal">
          <div class="modal-header">
            <h2>💡 Cheaper Alternatives for "${productName}"</h2>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">
            ${selectedEssentialsDisplay}
            <div class="recommendations-grid">
              ${substitutesHTML}
            </div>
          </div>
          <div class="modal-footer">
            <div class="savings-summary">
              <span>Best Savings: ₹${substitutes[0].price_difference.toFixed(2)}</span>
              <span class="separator">•</span>
              <span>Avg Savings: ₹${(substitutes.reduce((sum, s) => sum + s.price_difference, 0) / substitutes.length).toFixed(2)}</span>
            </div>
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Display modal on page
   */
  displayModal(modalHTML) {
    // Remove existing modal if any
    const existingModal = document.getElementById('recommendationModalOverlay');
    if (existingModal) existingModal.remove();
    
    // Insert new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Ensure modal element exists and add active class immediately
    const overlay = document.getElementById('recommendationModalOverlay');
    if (overlay) {
      // Force a reflow to ensure the element is rendered
      overlay.offsetHeight;
      overlay.classList.add('active');
      console.log('✓ Substitute recommendations modal displayed');
    } else {
      console.error('✗ Modal overlay element not found after insertion');
    }
  }

  /**
   * Add substitute button to product element
   */
  addSubstituteButton(productElement, productName) {
    if (!productElement) return;
    
    // Check if button already exists
    if (productElement.querySelector('.btn-show-substitutes')) return;
    
    const hasSubstitutes = this.recommender.hasSubstitutes(productName);
    if (!hasSubstitutes) return;

    const savings = this.recommender.getSavingsAmount(productName);
    const button = document.createElement('button');
    button.className = 'btn btn-secondary btn-sm btn-show-substitutes';
    button.setAttribute('data-product-name', productName);
    button.innerHTML = `<i class="fas fa-exchange-alt"></i> Substitutes ${savings > 0 ? `(Save ₹${savings.toFixed(2)})` : ''}`;
    
    // Find where to add button (product footer or actions area)
    const actionArea = productElement.querySelector('.product-actions') || 
                      productElement.querySelector('.product-footer') ||
                      productElement;
    
    if (actionArea) {
      actionArea.appendChild(button);
    }
  }

  /**
   * Show savings badge on product
   */
  addSavingsBadge(productElement, productName) {
    if (!productElement) return;
    
    // Check if badge already exists
    if (productElement.querySelector('.savings-badge')) return;
    
    const savings = this.recommender.getSavingsAmount(productName);
    if (savings <= 0) return;

    const badge = document.createElement('div');
    badge.className = 'savings-badge';
    badge.innerHTML = `💰 Save ₹${savings.toFixed(2)}`;
    
    // Add to product header or first element
    const header = productElement.querySelector('.product-header') || 
                  productElement.querySelector('.product-name') ||
                  productElement.firstChild;
    
    if (header) {
      header.parentElement.insertBefore(badge, header.nextSibling);
    }
  }

  /**
   * Get recommendations for all selected essential items
   */
  getRecommendationsForSelectedItems() {
    const selectedEssentials = this.getSelectedEssentialItems();
    if (selectedEssentials.length === 0) return {};

    const recommendations = {};
    selectedEssentials.forEach(itemName => {
      const subs = this.recommender.getSubstitutes(itemName, 3);
      if (subs.length > 0) {
        recommendations[itemName] = subs;
      }
    });
    
    return recommendations;
  }

  /**
   * Show recommendations summary for all selected preferences
   */
  showPreferencesSummary() {
    const recommendations = this.getRecommendationsForSelectedItems();
    const selectedEssentials = this.getSelectedEssentialItems();

    if (Object.keys(recommendations).length === 0) {
      alert('No cheaper alternatives found for your selected essential items.');
      return;
    }

    // Calculate total savings
    let totalSavings = 0;
    Object.values(recommendations).forEach(subs => {
      if (subs.length > 0) {
        totalSavings += subs[0].price_difference;
      }
    });

    // Create summary HTML
    const summaryHTML = this.createPreferencesSummaryModal(recommendations, totalSavings);
    this.displayModal(summaryHTML);
  }

  /**
   * Create preferences summary modal
   */
  createPreferencesSummaryModal(recommendations, totalSavings) {
    const itemsHTML = Object.entries(recommendations).map(([itemName, subs]) => {
      if (subs.length === 0) return '';
      
      const bestSub = subs[0];
      return `
        <div class="preference-recommendation-item">
          <div class="item-header">
            <h5>${itemName}</h5>
            <span class="savings-badge">Save ₹${bestSub.price_difference.toFixed(2)}</span>
          </div>
          <div class="item-body">
            <p><strong>${bestSub.name}</strong></p>
            <p class="micro">₹${bestSub.discounted_price.toFixed(2)} (${bestSub.discount_pct.toFixed(1)}% OFF)</p>
          </div>
          <button class="btn btn-link btn-sm" onclick="preferenceRecommender.showSubstituteRecommendations('${itemName}')">
            View all alternatives →
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="modal-overlay" id="recommendationModalOverlay">
        <div class="modal-content recommendation-modal">
          <div class="modal-header">
            <h2>💡 Substitutes for Your Preferences</h2>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="total-savings-banner">
              <span class="big-number">₹${totalSavings.toFixed(2)}</span>
              <span class="label">Total Potential Savings</span>
            </div>
            <div class="preference-recommendations">
              ${itemsHTML}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Swap original product with substitute - remove original, add substitute
   */
  swapProductWithSubstitute(originalProductName, substituteProductName, modal) {
    console.log('=== SWAP PRODUCT DEBUG ===');
    console.log('Looking for original product:', originalProductName);
    console.log('Substitute product:', substituteProductName);
    
    // Normalize the product name for comparison
    const normalizeProductName = (name) => name.toLowerCase().trim();
    const normalizedOriginal = normalizeProductName(originalProductName);
    
    // Try to get original product from modal data first
    let originalProduct = null;
    let filteredIndex = -1;
    
    if (modal && modal.dataset.originalProduct) {
      try {
        originalProduct = JSON.parse(modal.dataset.originalProduct);
        console.log('Using original product from modal:', originalProduct);
      } catch (e) {
        console.error('Failed to parse original product from modal:', e);
      }
    }
    
    // If not in modal, try to find in filtered products
    if (!originalProduct && window.state?.filteredProducts) {
      filteredIndex = window.state.filteredProducts.findIndex(p => 
        normalizeProductName(p.name) === normalizedOriginal
      );
      
      if (filteredIndex !== -1) {
        originalProduct = window.state.filteredProducts[filteredIndex];
        console.log('Found original product in filtered products at index:', filteredIndex);
      }
    }
    
    // If still not found, try master products
    if (!originalProduct && window.state?.products) {
      filteredIndex = window.state.products.findIndex(p => 
        normalizeProductName(p.name) === normalizedOriginal
      );
      
      if (filteredIndex !== -1) {
        originalProduct = window.state.products[filteredIndex];
        console.log('Found original product in master products at index:', filteredIndex);
      }
    }
    
    if (!originalProduct) {
      console.error('Product not found! Searched for:', originalProductName);
      console.log('Available filtered products:', window.state?.filteredProducts?.map(p => p.name));
      console.log('Available master products:', window.state?.products?.map(p => p.name));
      if (window.showToast) {
        window.showToast('Product not found. Please refresh the page and try again.', 'error');
      }
      return;
    }

    // Get the substitute product details from recommendations
    const substitutes = this.recommender.getSubstitutes(originalProductName, 10);
    console.log('Available substitutes:', substitutes);
    
    const substituteData = substitutes.find(s => normalizeProductName(s.name) === normalizeProductName(substituteProductName));
    
    if (!substituteData) {
      console.error('Substitute not found:', substituteProductName);
      if (window.showToast) {
        window.showToast('Substitute product data not found', 'error');
      }
      return;
    }
    
    // Create new product object with substitute data
    const newProduct = {
      id: substituteData.name.toLowerCase().replace(/\s+/g, '-'),
      name: substituteData.name,
      category: substituteData.category,
      quantity: originalProduct.quantity || '',
      original_price: substituteData.original_price,
      discounted_price: substituteData.discounted_price,
      discount: `${substituteData.discount_pct.toFixed(0)}%`,
      is_essential: substituteData.is_essential || false,
      selectedQuantity: 1
    };

    // Find the correct index in filtered products and update
    if (window.state?.filteredProducts) {
      const correctIndex = window.state.filteredProducts.findIndex(p => 
        normalizeProductName(p.name) === normalizedOriginal
      );
      if (correctIndex !== -1) {
        const originalQty = window.getProductQuantity ? window.getProductQuantity(correctIndex) : 1;
        window.state.filteredProducts[correctIndex] = newProduct;
        if (window.setProductQuantity) {
          window.setProductQuantity(correctIndex, originalQty);
        }
        console.log('Updated filtered product at index:', correctIndex);
      }
    }

    // Also update in the master products list (grocery list)
    if (window.state?.products) {
      const masterIndex = window.state.products.findIndex(p => 
        normalizeProductName(p.name) === normalizedOriginal
      );
      if (masterIndex !== -1) {
        window.state.products[masterIndex] = newProduct;
        console.log('Updated master product at index:', masterIndex);
      }
    }

    // Close modal
    if (modal) {
      modal.remove();
    }

    // Re-render products - need to pass grid ID
    if (window.renderProducts) {
      const gridId = document.getElementById('recommendationsGrid') ? 'recommendationsGrid' : 'searchResultsGrid';
      window.renderProducts(window.state?.filteredProducts || [], gridId);
    }

    // Update budget summary and recommendation summary
    if (window.updateBudgetSummary) {
      window.updateBudgetSummary();
    }
    
    if (window.updateRecommendationSummary) {
      window.updateRecommendationSummary();
    }

    // Show success message
    if (window.showToast) {
      window.showToast(`✓ Swapped ${originalProductName} with ${substituteProductName}. Saving ₹${Math.abs(substituteData.price_difference).toFixed(2)}!`, 'success');
    }
    
    console.log('=== SWAP COMPLETE ===');
  }

  /**
   * View product details in the product modal
   */
  viewProductDetails(productName, modal) {
    // Find the product in products list
    const products = window.state?.filteredProducts || window.state?.products || [];
    const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    
    if (product && window.openProductModal) {
      // Close recommendation modal first
      if (modal) {
        modal.remove();
      }
      
      // Open the product modal
      window.openProductModal(product);
    } else if (!product) {
      // If product not in main list, check recommendations
      alert(`Product "${productName}" details will be shown`);
    }
  }
}

// Global instance
let preferenceRecommender;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  preferenceRecommender = new PreferenceBasedRecommender();
  console.log('✓ Preference-based recommender ready');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PreferenceBasedRecommender };
}
