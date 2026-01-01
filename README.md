# Smart Grocery Recommendation System

A web-based smart grocery recommendation system with AI-powered product recommendations and analytics.

## Tech Stack

- **Frontend**: HTML, CSS
- **Client-side Logic**: JavaScript (Vanilla JS, no Node.js)
- **Backend & ML**: Python (Flask)
- **Data Storage**: CSV
- **Visualization**: Matplotlib, Seaborn

## Features

- 🔍 **Smart Search**: Search products by name or category
- 👤 **User Preferences**: Personalize recommendations based on:
  - Monthly grocery budget
  - Household size (adults & children)
  - Current season/month
  - Past spending patterns
  - Purchase frequency
  - Essential item priorities
- 🎯 **AI Recommendations**: Get personalized product recommendations based on value scores and user preferences
- 📊 **Analytics Dashboard**: Visualize category distribution, price vs discount analysis, and top deals
- 🏷️ **Advanced Filtering**: Filter by category, discount range, and sort by price
- 💰 **Deal Highlighting**: Automatically highlights the best deals
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 💾 **Persistent Preferences**: User preferences are saved in browser local storage

## Installation & Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Backend Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

### 3. Open the Application

Open your web browser and navigate to:
```
http://localhost:5000
```

## File Structure

```
Capstone Project/
├── index.html              # Main HTML file
├── styles.css              # Stylesheet
├── script.js               # Client-side JavaScript
├── app.py                  # Python Flask backend server
├── Grocery_data.csv        # Product data
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Usage

### Set Your Preferences
1. Fill out the user preferences form with:
   - Your monthly grocery budget (₹)
   - Household size and composition (adults/children)
   - Current month/season
   - Past spending history
   - Shopping frequency
   - Essential item priority
2. Click "Save Preferences & Get Personalized Recommendations"
3. Your preferences will be saved and used for future recommendations

### Search and Filter
1. Use the search bar to find specific products
2. Filter by category, discount range, or sort by price
3. Click on any product card to view detailed information

### AI Recommendations
1. Click the "Get AI Recommendations" button
2. The system analyzes products based on:
   - Your budget constraints
   - Household size and needs
   - Discount rates and prices
   - Essential item priorities
3. Top value products tailored to your needs are displayed

### Analytics
1. Navigate to the Analytics section using the navigation menu
2. Click "Generate Analytics" to create visualizations
3. View charts for:
   - Category distribution
   - Price vs Discount analysis
   - Top discount deals

## API Endpoints

- `GET /api/products` - Get all products
- `POST /api/recommendations` - Get AI-powered personalized recommendations (accepts user preferences in request body)
- `GET /api/recommendations` - Get basic AI recommendations (without preferences)
- `GET /api/analytics` - Generate analytics charts
- `GET /api/similar-products/<id>` - Get similar products
- `GET /api/stats` - Get overall statistics

## Data Processing

The system performs the following data processing:
- Handles missing values in discount, price, and quantity columns
- Standardizes numerical features using StandardScaler
- Calculates value scores based on discount percentage and price
- **Personalized scoring algorithm** that considers:
  - User's monthly budget and household size
  - Per-person budget calculations
  - Essential vs non-essential item categorization
  - Purchase frequency patterns
  - Budget optimization (comparing current budget vs past spending)
- Uses cosine similarity for finding similar products

## Troubleshooting

**Issue**: Server won't start
- Make sure all dependencies are installed: `pip install -r requirements.txt`
- Check if port 5000 is available

**Issue**: Products not loading
- Ensure `Grocery_data.csv` is in the same directory as `app.py`
- Check browser console for errors
- Verify the server is running

**Issue**: Charts not generating
- Make sure matplotlib backend is set to 'Agg' (non-GUI)
- Check if all visualization libraries are installed

## Future Enhancements

- User authentication and personalized recommendations
- Shopping cart functionality
- Order history tracking
- More advanced ML algorithms (collaborative filtering, neural networks)
- Real-time price tracking
- Mobile app version

## License

This project is for educational purposes as part of a Capstone Project.

## Contributors

Capstone Project Team - 2026
