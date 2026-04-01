import uuid
from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
from database import get_db, init_db
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'shopkart-ecommerce-secret-key-2026'
CORS(app, supports_credentials=True)

# ─────────────────────────────────────────────
#  Static Files — Serve Frontend
# ─────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

def serialize_product(doc):
    doc['id'] = doc['product_id']
    doc.pop('_id', None)
    return doc

# ─────────────────────────────────────────────
#  PRODUCTS API
# ─────────────────────────────────────────────

@app.route('/api/products', methods=['GET'])
def get_products():
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip()

    db = get_db()
    query = {}
    if category:
        query['category'] = category
    if search:
        query['name'] = {'$regex': search, '$options': 'i'}

    products = list(db.products.find(query))
    return jsonify([serialize_product(p) for p in products])

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    db = get_db()
    product = db.products.find_one({"product_id": product_id})
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify(serialize_product(product))

@app.route('/api/categories', methods=['GET'])
def get_categories():
    db = get_db()
    categories = db.products.distinct('category')
    return jsonify(sorted(categories))

# ─────────────────────────────────────────────
#  CART API
# ─────────────────────────────────────────────

def get_session_id():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return session['session_id']

@app.route('/api/cart', methods=['GET'])
def get_cart():
    session_id = get_session_id()
    db = get_db()
    cart_items = list(db.cart.find({'session_id': session_id}))
    
    result = []
    for item in cart_items:
        product = db.products.find_one({'product_id': item['product_id']})
        if product:
            result.append({
                'id': str(item['_id']),
                'quantity': item['quantity'],
                'product_id': product['product_id'],
                'name': product['name'],
                'price': product['price'],
                'image': product['image'],
                'category': product['category']
            })
    return jsonify(result)

@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    session_id = get_session_id()
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)

    if not product_id:
        return jsonify({'error': 'product_id is required'}), 400

    db = get_db()
    product = db.products.find_one({'product_id': product_id})
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    existing = db.cart.find_one({'session_id': session_id, 'product_id': product_id})

    if existing:
        db.cart.update_one(
            {'_id': existing['_id']},
            {'$inc': {'quantity': quantity}}
        )
    else:
        db.cart.insert_one({
            'session_id': session_id,
            'product_id': product_id,
            'quantity': quantity
        })

    return jsonify({'message': 'Added to cart successfully'}), 201

@app.route('/api/cart/<int:product_id>', methods=['PUT'])
def update_cart_item(product_id):
    session_id = get_session_id()
    data = request.get_json()
    quantity = data.get('quantity')

    if quantity is None or quantity < 0:
        return jsonify({'error': 'Valid quantity is required'}), 400

    db = get_db()
    if quantity == 0:
        db.cart.delete_one({'session_id': session_id, 'product_id': product_id})
    else:
        db.cart.update_one(
            {'session_id': session_id, 'product_id': product_id},
            {'$set': {'quantity': quantity}}
        )
        
    return jsonify({'message': 'Cart updated'})

@app.route('/api/cart/<int:product_id>', methods=['DELETE'])
def remove_from_cart(product_id):
    session_id = get_session_id()
    db = get_db()
    db.cart.delete_one({'session_id': session_id, 'product_id': product_id})
    return jsonify({'message': 'Item removed from cart'})

@app.route('/api/cart/clear', methods=['DELETE'])
def clear_cart():
    session_id = get_session_id()
    db = get_db()
    db.cart.delete_many({'session_id': session_id})
    return jsonify({'message': 'Cart cleared'})

# ─────────────────────────────────────────────
#  ORDERS API
# ─────────────────────────────────────────────

@app.route('/api/orders', methods=['POST'])
def place_order():
    session_id = get_session_id()
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()

    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400

    db = get_db()
    cart_items = list(db.cart.find({'session_id': session_id}))

    if not cart_items:
        return jsonify({'error': 'Cart is empty'}), 400

    total = 0
    order_items = []
    for item in cart_items:
        product = db.products.find_one({'product_id': item['product_id']})
        if product:
            item_total = product['price'] * item['quantity']
            total += item_total
            order_items.append({
                'product_id': product['product_id'],
                'quantity': item['quantity'],
                'unit_price': product['price']
            })

    order = {
        'customer_name': name,
        'customer_email': email,
        'total_price': total,
        'status': 'pending',
        'created_at': datetime.utcnow(),
        'items': order_items
    }
    
    result = db.orders.insert_one(order)
    db.cart.delete_many({'session_id': session_id})

    return jsonify({
        'message': 'Order placed successfully!',
        'order_id': str(result.inserted_id),
        'total': total
    }), 201

# ─────────────────────────────────────────────
#  Run Server
# ─────────────────────────────────────────────

if __name__ == '__main__':
    try:
        init_db()
        print("🚀 SHOPKART Ecommerce server running at http://localhost:5000")
        app.run(debug=True, port=5000)
    except Exception as e:
        print(f"Failed to connect to MongoDB. Is MongoDB running locally on port 27017? Error: {e}")
