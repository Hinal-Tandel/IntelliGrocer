# Smart Grocery Recommendation System

A web-based smart grocery recommendation system with AI-powered product recommendations and analytics.

## Tech Stack

- **Frontend**: HTML5, CSS3
- **Client-side Logic**: ES6 Vanilla JavaScript (Modular JS architecture)
- **Backend & ML**: Python 
- **Data Processing**: Pandas, NumPy, Scikit-learn
- **Data Storage**: CSV
- **Visualization**: Matplotlib, Seaborn
- **API Communication**: Fetch API (REST)

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
- 🧠 **Smart AI Modes**: 8 intelligent recommendation modes:
  - 📊 **Smart Quantity Optimization**: Suggest optimal quantities within budget
  - 🌱 **Seasonal Grocery Intelligence**: Recommend seasonal & cheaper items
  - 👨‍👩‍👧‍👦 **Household-Aware Recommendations**: Adjust groceries based on family size/type
  - 💪 **Health-Aware Budget Optimization**: Balance budget + nutrition
  - 🔄 **Substitute Product Recommendation**: Suggest cheaper alternatives
  - 🏆 **Savings Score & Monthly Ranking**: Rank users/months by savings efficiency
  - 🔮 **Next Month Budget Prediction**: Predict future grocery budget
  - 💡 **Recommendation Explanation Engine**: Explain why items are recommended
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
IntelliGrocer/
├── index.html                    # Main HTML file
├── styles.css                    # Global stylesheet
├── grocery_dataset.csv           # Product data
├── Smart grocery recommendation system.ipynb  # ML notebook
├── requirements.txt              # Python dependencies
├── README.md                     # This file
├── js/
│   ├── main.js                   # Application initialization & event handling
│   ├── state.js                  # Application state management
│   ├── ui.js                     # UI rendering functions
│   ├── api.js                    # Data layer (now backed by Firebase Firestore)
│   ├── filters.js                # Product filtering logic
│   ├── storage.js                # Local storage management
│   └── utils.js                  # Utility functions
└── (Python backend server files)
## Firebase Setup (Frontend Auth + Firestore)

This project can run purely in the browser using Firebase for authentication and data storage.

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password, optionally Google) in the Firebase Console.
3. Create a Firestore database (in production or test mode).
4. Copy `js/firebase-config.example.js` to `js/firebase-config.js` and replace values with your project's config.
5. Set up Firestore collections:
    - `products` (documents representing grocery items)
       - Example fields: `name` (string), `category` (string), `quantity` (string), `original_price` (number), `discounted_price` (number), `discount` (string like "25%"), `is_essential` (boolean)
    - `analytics/latest` (optional doc with base64 chart images)
       - Fields: `category_chart`, `price_discount_chart`, `top_deals_chart` (base64 PNG strings)
    - Per-user data is stored under `users/{uid}`:
       - `profile` (firstName, lastName, email)
       - `preferences` (the saved preferences from the form)
       - `budget` (optional budget object)
       - `recommendations/latest` (doc with `{ items: [...], ts }`)

6. Recommended Firestore security rules (adjust to your needs):

```
rules_version = '2';
service cloud.firestore {
   match /databases/{database}/documents {
      match /products/{doc} { allow read: if true; allow write: if false; }
      match /analytics/{doc} { allow read: if true; allow write: if false; }
      match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
         match /{document=**} { allow read, write: if request.auth != null && request.auth.uid == userId; }
      }
   }
}
```

7. Open `login.html` to sign in, then `index.html` will load your data from Firestore.

Notes:
- `js/api.js` now fetches data from Firestore and computes simple client-side recommendations.
- Preferences and recommendations are saved to Firestore for the signed-in user.

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

### Select AI Mode
1. Browse the **Smart Recommendation Modes** carousel at the top
2. Click on any of the 8 AI modes to activate it:
   - **Quantity**: Optimizes quantity suggestions within your budget
   - **Seasonal**: Prioritizes seasonal and cheaper items
   - **Household**: Tailors recommendations to your family composition
   - **Health**: Balances nutritional value with budget constraints
   - **Substitute**: Finds cheaper alternatives to premium items
   - **Savings Score**: Ranks recommendations by efficiency
   - **Prediction**: Forecasts your next month's budget needs
   - **Explain**: Provides detailed reasoning for recommendations
3. The active mode is highlighted with a checkmark ✓

### AI Recommendations
1. Click the "Get AI Picks" button or use the active AI mode
2. The system analyzes products based on:
   - Your selected AI mode and preferences
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

## Architecture & Modules

### Frontend Modules (JavaScript)
- **main.js**: Application initialization, event binding, and workflow orchestration
- **state.js**: Centralized state management for products, preferences, filters, and active AI mode
- **ui.js**: All UI rendering functions including feature cards, product cards, and modals
- **api.js**: RESTful API communication with the Flask backend
- **filters.js**: Client-side product filtering and sorting logic
- **storage.js**: Browser local storage for preference persistence
- **utils.js**: Helper functions for formatting, calculations, and utilities

### Backend Features
The Flask backend provides intelligent recommendation engines:
- Modular AI mode system supporting multiple recommendation strategies
- Feature extraction and scoring for each mode
- Dynamic recommendation ranking based on active mode

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
- **Mode-specific processing** for each AI recommendation strategy
- Uses cosine similarity for finding similar products

## AI Recommendation Modes

The system includes 8 intelligent recommendation modes that can be toggled without reloading:

1. **Smart Quantity Optimization** 📊
   - Suggests optimal quantities within your monthly budget
   - Considers household size and consumption patterns

2. **Seasonal Grocery Intelligence** 🌱
   - Prioritizes items that are in-season and typically cheaper
   - Reduces overall spending by leveraging seasonal pricing

3. **Household-Aware Recommendations** 👨‍👩‍👧‍👦
   - Adjusts recommendations based on family composition
   - Different suggestions for families with children vs. elderly members

4. **Health-Aware Budget Optimization** 💪
   - Balances nutritional value with budget constraints
   - Prioritizes healthy options within your budget range

5. **Substitute Product Recommendation** 🔄
   - Suggests cheaper alternatives for premium items
   - Maintains quality while reducing costs

6. **Savings Score & Monthly Ranking** 🏆
   - Ranks products and recommendations by efficiency
   - Shows potential savings compared to alternatives

7. **Next Month Budget Prediction** 🔮
   - Predicts your next month's grocery budget based on patterns
   - Helps with financial planning and budget allocation

8. **Recommendation Explanation Engine** 💡
   - Provides detailed reasoning for each recommendation
   - Shows why specific items are suggested for your profile

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
