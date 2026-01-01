from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
import re
import base64
from io import BytesIO
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
df = None
df_standardized = None
scaler = None

def load_and_prepare_data():
    """Load and prepare the grocery data"""
    global df, df_standardized, scaler
    
    try:
        # Load data
        df = pd.read_csv('Grocery_data.csv')
        
        # Data cleaning
        df['Discount'].fillna('0% OFF', inplace=True)
        df['Original Price (Rs.)'].fillna(df['Original Price (Rs.)'].mean(), inplace=True)
        df['Discounted Price (Rs.)'].fillna(df['Discounted Price (Rs.)'].median(), inplace=True)
        df['Quantity'].fillna(method='ffill', inplace=True)
        df['Quantity'].fillna(method='bfill', inplace=True)
        
        # Create a copy for standardization
        df_standardized = df.copy()
        
        # Extract numeric values from Quantity column
        df_standardized['Quantity_Numeric'] = df_standardized['Quantity'].apply(
            lambda x: float(re.findall(r'\d+\.?\d*', str(x))[0]) if re.findall(r'\d+\.?\d*', str(x)) else 0
        )
        
        # Select numerical columns to standardize
        numerical_cols = ['Original Price (Rs.)', 'Discounted Price (Rs.)', 'Quantity_Numeric']
        
        # Initialize and fit the StandardScaler
        scaler = StandardScaler()
        df_standardized[numerical_cols] = scaler.fit_transform(df_standardized[numerical_cols])
        
        print(f"Loaded {len(df)} products successfully")
        return True
    except Exception as e:
        print(f"Error loading data: {e}")
        return False

def extract_discount_percent(discount_str):
    """Extract numeric discount percentage from string"""
    if pd.isna(discount_str):
        return 0
    match = re.search(r'(\d+)%', str(discount_str))
    return int(match.group(1)) if match else 0

def calculate_value_score(row):
    """Calculate a value score for each product based on discount and price"""
    discount_percent = extract_discount_percent(row['Discount'])
    # Higher discount and lower final price = higher value
    value_score = discount_percent * 0.7 + (1 / (row['Discounted Price (Rs.)'] + 1)) * 30
    return value_score

def calculate_personalized_score(row, preferences):
    """Calculate personalized recommendation score based on user preferences"""
    score = 0
    
    # Base value score
    discount_percent = extract_discount_percent(row['Discount'])
    base_score = discount_percent * 0.5 + (1 / (row['Discounted Price (Rs.)'] + 1)) * 20
    
    # Budget consideration
    if preferences:
        monthly_budget = preferences.get('monthlyBudget', 10000)
        household_size = preferences.get('householdSize', 4)
        past_spend = preferences.get('pastSpend', monthly_budget)
        essential_priority = preferences.get('essentialPriority', 'no')
        purchase_freq = preferences.get('purchaseFrequency', 'weekly')
        
        # Per person budget
        per_person_budget = monthly_budget / household_size
        
        # Adjust score based on price affordability
        if row['Discounted Price (Rs.)'] <= per_person_budget * 0.5:
            score += 20  # Very affordable
        elif row['Discounted Price (Rs.)'] <= per_person_budget:
            score += 10  # Affordable
        
        # Essential items boost
        essential_categories = ['Deals of the Week', 'Dairy', 'Bread', 'Vegetables', 
                               'Fruits', 'Rice', 'Pulses', 'Oil', 'Masala']
        if essential_priority == 'yes':
            for cat in essential_categories:
                if cat.lower() in row['Category'].lower():
                    score += 15
                    break
        
        # Purchase frequency adjustment
        freq_multiplier = {
            'daily': 1.2,
            'weekly': 1.0,
            'biweekly': 0.9,
            'monthly': 0.8
        }
        score *= freq_multiplier.get(purchase_freq, 1.0)
        
        # Budget vs past spend analysis
        if monthly_budget < past_spend:
            # User wants to save, prioritize high discounts
            score += discount_percent * 0.5
        else:
            # User has more budget, focus on variety
            score += 5
    
    return base_score + score

def get_essential_categories():
    """Return list of essential grocery categories"""
    return [
        'Deals of the Week', 'Dairy', 'Bread', 'Eggs', 'Vegetables', 
        'Fruits', 'Rice', 'Pulses', 'Oil', 'Masala', 'Spices',
        'Milk', 'Atta', 'Flour', 'Salt', 'Sugar', 'Tea', 'Coffee'
    ]

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS)"""
    return send_from_directory('.', path)

@app.route('/api/products', methods=['GET'])
def get_products():
    """Get all products"""
    try:
        products = []
        for idx, row in df.iterrows():
            products.append({
                'id': idx,
                'name': row['Product Name'],
                'category': row['Category'],
                'quantity': row['Quantity'],
                'original_price': float(row['Original Price (Rs.)']),
                'discount': row['Discount'],
                'discounted_price': float(row['Discounted Price (Rs.)'])
            })
        
        return jsonify({'products': products, 'total': len(products)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recommendations', methods=['GET', 'POST'])
def get_recommendations():
    """Get AI-powered product recommendations based on value scores and user preferences"""
    try:
        preferences = None
        
        # Get preferences from POST body if available
        if request.method == 'POST':
            data = request.get_json() or {}
            preferences = data.get('preferences')
        
        # Calculate scores for each product
        df_temp = df.copy()
        
        if preferences:
            # Use personalized scoring
            df_temp['recommendation_score'] = df_temp.apply(
                lambda row: calculate_personalized_score(row, preferences), axis=1
            )
            num_recommendations = min(30, len(df_temp))  # More recommendations for personalized
        else:
            # Use basic value scoring
            df_temp['recommendation_score'] = df_temp.apply(calculate_value_score, axis=1)
            num_recommendations = 20
        
        # Get top recommendations
        top_products = df_temp.nlargest(num_recommendations, 'recommendation_score')
        
        recommendations = []
        for idx, row in top_products.iterrows():
            recommendations.append({
                'id': idx,
                'name': row['Product Name'],
                'category': row['Category'],
                'quantity': row['Quantity'],
                'original_price': float(row['Original Price (Rs.)']),
                'discount': row['Discount'],
                'discounted_price': float(row['Discounted Price (Rs.)']),
                'recommendation_score': float(row['recommendation_score'])
            })
        
        response_data = {
            'recommendations': recommendations, 
            'total': len(recommendations),
            'personalized': preferences is not None
        }
        
        if preferences:
            response_data['budget_info'] = {
                'monthly_budget': preferences.get('monthlyBudget'),
                'household_size': preferences.get('householdSize'),
                'per_person_budget': preferences.get('monthlyBudget', 0) / max(preferences.get('householdSize', 1), 1)
            }
        
        return jsonify(response_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Generate analytics charts and return as base64 encoded images"""
    try:
        charts = {}
        
        # 1. Category Distribution Chart
        plt.figure(figsize=(10, 6))
        category_counts = df['Category'].value_counts().head(10)
        sns.barplot(x=category_counts.values, y=category_counts.index, palette='viridis')
        plt.title('Top 10 Product Categories', fontsize=16, fontweight='bold')
        plt.xlabel('Number of Products', fontsize=12)
        plt.ylabel('Category', fontsize=12)
        plt.tight_layout()
        
        # Save to base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        charts['category_chart'] = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        # 2. Price vs Discount Analysis
        plt.figure(figsize=(10, 6))
        df_sample = df.sample(min(500, len(df)))  # Sample for performance
        df_sample['discount_percent'] = df_sample['Discount'].apply(extract_discount_percent)
        
        plt.scatter(df_sample['Discounted Price (Rs.)'], 
                   df_sample['discount_percent'], 
                   alpha=0.5, c=df_sample['discount_percent'], 
                   cmap='RdYlGn', s=50)
        plt.colorbar(label='Discount %')
        plt.title('Price vs Discount Analysis', fontsize=16, fontweight='bold')
        plt.xlabel('Discounted Price (Rs.)', fontsize=12)
        plt.ylabel('Discount Percentage', fontsize=12)
        plt.tight_layout()
        
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        charts['price_discount_chart'] = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        # 3. Top Deals Chart
        plt.figure(figsize=(10, 6))
        df_temp = df.copy()
        df_temp['discount_percent'] = df_temp['Discount'].apply(extract_discount_percent)
        df_temp['savings'] = df_temp['Original Price (Rs.)'] - df_temp['Discounted Price (Rs.)']
        
        top_deals = df_temp.nlargest(10, 'discount_percent')
        product_names = [name[:30] + '...' if len(name) > 30 else name for name in top_deals['Product Name']]
        
        sns.barplot(x=top_deals['discount_percent'].values, y=product_names, palette='Reds_r')
        plt.title('Top 10 Discount Deals', fontsize=16, fontweight='bold')
        plt.xlabel('Discount Percentage', fontsize=12)
        plt.ylabel('Product', fontsize=12)
        plt.tight_layout()
        
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        charts['top_deals_chart'] = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return jsonify(charts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/similar-products/<int:product_id>', methods=['GET'])
def get_similar_products(product_id):
    """Get similar products using cosine similarity"""
    try:
        if product_id >= len(df_standardized):
            return jsonify({'error': 'Product not found'}), 404
        
        # Use standardized numerical features for similarity
        features = df_standardized[['Original Price (Rs.)', 'Discounted Price (Rs.)', 'Quantity_Numeric']].values
        
        # Calculate cosine similarity
        target_features = features[product_id].reshape(1, -1)
        similarities = cosine_similarity(target_features, features)[0]
        
        # Get top 5 similar products (excluding the product itself)
        similar_indices = np.argsort(similarities)[-6:-1][::-1]
        
        similar_products = []
        for idx in similar_indices:
            row = df.iloc[idx]
            similar_products.append({
                'id': int(idx),
                'name': row['Product Name'],
                'category': row['Category'],
                'quantity': row['Quantity'],
                'original_price': float(row['Original Price (Rs.)']),
                'discount': row['Discount'],
                'discounted_price': float(row['Discounted Price (Rs.)']),
                'similarity_score': float(similarities[idx])
            })
        
        return jsonify({'similar_products': similar_products})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get overall statistics"""
    try:
        df_temp = df.copy()
        df_temp['discount_percent'] = df_temp['Discount'].apply(extract_discount_percent)
        
        stats = {
            'total_products': len(df),
            'total_categories': df['Category'].nunique(),
            'avg_original_price': float(df['Original Price (Rs.)'].mean()),
            'avg_discounted_price': float(df['Discounted Price (Rs.)'].mean()),
            'avg_discount_percent': float(df_temp['discount_percent'].mean()),
            'max_discount': float(df_temp['discount_percent'].max()),
            'total_potential_savings': float((df['Original Price (Rs.)'] - df['Discounted Price (Rs.)']).sum())
        }
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Smart Grocery Recommendation System Server...")
    print("Loading and preparing data...")
    
    if load_and_prepare_data():
        print("\n✓ Data loaded successfully!")
        print(f"✓ Server running on http://localhost:5000")
        print(f"✓ Open http://localhost:5000 in your browser")
        print("\nPress CTRL+C to stop the server\n")
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        print("\n✗ Failed to load data. Please check if Grocery_data.csv exists.")
