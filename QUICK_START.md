# Quick Start Guide - Smart Grocery Recommendation System

## Step 1: Install Dependencies

Open PowerShell/Command Prompt in the project folder and run:

```bash
pip install -r requirements.txt
```

## Step 2: Start the Server

```bash
python app.py
```

You should see:
```
✓ Data loaded successfully!
✓ Server running on http://localhost:5000
✓ Open http://localhost:5000 in your browser
```

## Step 3: Open the Application

Open your web browser and go to: **http://localhost:5000**

## Step 4: Set Your Preferences

Fill out the user preferences form with your information:

### Example Input:
- **Monthly Grocery Budget**: ₹15000
- **Household Size**: 4 (will auto-calculate)
- **Number of Adults**: 2
- **Number of Children**: 2
- **Current Month/Season**: January (Winter)
- **Past Monthly Spend**: ₹14500
- **Purchase Frequency**: Weekly
- **Essential Item Priority**: Yes

Click **"Save Preferences & Get Personalized Recommendations"**

## Step 5: Explore Features

### Get Recommendations
- Click **"Get AI Recommendations"** to see products tailored to your budget and needs
- Products are scored based on your household size, budget, and preferences

### Search & Filter
- Use the search bar to find specific products
- Filter by category (e.g., "Deals of the Week", "Dairy")
- Filter by discount level (High/Medium/Low)
- Sort by price (Low to High or High to Low)

### View Product Details
- Click on any product card to see:
  - Full product information
  - Savings amount and percentage
  - Value indicators

### Analytics
- Click **"Analytics"** in the navigation menu
- Click **"Generate Analytics"** to create visual charts:
  - Category distribution
  - Price vs Discount analysis
  - Top 10 discount deals

## Understanding Personalized Recommendations

The AI considers:

1. **Budget Fit**: Products that fit within your monthly budget divided by household members
2. **Essential Priority**: If enabled, essential items (dairy, bread, vegetables, etc.) are prioritized
3. **Value Score**: High discounts + affordable prices = higher recommendation score
4. **Purchase Frequency**: Adjusts recommendations based on how often you shop
5. **Savings Goal**: If your budget is less than past spending, high-discount items are prioritized

## Tips for Best Results

✅ **Be Accurate**: Provide realistic budget and spending information
✅ **Update Regularly**: Update your preferences when your household size or budget changes
✅ **Enable Essential Priority**: Get basics first, then browse deals
✅ **Check Analytics**: Use the analytics dashboard to understand spending patterns
✅ **Saved Preferences**: Your preferences are saved in the browser - no need to re-enter each time

## Troubleshooting

**Problem**: Server won't start
- **Solution**: Make sure you've installed all dependencies: `pip install -r requirements.txt`

**Problem**: Products not showing
- **Solution**: 
  - Check that `Grocery_data.csv` is in the same folder as `app.py`
  - Refresh the page
  - Check browser console (F12) for errors

**Problem**: Recommendations seem generic
- **Solution**: Make sure you've filled out and saved your preferences first

**Problem**: Charts not loading
- **Solution**: Click "Generate Analytics" button first, then wait a few seconds

## Advanced Features

### Browser Console
Press **F12** to open developer tools and see:
- Recommendation scores
- Budget calculations
- Personalization details

### Local Storage
Your preferences are saved in browser local storage. To clear:
1. Open browser console (F12)
2. Go to "Application" tab
3. Expand "Local Storage"
4. Delete the `userPreferences` entry

## Need Help?

Check the main [README.md](README.md) for detailed documentation.

---

**Enjoy smart grocery shopping! 🛒**
