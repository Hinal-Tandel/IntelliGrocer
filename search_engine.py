"""
Search Query Engine for IntelliGrocer
Performs efficient product searches using Firestore queries
"""

import firebase_admin
from firebase_admin import credentials, firestore
from typing import List, Dict, Optional
import re
import json


class ProductSearchEngine:
    """
    Product search engine with multiple search strategies
    """
    
    def __init__(self):
        """Initialize Firebase connection"""
        try:
            firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate("serviceAccountKey.json")
            firebase_admin.initialize_app(cred)
        
        self.db = firestore.client()
    
    def search(
        self, 
        query: str, 
        category: Optional[str] = None,
        min_discount: Optional[float] = None,
        max_price: Optional[float] = None,
        essentials_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """
        Search products with various filters
        
        Args:
            query: Search query string
            category: Filter by category
            min_discount: Minimum discount percentage
            max_price: Maximum price
            essentials_only: Show only essential items
            limit: Maximum number of results
        
        Returns:
            List of matching products sorted by relevance
        """
        if not query or not query.strip():
            return self.get_all_products(
                category=category,
                min_discount=min_discount,
                max_price=max_price,
                essentials_only=essentials_only,
                limit=limit
            )
        
        query_lower = query.lower().strip()
        
        # Strategy 1: Search using tokens (most efficient)
        results = self._search_by_tokens(query_lower, limit * 2)
        
        # Strategy 2: If no results, try partial name match
        if not results:
            results = self._search_by_name_partial(query_lower, limit * 2)
        
        # Apply additional filters
        results = self._apply_filters(
            results,
            category=category,
            min_discount=min_discount,
            max_price=max_price,
            essentials_only=essentials_only
        )
        
        # Rank by relevance
        results = self._rank_results(results, query_lower)
        
        return results[:limit]
    
    def _search_by_tokens(self, query: str, limit: int) -> List[Dict]:
        """Search using indexed search tokens"""
        products_ref = self.db.collection("products")
        
        # Search for products with matching tokens
        docs = products_ref.where("search_tokens", "array_contains", query).limit(limit).stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(data)
        
        return results
    
    def _search_by_name_partial(self, query: str, limit: int) -> List[Dict]:
        """Search by partial name match (fallback)"""
        products_ref = self.db.collection("products")
        
        # Get all products and filter client-side
        # This is less efficient but catches edge cases
        docs = products_ref.stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            name_lower = data.get('name_lower', '')
            category_lower = data.get('category_lower', '')
            
            if query in name_lower or query in category_lower:
                data['id'] = doc.id
                results.append(data)
                
                if len(results) >= limit:
                    break
        
        return results
    
    def _apply_filters(
        self,
        products: List[Dict],
        category: Optional[str] = None,
        min_discount: Optional[float] = None,
        max_price: Optional[float] = None,
        essentials_only: bool = False
    ) -> List[Dict]:
        """Apply additional filters to search results"""
        filtered = products
        
        if category:
            filtered = [p for p in filtered if p.get('category_lower', '') == category.lower()]
        
        if essentials_only:
            filtered = [p for p in filtered if p.get('is_essential', False)]
        
        if min_discount is not None:
            filtered = [p for p in filtered if self._get_discount_percent(p) >= min_discount]
        
        if max_price is not None:
            filtered = [p for p in filtered if p.get('discounted_price', float('inf')) <= max_price]
        
        return filtered
    
    def _get_discount_percent(self, product: Dict) -> float:
        """Extract discount percentage from product"""
        discount_str = str(product.get('discount', '0%'))
        match = re.search(r'(\d+(?:\.\d+)?)', discount_str)
        return float(match.group(1)) if match else 0.0
    
    def _rank_results(self, products: List[Dict], query: str) -> List[Dict]:
        """
        Rank search results by relevance
        """
        def relevance_score(product: Dict) -> float:
            score = product.get('search_score', 0.0)
            
            name_lower = product.get('name_lower', '')
            
            # Exact match bonus
            if query == name_lower:
                score += 100
            
            # Starts with query bonus
            elif name_lower.startswith(query):
                score += 50
            
            # Contains query bonus
            elif query in name_lower:
                score += 25
            
            # Category match bonus
            if query in product.get('category_lower', ''):
                score += 15
            
            return score
        
        # Sort by relevance score (descending)
        return sorted(products, key=relevance_score, reverse=True)
    
    def get_all_products(
        self,
        category: Optional[str] = None,
        min_discount: Optional[float] = None,
        max_price: Optional[float] = None,
        essentials_only: bool = False,
        limit: int = 100
    ) -> List[Dict]:
        """
        Get all products with optional filters (when no search query)
        """
        products_ref = self.db.collection("products")
        query = products_ref
        
        # Apply Firestore filters where possible
        if category:
            query = query.where("category_lower", "==", category.lower())
        
        if essentials_only:
            query = query.where("is_essential", "==", True)
        
        # Order by search score for better results
        query = query.order_by("search_score", direction=firestore.Query.DESCENDING)
        
        # Limit results
        query = query.limit(limit)
        
        # Execute query
        docs = query.stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(data)
        
        # Apply remaining filters client-side
        results = self._apply_filters(
            results,
            min_discount=min_discount,
            max_price=max_price
        )
        
        return results
    
    def search_by_category(self, category: str, limit: int = 50) -> List[Dict]:
        """Search all products in a specific category"""
        return self.get_all_products(category=category, limit=limit)
    
    def get_deals(self, min_discount: float = 30.0, limit: int = 20) -> List[Dict]:
        """Get products with high discounts"""
        all_products = self.get_all_products(limit=100)
        
        deals = [
            p for p in all_products 
            if self._get_discount_percent(p) >= min_discount
        ]
        
        # Sort by discount percentage
        deals.sort(key=lambda p: self._get_discount_percent(p), reverse=True)
        
        return deals[:limit]
    
    def get_essentials(self, limit: int = 50) -> List[Dict]:
        """Get all essential products"""
        return self.get_all_products(essentials_only=True, limit=limit)
    
    def get_categories(self) -> List[str]:
        """Get list of all available categories"""
        config_ref = self.db.collection("config").document("search")
        config_doc = config_ref.get()
        
        if config_doc.exists:
            data = config_doc.to_dict()
            return data.get('categories', [])
        
        # Fallback: query all products
        products_ref = self.db.collection("products")
        docs = products_ref.stream()
        
        categories = set()
        for doc in docs:
            data = doc.to_dict()
            if 'category' in data:
                categories.add(data['category'])
        
        return sorted(list(categories))


def main():
    """
    Example usage and testing
    """
    search_engine = ProductSearchEngine()
    
    print("\n🔍 IntelliGrocer Search Engine\n")
    
    # Example 1: Basic search
    print("Example 1: Search for 'rice'")
    results = search_engine.search("rice", limit=5)
    print(f"Found {len(results)} results:")
    for product in results:
        print(f"  - {product['name']} ({product['category']}) - ₹{product['discounted_price']}")
    
    # Example 2: Category search
    print("\nExample 2: Search in 'Pulses' category")
    results = search_engine.search_by_category("Pulses", limit=5)
    print(f"Found {len(results)} results:")
    for product in results:
        print(f"  - {product['name']} - ₹{product['discounted_price']}")
    
    # Example 3: Get deals
    print("\nExample 3: High discount deals (>20%)")
    deals = search_engine.get_deals(min_discount=20.0, limit=5)
    print(f"Found {len(deals)} deals:")
    for product in deals:
        print(f"  - {product['name']} - {product['discount']} off")
    
    # Example 4: Get essentials
    print("\nExample 4: Essential items")
    essentials = search_engine.get_essentials(limit=5)
    print(f"Found {len(essentials)} essentials:")
    for product in essentials:
        print(f"  - {product['name']} ({product['category']})")
    
    # Example 5: Get categories
    print("\nExample 5: Available categories")
    categories = search_engine.get_categories()
    print(f"Categories: {', '.join(categories)}")


if __name__ == "__main__":
    main()
