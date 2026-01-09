"""
Search Indexer for IntelliGrocer
Creates searchable metadata and indexes for efficient product search
"""

import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
import re
from typing import List, Dict
import json


def create_search_tokens(text: str) -> List[str]:
    """
    Create search tokens from text for efficient searching
    Generates partial matches and n-grams
    """
    if not text:
        return []
    
    text = text.lower().strip()
    tokens = set()
    
    # Add full text
    tokens.add(text)
    
    # Split by spaces and add individual words
    words = re.split(r'\s+', text)
    for word in words:
        if len(word) > 0:
            tokens.add(word)
            # Add partial matches (prefix tokens)
            for i in range(1, len(word) + 1):
                tokens.add(word[:i])
    
    return list(tokens)


def create_category_tags(category: str) -> List[str]:
    """
    Create category tags for filtering
    """
    category_mappings = {
        'grains': ['rice', 'wheat', 'cereal', 'staple'],
        'pulses': ['dal', 'lentils', 'protein', 'staple'],
        'cooking': ['oil', 'ghee', 'cooking'],
        'spices': ['masala', 'seasoning', 'flavor'],
        'vegetables': ['veggie', 'fresh', 'produce'],
        'fruits': ['fresh', 'produce', 'healthy'],
        'dairy': ['milk', 'cheese', 'yogurt', 'dairy'],
        'snacks': ['namkeen', 'chips', 'munchies'],
        'beverages': ['drinks', 'tea', 'coffee'],
        'essentials': ['staple', 'basic', 'everyday']
    }
    
    category_lower = category.lower()
    tags = [category_lower]
    
    for key, values in category_mappings.items():
        if key in category_lower:
            tags.extend(values)
    
    return list(set(tags))


def calculate_search_score(product: Dict) -> float:
    """
    Calculate search relevance score for ranking
    Higher score = more relevant/popular
    """
    score = 0.0
    
    # Discount score (higher discount = higher score)
    discount_str = str(product.get('discount', '0%'))
    discount_num = float(re.sub(r'[^\d.]', '', discount_str))
    score += discount_num * 0.5
    
    # Essential items get priority
    if product.get('is_essential', False):
        score += 20
    
    # Price-based scoring (cheaper items get slight boost)
    discounted_price = float(product.get('discounted_price', 999999))
    if discounted_price < 100:
        score += 10
    elif discounted_price < 300:
        score += 5
    
    return score


def index_products_for_search():
    """
    Main function to index all products with search metadata
    Adds search tokens, tags, and scores to Firestore
    """
    print("🔍 Starting search indexing...")
    
    # Initialize Firebase if not already done
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # Read CSV
    df = pd.read_csv("products.csv")
    
    indexed_count = 0
    
    for index, row in df.iterrows():
        product_name = row["name"]
        category = row["category"]
        
        # Create search tokens from name and category
        name_tokens = create_search_tokens(product_name)
        category_tokens = create_search_tokens(category)
        category_tags = create_category_tags(category)
        
        # Combine all search tokens
        all_tokens = list(set(name_tokens + category_tokens + category_tags))
        
        # Calculate search score
        product_dict = row.to_dict()
        search_score = calculate_search_score(product_dict)
        
        # Prepare product data with search metadata
        product_data = {
            "name": product_name,
            "name_lower": product_name.lower(),
            "category": category,
            "category_lower": category.lower(),
            "quantity": row["quantity"],
            "original_price": float(row["original_price"]),
            "discounted_price": float(row["discounted_price"]),
            "discount": row["discount"],
            "is_essential": bool(row["is_essential"]),
            # Search metadata
            "search_tokens": all_tokens,
            "category_tags": category_tags,
            "search_score": search_score,
            "indexed_at": firestore.SERVER_TIMESTAMP
        }
        
        # Add to Firestore
        db.collection("products").add(product_data)
        indexed_count += 1
        
        if indexed_count % 10 == 0:
            print(f"   Indexed {indexed_count}/{len(df)} products...")
    
    print(f"✅ Successfully indexed {indexed_count} products with search metadata!")
    
    # Create search configuration document
    search_config = {
        "total_products": indexed_count,
        "last_indexed": firestore.SERVER_TIMESTAMP,
        "search_enabled": True,
        "categories": df["category"].unique().tolist()
    }
    
    db.collection("config").document("search").set(search_config)
    print("✅ Search configuration saved!")


def rebuild_search_index():
    """
    Delete all existing products and rebuild the search index
    Use this when you want to refresh the entire index
    """
    print("🔄 Rebuilding search index...")
    
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # Delete all existing products
    print("   Deleting existing products...")
    products_ref = db.collection("products")
    docs = products_ref.stream()
    
    deleted_count = 0
    for doc in docs:
        doc.reference.delete()
        deleted_count += 1
    
    print(f"   Deleted {deleted_count} existing products")
    
    # Rebuild index
    index_products_for_search()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--rebuild":
        rebuild_search_index()
    else:
        index_products_for_search()
