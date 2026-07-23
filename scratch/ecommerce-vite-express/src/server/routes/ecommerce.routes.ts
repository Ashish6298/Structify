/**
 * Register these handlers with the selected express adapter.
 * Public: GET /products, GET /products/:slug, GET /categories, GET /search
 * Customer: GET/POST /cart, GET/POST /wishlist, GET /orders, POST /checkout
 * Admin: /admin/products, /admin/orders, /admin/inventory
 */
export const ecommerceRouteGroups = ['catalog', 'cart', 'wishlist', 'orders', 'checkout', 'admin'] as const;
