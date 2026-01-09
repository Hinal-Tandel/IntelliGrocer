/**
 * Budget-based Grocery Recommendation System
 * 
 * This module implements an intelligent recommendation algorithm that:
 * 1. Takes user's monthly budget
 * 2. Preprocesses product data (calculates total cost and savings)
 * 3. Assigns recommendation scores
 * 4. Sorts products by priority (essential items first, higher score, lower price)
 * 5. Selects products within budget using greedy approach
 * 6. Returns optimized grocery list with metrics
 */

/**
 * Calculate savings for a product
 */
function calculateSavings(product) {
    const original = parseFloat(product.original_price) || 0;
    const discounted = parseFloat(product.discounted_price) || 0;
    return original - discounted;
}

/**
 * Extract discount percentage as a number
 */
function extractDiscountPercent(discount) {
    if (!discount) return 0;
    const match = String(discount).match(/(\d+)/);
    return match ? parseFloat(match[1]) : 0;
}

/**
 * Calculate recommendation score for a product
 * Score is based on:
 * - Discount percentage (higher is better)
 * - Value for money (savings per rupee)
 * - Essential item bonus
 */
function calculateRecommendationScore(product) {
    const discountPercent = extractDiscountPercent(product.discount);
    const original = parseFloat(product.original_price) || 0;
    const savings = calculateSavings(product);
    
    // Base score from discount percentage (0-100 points)
    let score = discountPercent;
    
    // Value for money: savings per rupee spent (0-50 points)
    if (original > 0) {
        const valueScore = (savings / original) * 50;
        score += valueScore;
    }
    
    // Essential item bonus (20 points)
    if (product.is_essential === true || product.is_essential === 'true') {
        score += 20;
    }
    
    return score;
}

/**
 * Preprocess products: calculate costs, savings, and scores
 */
function preprocessProducts(products) {
    return products.map(product => {
        const original = parseFloat(product.original_price) || 0;
        const discounted = parseFloat(product.discounted_price) || 0;
        const savings = calculateSavings(product);
        const score = calculateRecommendationScore(product);
        const isEssential = product.is_essential === true || product.is_essential === 'true';
        
        return {
            ...product,
            preprocessed: {
                originalPrice: original,
                discountedPrice: discounted,
                savings: savings,
                score: score,
                isEssential: isEssential,
                discountPercent: extractDiscountPercent(product.discount)
            }
        };
    });
}

/**
 * Sort products by priority:
 * 1. Essential items first
 * 2. Higher recommendation score
 * 3. Lower discounted price (for tie-breaking)
 */
function sortProductsByPriority(products) {
    return [...products].sort((a, b) => {
        // Essential items first
        if (a.preprocessed.isEssential !== b.preprocessed.isEssential) {
            return a.preprocessed.isEssential ? -1 : 1;
        }
        
        // Higher score wins
        if (Math.abs(a.preprocessed.score - b.preprocessed.score) > 0.01) {
            return b.preprocessed.score - a.preprocessed.score;
        }
        
        // Lower price wins (tie-breaker)
        return a.preprocessed.discountedPrice - b.preprocessed.discountedPrice;
    });
}

/**
 * Select products within budget using greedy approach
 * Prioritizes essential items and high-value products
 */
function selectProductsWithinBudget(sortedProducts, budget) {
    const selected = [];
    let totalCost = 0;
    let totalSavings = 0;
    
    // Greedy approach: add products one by one until budget is exceeded
    for (const product of sortedProducts) {
        const productCost = product.preprocessed.discountedPrice;
        
        if (totalCost + productCost <= budget) {
            selected.push(product);
            totalCost += productCost;
            totalSavings += product.preprocessed.savings;
        }
    }
    
    return {
        products: selected,
        totalCost: totalCost,
        totalSavings: totalSavings,
        remainingBudget: budget - totalCost
    };
}

/**
 * Main recommendation function
 * Takes user preferences and product list, returns optimized recommendations
 */
export function generateBudgetRecommendations(products, preferences) {
    if (!products || products.length === 0) {
        return {
            products: [],
            totalCost: 0,
            totalSavings: 0,
            remainingBudget: preferences.monthlyBudget || 0,
            metrics: {
                totalProducts: 0,
                essentialItems: 0,
                nonEssentialItems: 0,
                averageDiscount: 0,
                averageScore: 0
            }
        };
    }
    
    const budget = parseFloat(preferences.monthlyBudget) || 0;
    
    if (budget <= 0) {
        throw new Error('Please provide a valid monthly budget greater than 0');
    }
    
    // Step 1: Preprocess products
    const preprocessedProducts = preprocessProducts(products);
    
    // Step 2: Sort by priority
    const sortedProducts = sortProductsByPriority(preprocessedProducts);
    
    // Step 3: Select products within budget
    const result = selectProductsWithinBudget(sortedProducts, budget);
    
    // Calculate additional metrics
    const essentialCount = result.products.filter(p => p.preprocessed.isEssential).length;
    const nonEssentialCount = result.products.length - essentialCount;
    const avgDiscount = result.products.length > 0 
        ? result.products.reduce((sum, p) => sum + p.preprocessed.discountPercent, 0) / result.products.length 
        : 0;
    const avgScore = result.products.length > 0
        ? result.products.reduce((sum, p) => sum + p.preprocessed.score, 0) / result.products.length
        : 0;
    
    return {
        products: result.products,
        totalCost: result.totalCost,
        totalSavings: result.totalSavings,
        remainingBudget: result.remainingBudget,
        metrics: {
            totalProducts: result.products.length,
            essentialItems: essentialCount,
            nonEssentialItems: nonEssentialCount,
            averageDiscount: avgDiscount,
            averageScore: avgScore
        }
    };
}

/**
 * Generate a summary text for the recommendations
 */
export function generateRecommendationSummary(recommendationResult) {
    const { totalCost, totalSavings, remainingBudget, metrics } = recommendationResult;
    
    return {
        title: `${metrics.totalProducts} Products Selected`,
        details: [
            `Total Cost: ₹${totalCost.toFixed(2)}`,
            `Total Savings: ₹${totalSavings.toFixed(2)}`,
            `Remaining Budget: ₹${remainingBudget.toFixed(2)}`,
            `Essential Items: ${metrics.essentialItems}`,
            `Non-Essential Items: ${metrics.nonEssentialItems}`,
            `Average Discount: ${metrics.averageDiscount.toFixed(1)}%`,
            `Average Score: ${metrics.averageScore.toFixed(1)}/170`
        ]
    };
}
