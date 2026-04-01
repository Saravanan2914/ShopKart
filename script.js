// ─────────────────────────────────────────────
//  API Configuration
// ─────────────────────────────────────────────
const API_BASE = 'http://localhost:5000/api';

// ─────────────────────────────────────────────
//  DOM Elements
// ─────────────────────────────────────────────
const productGrid = document.getElementById('product-grid');
const cartToggle = document.getElementById('cart-toggle');
const closeCartBtn = document.getElementById('close-cart');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const cartTotalPrice = document.getElementById('cart-total-price');

// ─────────────────────────────────────────────
//  Initialize App
// ─────────────────────────────────────────────
async function init() {
    setupEventListeners();
    await fetchAndRenderProducts();
    await fetchAndRenderCart();
}

// ─────────────────────────────────────────────
//  Products
// ─────────────────────────────────────────────
async function fetchAndRenderProducts(category = '', search = '') {
    productGrid.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i> Loading products...
        </div>`;

    try {
        let url = `${API_BASE}/products`;
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (search) params.set('search', search);
        if (params.toString()) url += `?${params}`;

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load products');
        const products = await res.json();
        renderProducts(products);
    } catch (err) {
        productGrid.innerHTML = `<p class="error-msg"><i class="fa-solid fa-circle-exclamation"></i> Could not load products. Make sure the server is running.</p>`;
        console.error(err);
    }
}

function renderProducts(products) {
    productGrid.innerHTML = '';
    if (products.length === 0) {
        productGrid.innerHTML = '<p class="error-msg">No products found.</p>';
        return;
    }

    products.forEach(product => {
        const productEl = document.createElement('div');
        productEl.classList.add('product-card');
        productEl.innerHTML = `
            <div class="product-img">
                <img src="${product.image}" loading="lazy" alt="${product.name}">
                <div class="add-to-cart-wrapper">
                    <button class="add-to-cart-btn" id="add-btn-${product.id}" onclick="addToCart(${product.id})">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">$${product.price.toFixed(2)}</div>
            </div>
        `;
        productGrid.appendChild(productEl);
    });
}

// ─────────────────────────────────────────────
//  Cart — Fetch & Render
// ─────────────────────────────────────────────
async function fetchAndRenderCart() {
    try {
        const res = await fetch(`${API_BASE}/cart`, { credentials: 'include' });
        const items = await res.json();
        renderCart(items);
    } catch (err) {
        console.error('Failed to load cart:', err);
    }
}

function renderCart(items) {
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Update badge
    cartBadge.textContent = totalItems;

    // Update cart panel items
    if (items.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your cart is empty.</div>';
    } else {
        cartItemsContainer.innerHTML = '';
        items.forEach(item => {
            const el = document.createElement('div');
            el.classList.add('cart-item');
            el.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="updateQuantity(${item.product_id}, ${item.quantity - 1})">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <span class="cart-item-qty">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.product_id}, ${item.quantity + 1})">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.product_id})">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            `;
            cartItemsContainer.appendChild(el);
        });
    }

    // Update total
    cartTotalPrice.textContent = `$${totalPrice.toFixed(2)}`;

    // Animate badge
    cartBadge.classList.add('bump');
    setTimeout(() => cartBadge.classList.remove('bump'), 300);
}

// ─────────────────────────────────────────────
//  Cart — Actions (API calls)
// ─────────────────────────────────────────────
window.addToCart = async function(productId) {
    const btn = document.getElementById(`add-btn-${productId}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
    }

    try {
        const res = await fetch(`${API_BASE}/cart`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, quantity: 1 })
        });
        if (!res.ok) throw new Error('Failed to add to cart');
        await fetchAndRenderCart();
        showToast('Item added to cart!');
    } catch (err) {
        console.error(err);
        showToast('Failed to add item.', true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to Cart';
        }
    }
};

window.updateQuantity = async function(productId, newQty) {
    try {
        await fetch(`${API_BASE}/cart/${productId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: newQty })
        });
        await fetchAndRenderCart();
    } catch (err) {
        console.error('Failed to update quantity:', err);
    }
};

window.removeFromCart = async function(productId) {
    try {
        await fetch(`${API_BASE}/cart/${productId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        await fetchAndRenderCart();
        showToast('Item removed.');
    } catch (err) {
        console.error('Failed to remove item:', err);
    }
};

// ─────────────────────────────────────────────
//  Checkout
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }
});

async function handleCheckout() {
    // Simple inline form prompt (can be expanded to a modal)
    const name = prompt('Enter your name:');
    const email = prompt('Enter your email:');
    if (!name || !email) return;

    try {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Order failed');

        await fetchAndRenderCart();
        closeCart();
        showToast(`🎉 Order #${data.order_id} placed! Total: $${data.total.toFixed(2)}`);
    } catch (err) {
        showToast(err.message, true);
    }
}

// ─────────────────────────────────────────────
//  Toast Notification
// ─────────────────────────────────────────────
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ─────────────────────────────────────────────
//  Cart Panel Toggle
// ─────────────────────────────────────────────
function setupEventListeners() {
    cartToggle.addEventListener('click', () => {
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) closeCart();
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        navbar.style.boxShadow = window.scrollY > 50 ? 'var(--shadow-md)' : 'none';
    });
}

function closeCart() {
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ─────────────────────────────────────────────
//  Boot
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
