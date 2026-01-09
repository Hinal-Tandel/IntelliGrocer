import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

# -------------------------------
# 1. Initialize Firebase
# -------------------------------
cred = credentials.Certificate("serviceAccountKey.json")  # path to your key
firebase_admin.initialize_app(cred)

db = firestore.client()

# -------------------------------
# 2. Read CSV File
# -------------------------------
df = pd.read_csv("products.csv")

# -------------------------------
# 3. Upload Data to Firestore
# -------------------------------
for index, row in df.iterrows():
    product_data = {
        "name": row["name"],
        "category": row["category"],
        "quantity": row["quantity"],
        "original_price": float(row["original_price"]),
        "discounted_price": float(row["discounted_price"]),
        "discount": row["discount"],
        "is_essential": bool(row["is_essential"])
    }

    db.collection("products").add(product_data)

print("✅ Products data successfully added to Firestore!")
