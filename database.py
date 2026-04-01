from pymongo import MongoClient
import os

def get_db():
    """Get a database connection."""
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
    return client["shopkart_db"]

def init_db():
    """Initialize the database with tables and seed data."""
    db = get_db()
    
    # Check connection
    db.command('ping')
    
    # --- Seed products if empty ---
    if db.products.count_documents({}) == 0:
        products = [
            {"product_id": 1, "name": "Sony WH-1000XM5 Noise Cancelling", "category": "Audio", "price": 398.00,
             "image": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80",
             "description": "Industry-leading noise cancellation with crystal clear call quality.", "stock": 50},
            {"product_id": 2, "name": "Minimalist Smart Watch Series 8", "category": "Wearables", "price": 249.99,
             "image": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80",
             "description": "Track your fitness goals with stunning OLED display.", "stock": 80},
            {"product_id": 3, "name": "Premium Leather Backpack", "category": "Accessories", "price": 125.00,
             "image": "https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=600&q=80",
             "description": "Full-grain leather construction built to last a lifetime.", "stock": 60},
            {"product_id": 4, "name": "Fujifilm X-T4 Mirrorless Camera", "category": "Photography", "price": 1699.00,
             "image": "https://images.unsplash.com/photo-1516961642265-531546e84af2?w=600&q=80",
             "description": "26.1MP APS-C sensor with in-body image stabilization.", "stock": 20},
            {"product_id": 5, "name": "Nike Air Max Pulse Roam", "category": "Footwear", "price": 160.00,
             "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
             "description": "Breathable mesh upper with responsive Air cushioning.", "stock": 120},
            {"product_id": 6, "name": "Matte Black Sunglasses", "category": "Eyewear", "price": 85.00,
             "image": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80",
             "description": "UV400 polarized lenses in a timeless matte frame.", "stock": 75},
            {"product_id": 7, "name": "Byredo Gypsy Water Perfume", "category": "Fragrance", "price": 195.00,
             "image": "https://images.unsplash.com/photo-1583141505323-e221764c2ca5?w=600&q=80",
             "description": "A woody, fresh scent inspired by nomadic freedom.", "stock": 40},
            {"product_id": 8, "name": "Smart Desk Planter", "category": "Home", "price": 45.00,
             "image": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80",
             "description": "Self-watering planter with soil moisture indicator.", "stock": 90},
        ]
        db.products.insert_many(products)
        # Create indexes
        db.products.create_index("product_id", unique=True)
        db.cart.create_index([("session_id", 1), ("product_id", 1)])
        print(f"✅ Seeded {len(products)} products into MongoDB.")
    else:
        print("✅ MongoDB already initialized with data.")
