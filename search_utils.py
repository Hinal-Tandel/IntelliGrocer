"""
Search Utilities for IntelliGrocer
Standalone scripts for common search operations
"""

from search_engine import ProductSearchEngine
import json
import sys


def interactive_search():
    """
    Interactive search mode for testing
    """
    engine = ProductSearchEngine()
    
    print("\n" + "="*60)
    print("🔍 IntelliGrocer Interactive Search")
    print("="*60)
    print("\nCommands:")
    print("  search <query>           - Search for products")
    print("  category <name>          - Browse category")
    print("  deals [min_discount]     - Find deals (default: 30%)")
    print("  essentials               - Show essential items")
    print("  categories               - List all categories")
    print("  quit                     - Exit")
    print("="*60 + "\n")
    
    while True:
        try:
            command = input("\n> ").strip()
            
            if not command:
                continue
            
            if command.lower() in ['quit', 'exit', 'q']:
                print("Goodbye! 👋")
                break
            
            parts = command.split(maxsplit=1)
            action = parts[0].lower()
            
            if action == 'search':
                if len(parts) < 2:
                    print("❌ Usage: search <query>")
                    continue
                
                query = parts[1]
                results = engine.search(query, limit=10)
                display_results(results, f"Search results for '{query}'")
            
            elif action == 'category':
                if len(parts) < 2:
                    print("❌ Usage: category <name>")
                    continue
                
                cat = parts[1]
                results = engine.search_by_category(cat, limit=10)
                display_results(results, f"Products in '{cat}'")
            
            elif action == 'deals':
                min_disc = 30.0
                if len(parts) > 1:
                    try:
                        min_disc = float(parts[1])
                    except ValueError:
                        print(f"❌ Invalid discount value: {parts[1]}")
                        continue
                
                results = engine.get_deals(min_discount=min_disc, limit=10)
                display_results(results, f"Deals with >{min_disc}% discount")
            
            elif action == 'essentials':
                results = engine.get_essentials(limit=10)
                display_results(results, "Essential Items")
            
            elif action == 'categories':
                categories = engine.get_categories()
                print(f"\n📁 Available Categories ({len(categories)}):")
                for cat in categories:
                    print(f"  • {cat}")
            
            else:
                print(f"❌ Unknown command: {action}")
                print("Type 'help' to see available commands")
        
        except KeyboardInterrupt:
            print("\n\nGoodbye! 👋")
            break
        except Exception as e:
            print(f"❌ Error: {str(e)}")


def display_results(results, title):
    """Display search results in a formatted way"""
    print(f"\n{'='*60}")
    print(f"📦 {title}")
    print(f"{'='*60}")
    
    if not results:
        print("  No products found.")
        return
    
    print(f"  Found {len(results)} products:\n")
    
    for i, product in enumerate(results, 1):
        name = product.get('name', 'Unknown')
        category = product.get('category', 'N/A')
        price = product.get('discounted_price', 0)
        original = product.get('original_price', price)
        discount = product.get('discount', '0%')
        essential = product.get('is_essential', False)
        
        essential_badge = "⭐" if essential else "  "
        savings = original - price
        
        print(f"  {essential_badge} {i:2d}. {name}")
        print(f"      Category: {category}")
        print(f"      Price: ₹{price:.2f} (was ₹{original:.2f}) • Save ₹{savings:.2f} • {discount} off")
        print()


def search_and_export(query, output_file="search_results.json"):
    """
    Search and export results to JSON file
    """
    engine = ProductSearchEngine()
    results = engine.search(query, limit=100)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Exported {len(results)} results to {output_file}")


def bulk_search(queries_file="search_queries.txt"):
    """
    Perform bulk searches from a file
    Each line in the file should be a search query
    """
    engine = ProductSearchEngine()
    
    try:
        with open(queries_file, 'r', encoding='utf-8') as f:
            queries = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"❌ File not found: {queries_file}")
        return
    
    print(f"\n🔍 Performing {len(queries)} searches...\n")
    
    all_results = {}
    
    for query in queries:
        results = engine.search(query, limit=5)
        all_results[query] = results
        print(f"  ✓ {query}: {len(results)} results")
    
    # Export to JSON
    output_file = "bulk_search_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Results exported to {output_file}")


def generate_search_report():
    """
    Generate a comprehensive search report
    """
    engine = ProductSearchEngine()
    
    print("\n" + "="*60)
    print("📊 IntelliGrocer Search Report")
    print("="*60)
    
    # Get all products
    all_products = engine.get_all_products(limit=200)
    
    print(f"\n📦 Total Products: {len(all_products)}")
    
    # Category breakdown
    categories = {}
    for product in all_products:
        cat = product.get('category', 'Unknown')
        categories[cat] = categories.get(cat, 0) + 1
    
    print(f"\n📁 Categories ({len(categories)}):")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  • {cat}: {count} products")
    
    # Discount analysis
    high_discount = [p for p in all_products if float(p.get('discount', '0%').rstrip('%')) > 30]
    print(f"\n💰 High Discount Items (>30%): {len(high_discount)}")
    
    # Essential items
    essentials = [p for p in all_products if p.get('is_essential', False)]
    print(f"⭐ Essential Items: {len(essentials)}")
    
    # Price ranges
    prices = [p.get('discounted_price', 0) for p in all_products]
    if prices:
        avg_price = sum(prices) / len(prices)
        min_price = min(prices)
        max_price = max(prices)
        
        print(f"\n💵 Price Analysis:")
        print(f"  • Average: ₹{avg_price:.2f}")
        print(f"  • Range: ₹{min_price:.2f} - ₹{max_price:.2f}")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "search" and len(sys.argv) > 2:
            query = " ".join(sys.argv[2:])
            engine = ProductSearchEngine()
            results = engine.search(query, limit=10)
            display_results(results, f"Search: {query}")
        
        elif command == "export" and len(sys.argv) > 2:
            query = " ".join(sys.argv[2:])
            output = sys.argv[3] if len(sys.argv) > 3 else "search_results.json"
            search_and_export(query, output)
        
        elif command == "bulk" and len(sys.argv) > 2:
            bulk_search(sys.argv[2])
        
        elif command == "report":
            generate_search_report()
        
        else:
            print("Usage:")
            print("  python search_utils.py search <query>")
            print("  python search_utils.py export <query> [output.json]")
            print("  python search_utils.py bulk <queries_file>")
            print("  python search_utils.py report")
            print("\nOr run without arguments for interactive mode")
    else:
        # Interactive mode
        interactive_search()
