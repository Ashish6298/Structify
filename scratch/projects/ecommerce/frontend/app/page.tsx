'use client';

import React, { useState } from 'react';

const categories = ['Electronics', 'Apparel', 'Home Decor', 'Accessories'];
const initialProducts = [
  { id: '1', name: 'Everyday Backpack', price: 48, category: 'Accessories', rating: 4.8, image: '🎒' },
  { id: '2', name: 'Studio Desk Lamp', price: 129, category: 'Home Decor', rating: 4.5, image: '💡' },
  { id: '3', name: 'Leather Travel Kit', price: 32, category: 'Accessories', rating: 4.9, image: '👜' },
  { id: '4', name: 'Premium Bluetooth Headphones', price: 199, category: 'Electronics', rating: 4.7, image: '🎧' },
  { id: '5', name: 'Minimalist Wall Clock', price: 45, category: 'Home Decor', rating: 4.2, image: '🕒' },
  { id: '6', name: 'Organic Cotton Tee', price: 28, category: 'Apparel', rating: 4.6, image: '👕' }
];

export default function Storefront() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'admin'>('shop');

  const addToCart = (product: typeof initialProducts[0]) => {
    setCart((prev) => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const filteredProducts = initialProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="storefront-app">
      <header className="storefront-header">
        <div className="header-container">
          <div className="brand" onClick={() => setActiveTab('shop')}>VALIDATION-ECOMMERCE</div>
          <nav className="nav-links">
            <button className={activeTab === 'shop' ? 'active' : ''} onClick={() => setActiveTab('shop')}>Shop</button>
            <button className={activeTab === 'cart' ? 'active' : ''} onClick={() => setActiveTab('cart')}>Cart ({cart.length})</button>
            <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>Admin</button>
          </nav>
        </div>
      </header>

      <main className="storefront-main">
        {activeTab === 'shop' && (
          <div>
            <section className="hero">
              <h1>Designed for Modern Commerce</h1>
              <p>Explore our premium collections crafted with precision and care.</p>
            </section>

            <div className="catalog-filters">
              <input 
                type="text" 
                placeholder="Search products..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="search-input"
              />
              <div className="category-filters">
                <button className={selectedCategory === 'All' ? 'active' : ''} onClick={() => setSelectedCategory('All')}>All</button>
                {categories.map(c => (
                  <button key={c} className={selectedCategory === c ? 'active' : ''} onClick={() => setSelectedCategory(c)}>{c}</button>
                ))}
              </div>
            </div>

            <section className="products-grid">
              {filteredProducts.map(p => (
                <div key={p.id} className="product-card">
                  <div className="product-image">{p.image}</div>
                  <div className="product-details">
                    <span className="product-cat">{p.category}</span>
                    <h3>{p.name}</h3>
                    <div className="product-meta">
                      <span className="price">\${p.price}</span>
                      <span className="rating">★ {p.rating}</span>
                    </div>
                    <button className="add-btn" onClick={() => addToCart(p)}>Add to Cart</button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeTab === 'cart' && (
          <section className="cart-section">
            <h2>Your Shopping Cart</h2>
            {cart.length === 0 ? (
              <p>Your cart is empty. <button onClick={() => setActiveTab('shop')} className="btn-link">Go shop</button></p>
            ) : (
              <div className="cart-layout">
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item.id} className="cart-item">
                      <div>
                        <h3>{item.name}</h3>
                        <p>\${item.price} x {item.quantity}</p>
                      </div>
                      <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="remove-btn">Remove</button>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <h3>Order Summary</h3>
                  <div className="summary-row"><span>Subtotal</span><span>\${cartTotal}</span></div>
                  <div className="summary-row"><span>Shipping</span><span>Free</span></div>
                  <hr />
                  <div className="summary-row total"><span>Total</span><span>\${cartTotal}</span></div>
                  <button className="checkout-btn" onClick={() => alert('Checkout integration point: connect Stripe/PayPal')}>Proceed to Checkout</button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'admin' && (
          <section className="admin-section">
            <h2>Administration Dashboard</h2>
            <div className="admin-grid">
              <div className="admin-card">
                <h3>Products</h3>
                <p>{initialProducts.length} total products registered.</p>
              </div>
              <div className="admin-card">
                <h3>Categories</h3>
                <p>{categories.length} active categories.</p>
              </div>
              <div className="admin-card">
                <h3>Active Orders</h3>
                <p>0 pending order reviews.</p>
              </div>
            </div>
            <p className="admin-notice">Extend this panel with back-office integrations for inventory replenishment and logistics management.</p>
          </section>
        )}
      </main>

      <footer className="storefront-footer">
        <p>&copy; {new Date().getFullYear()} VALIDATION-ECOMMERCE. Powering digital storefronts with clean modular architecture.</p>
      </footer>
    </div>
  );
}
