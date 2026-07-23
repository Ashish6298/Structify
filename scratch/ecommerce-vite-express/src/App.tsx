'use client';

const categories = ['New arrivals', 'Essentials', 'Home office', 'Accessories'];
const products = [
  { name: 'Everyday carry', price: '$48', detail: 'Designed for a considered daily routine.' },
  { name: 'Studio lamp', price: '$129', detail: 'Warm light, compact footprint.' },
  { name: 'Travel organizer', price: '$32', detail: 'A place for every small essential.' },
];

export default function Storefront() {
  return (
    <main className="storefront">
      <header className="storefront__header">
        <a className="storefront__brand" href="#top">Ecommerce Vite Express</a>
        <nav aria-label="Store navigation"><a href="#products">Products</a><a href="#categories">Categories</a><a href="#account">Account</a><a href="#cart">Cart (0)</a></nav>
      </header>
      <section id="top" className="storefront__hero">
        <p className="eyebrow">Thoughtful commerce, ready to extend</p>
        <h1>Products people will want to come back for.</h1>
        <p>Use this responsive storefront foundation for catalog browsing, search, carts, wishlists, checkout, and account experiences.</p>
        <a className="button" href="#products">Shop featured products</a>
      </section>
      <section id="categories" className="storefront__section">
        <p className="eyebrow">Browse</p><h2>Shop by category</h2>
        <div className="category-grid">{categories.map((category) => <a key={category} href="#products" className="category-card">{category}<span aria-hidden="true">→</span></a>)}</div>
      </section>
      <section id="products" className="storefront__section">
        <div className="section-heading"><div><p className="eyebrow">Featured</p><h2>Made for everyday use</h2></div><label className="search"><span className="sr-only">Search products</span><input placeholder="Search products" /></label></div>
        <div className="product-grid">{products.map((product) => <article key={product.name} className="product-card"><div className="product-card__image" aria-hidden="true" /><p>{product.price}</p><h3>{product.name}</h3><span>{product.detail}</span><button type="button">Add to cart</button></article>)}</div>
      </section>
      <section id="account" className="storefront__section storefront__callout"><p className="eyebrow">Account & orders</p><h2>Authentication, profile, wishlist, orders, and checkout are scaffolded in the generated application modules.</h2></section>
      <footer>Built with Structify · E-Commerce Platform starter</footer>
    </main>
  );
}
