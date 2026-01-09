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

/**
 * Generate a detailed recommendation report for user profile
 */
export function generateRecommendationReport(recommendationResult, preferences, userName = 'User') {
    const { products, totalCost, totalSavings, remainingBudget, metrics } = recommendationResult;
    const timestamp = new Date().toISOString();
    const reportDate = new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Generate product breakdown by category
    const categoryBreakdown = {};
    products.forEach(product => {
        const category = product.category || 'Other';
        if (!categoryBreakdown[category]) {
            categoryBreakdown[category] = {
                count: 0,
                totalCost: 0,
                totalSavings: 0
            };
        }
        categoryBreakdown[category].count++;
        categoryBreakdown[category].totalCost += product.preprocessed.discountedPrice;
        categoryBreakdown[category].totalSavings += product.preprocessed.savings;
    });
    
    // Top deals (highest savings)
    const topDeals = [...products]
        .sort((a, b) => b.preprocessed.savings - a.preprocessed.savings)
        .slice(0, 10);
    
    return {
        id: `report_${Date.now()}`,
        timestamp: timestamp,
        reportDate: reportDate,
        userName: userName,
        preferences: {
            monthlyBudget: preferences.monthlyBudget,
            householdSize: preferences.householdSize,
            currentSeason: preferences.currentSeason,
            purchaseFrequency: preferences.purchaseFrequency
        },
        summary: {
            totalProducts: metrics.totalProducts,
            essentialItems: metrics.essentialItems,
            nonEssentialItems: metrics.nonEssentialItems,
            totalCost: totalCost,
            totalSavings: totalSavings,
            remainingBudget: remainingBudget,
            averageDiscount: metrics.averageDiscount,
            averageScore: metrics.averageScore,
            budgetUtilization: ((totalCost / preferences.monthlyBudget) * 100).toFixed(1)
        },
        categoryBreakdown: categoryBreakdown,
        topDeals: topDeals.map(p => ({
            name: p.name,
            category: p.category,
            originalPrice: p.preprocessed.originalPrice,
            discountedPrice: p.preprocessed.discountedPrice,
            savings: p.preprocessed.savings,
            discount: p.discount
        })),
        products: products.map(p => ({
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            originalPrice: p.preprocessed.originalPrice,
            discountedPrice: p.preprocessed.discountedPrice,
            savings: p.preprocessed.savings,
            discount: p.discount,
            isEssential: p.preprocessed.isEssential,
            score: p.preprocessed.score
        }))
    };
}

/**
 * Generate HTML report for display or download
 */
export function generateHTMLReport(report) {
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
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>IntelliGrocer - Recommendation Report</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #f5f5f5;
                }
                .report-container {
                    background: white;
                    padding: 40px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #4CAF50;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #2c3e50;
                    margin: 0;
                }
                .header .subtitle {
                    color: #7f8c8d;
                    font-size: 14px;
                    margin-top: 10px;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin: 30px 0;
                }
                .summary-card {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    border-left: 4px solid #4CAF50;
                }
                .summary-card h3 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    color: #7f8c8d;
                    text-transform: uppercase;
                }
                .summary-card .value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2c3e50;
                }
                .section-title {
                    color: #2c3e50;
                    border-bottom: 2px solid #ecf0f1;
                    padding-bottom: 10px;
                    margin-top: 40px;
                    margin-bottom: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ecf0f1;
                }
                th {
                    background: #34495e;
                    color: white;
                    font-weight: 600;
                }
                tr:hover {
                    background: #f8f9fa;
                }
                .savings-highlight {
                    color: #27ae60;
                    font-weight: bold;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #ecf0f1;
                    text-align: center;
                    color: #7f8c8d;
                    font-size: 12px;
                }
                @media print {
                    body { background: white; }
                    .report-container { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>🛒 IntelliGrocer Recommendation Report</h1>
                    <div class="subtitle">Generated on ${report.reportDate}</div>
                    <div class="subtitle">For: ${report.userName}</div>
                </div>
                
                <h2 class="section-title">📊 Summary</h2>
                <div class="summary-grid">
                    <div class="summary-card">
                        <h3>Total Products</h3>
                        <div class="value">${report.summary.totalProducts}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Essential Items</h3>
                        <div class="value">${report.summary.essentialItems}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Total Cost</h3>
                        <div class="value">₹${report.summary.totalCost.toFixed(2)}</div>
                    </div>
                    <div class="summary-card" style="border-left-color: #27ae60;">
                        <h3>Total Savings</h3>
                        <div class="value savings-highlight">₹${report.summary.totalSavings.toFixed(2)}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Remaining Budget</h3>
                        <div class="value">₹${report.summary.remainingBudget.toFixed(2)}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Budget Used</h3>
                        <div class="value">${report.summary.budgetUtilization}%</div>
                    </div>
                </div>
                
                <h2 class="section-title">🎯 User Preferences</h2>
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
                
                <h2 class="section-title">📦 Category Breakdown</h2>
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
                
                <h2 class="section-title">️ All Recommended Products</h2>
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
                
                <div class="footer">
                    <p>Generated by IntelliGrocer - Smart Grocery Management System</p>
                    <p>Report ID: ${report.id}</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

