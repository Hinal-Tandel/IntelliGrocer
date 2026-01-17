"""
KNN-Based Substitute Product Recommendation Engine
Recommends cheaper alternatives using K-Nearest Neighbors algorithm
"""

import pandas as pd
import numpy as np 
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import NearestNeighbors
from typing import List, Dict, Optional, Tuple
import json


class SubstituteRecommender:
    """
    K-Nearest Neighbors recommender for product substitutes.
    Finds cheaper alternatives in the same category based on product features.
    """
    
    def __init__(self, df: pd.DataFrame, k: int = 5):
        """
        Initialize the recommender with product data.
        
        Args:
            df: DataFrame with columns [product_id, name, category, 
                discounted_price, original_price, is_essential, quantity]
            k: Number of neighbors to consider (default: 5)
        """
        self.df = df.copy()
        self.k = k
        self.scaler = StandardScaler()
        self.model = None
        self.feature_matrix = None
        self._prepare_features()
        self._build_model()
    
    def _prepare_features(self) -> None:
        """
        Prepare feature matrix for KNN.
        Features: [discounted_price, original_price, discount_pct, is_essential_flag]
        """
        self.df['discount_pct'] = (
            (self.df['original_price'] - self.df['discounted_price']) 
            / self.df['original_price'] * 100
        ).fillna(0)
        
        self.df['is_essential_flag'] = self.df['is_essential'].astype(int)
        
        # Create feature matrix
        feature_cols = ['discounted_price', 'discount_pct', 'is_essential_flag']
        self.feature_matrix = self.df[feature_cols].fillna(0).values
        
        # Normalize features
        self.feature_matrix_normalized = self.scaler.fit_transform(self.feature_matrix)
    
    def _build_model(self) -> None:
        """Build KNN model on normalized features."""
        self.model = NearestNeighbors(
            n_neighbors=min(self.k + 1, len(self.df)),  # +1 to exclude self
            metric='euclidean',
            algorithm='auto'
        )
        self.model.fit(self.feature_matrix_normalized)
    
    def get_substitutes(
        self, 
        product_name: str, 
        k_neighbors: Optional[int] = None,
        cheaper_only: bool = True,
        same_category: bool = True
    ) -> List[Dict]:
        """
        Get substitute recommendations for a product.
        
        Args:
            product_name: Name of the product to find substitutes for
            k_neighbors: Override number of neighbors (default: self.k)
            cheaper_only: Only return products cheaper than original (default: True)
            same_category: Only consider products in same category (default: True)
        
        Returns:
            List of substitute products with similarity scores, sorted by relevance
        """
        if k_neighbors is None:
            k_neighbors = self.k
        
        # Find the product
        product_mask = self.df['name'].str.lower() == product_name.lower()
        if not product_mask.any():
            return []
        
        product_idx = product_mask.idxmax()
        product_row = self.df.loc[product_idx]
        
        # Get neighbors (excluding self)
        distances, indices = self.model.kneighbors(
            [self.feature_matrix_normalized[product_idx]],
            n_neighbors=k_neighbors + 1
        )
        
        # Remove self from results
        indices = indices[0]
        distances = distances[0]
        mask = indices != product_idx
        indices = indices[mask]
        distances = distances[mask]
        
        # Filter candidates
        candidates = self.df.iloc[indices].copy()
        candidates['knn_distance'] = distances
        candidates['price_difference'] = (
            candidates['discounted_price'] - product_row['discounted_price']
        )
        
        # Apply filters
        if same_category:
            candidates = candidates[candidates['category'] == product_row['category']]
        
        if cheaper_only:
            candidates = candidates[
                candidates['discounted_price'] < product_row['discounted_price']
            ]
        
        if candidates.empty:
            return []
        
        # Sort by price difference (ascending) and KNN distance
        candidates = candidates.sort_values(
            by=['price_difference', 'knn_distance'],
            ascending=[True, True]
        )
        
        # Format results
        results = []
        for _, row in candidates.head(k_neighbors).iterrows():
            results.append({
                'name': row['name'],
                'category': row['category'],
                'discounted_price': float(row['discounted_price']),
                'original_price': float(row['original_price']),
                'discount_pct': float(row['discount_pct']),
                'savings': float(row['original_price'] - row['discounted_price']),
                'is_essential': bool(row['is_essential_flag']),
                'quantity': row.get('quantity', 'N/A'),
                'price_difference': float(row['price_difference']),
                'knn_distance': float(row['knn_distance']),
                'reason': self._generate_reason(
                    product_row, 
                    row, 
                    float(row['price_difference'])
                )
            })
        
        return results
    
    def get_bulk_substitutes(
        self, 
        product_names: List[str],
        k_neighbors: Optional[int] = None
    ) -> Dict[str, List[Dict]]:
        """
        Get substitutes for multiple products.
        
        Args:
            product_names: List of product names
            k_neighbors: Number of neighbors for each product
        
        Returns:
            Dictionary mapping product names to their substitutes
        """
        results = {}
        for product_name in product_names:
            results[product_name] = self.get_substitutes(
                product_name, 
                k_neighbors=k_neighbors
            )
        return results
    
    def get_category_substitutes(
        self, 
        category: str,
        k_neighbors: Optional[int] = None
    ) -> Dict[str, List[Dict]]:
        """
        Get substitutes for all products in a category.
        
        Args:
            category: Category name
            k_neighbors: Number of neighbors for each product
        
        Returns:
            Dictionary mapping product names to their substitutes
        """
        category_products = self.df[
            self.df['category'].str.lower() == category.lower()
        ]['name'].tolist()
        
        return self.get_bulk_substitutes(category_products, k_neighbors)
    
    @staticmethod
    def _generate_reason(original: pd.Series, substitute: pd.Series, price_diff: float) -> str:
        """Generate human-readable reason for recommendation."""
        savings = original['original_price'] - substitute['discounted_price']
        pct_savings = (savings / original['original_price'] * 100) if original['original_price'] > 0 else 0
        
        reason = f"Save ₹{savings:.2f} ({pct_savings:.1f}%) compared to {original['name']}"
        return reason
    
    def export_recommendations_json(self, output_path: str) -> None:
        """
        Export all recommendations to JSON file.
        
        Args:
            output_path: Path to save JSON file
        """
        all_products = self.df['name'].unique().tolist()
        recommendations = self.get_bulk_substitutes(all_products)
        
        # Reformat for cleaner JSON
        export_data = {}
        for product_name, substitutes in recommendations.items():
            if substitutes:
                export_data[product_name] = {
                    'category': self.df[self.df['name'] == product_name]['category'].iloc[0],
                    'current_price': float(
                        self.df[self.df['name'] == product_name]['discounted_price'].iloc[0]
                    ),
                    'original_price': float(
                        self.df[self.df['name'] == product_name]['original_price'].iloc[0]
                    ),
                    'substitutes': substitutes,
                    'count': len(substitutes)
                }
        
        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        print(f"✓ Exported {len(export_data)} products with recommendations to {output_path}")
    
    def get_statistics(self) -> Dict:
        """Get statistics about the recommendation engine."""
        return {
            'total_products': len(self.df),
            'total_categories': self.df['category'].nunique(),
            'avg_products_per_category': len(self.df) / self.df['category'].nunique(),
            'k_neighbors': self.k,
            'price_range': {
                'min': float(self.df['discounted_price'].min()),
                'max': float(self.df['discounted_price'].max()),
                'mean': float(self.df['discounted_price'].mean())
            },
            'discount_statistics': {
                'min_discount_pct': float(self.df['discount_pct'].min()),
                'max_discount_pct': float(self.df['discount_pct'].max()),
                'avg_discount_pct': float(self.df['discount_pct'].mean())
            }
        }


if __name__ == "__main__":
    # Example usage
    df = pd.read_csv("products.csv")
    
    # Initialize recommender
    recommender = SubstituteRecommender(df, k=5)
    
    # Get statistics
    print("Recommender Statistics:")
    print(json.dumps(recommender.get_statistics(), indent=2))
    
    # Test single product recommendation
    test_product = "Basmati Rice"
    print(f"\n\nSubstitutes for '{test_product}':")
    substitutes = recommender.get_substitutes(test_product)
    for sub in substitutes:
        print(f"  - {sub['name']}: ₹{sub['discounted_price']:.2f} | {sub['reason']}")
    
    # Export recommendations
    recommender.export_recommendations_json("substitutes_recommendations.json")
