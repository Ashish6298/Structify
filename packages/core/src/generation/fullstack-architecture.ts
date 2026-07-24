import { NormalizedProjectConfig } from '../types/index.js';

export type FullstackAdapterKind =
  'frontend' | 'backend' | 'database' | 'orm' | 'tooling' | 'workspace' | 'feature' | 'domain';

export interface FullstackGeneratedFile {
  path: string;
  content: string;
  source: string;
  owner?: 'framework' | 'fallback-starter' | 'predefined-template' | 'feature' | 'domain' | 'tool';
}

export interface FullstackDependency {
  name: string;
  version: string;
  kind: 'runtime' | 'development';
  source: string;
  target?: string;
}

export interface FullstackContribution {
  files?: FullstackGeneratedFile[];
  dependencies?: FullstackDependency[];
  scripts?: Record<string, string>;
  environment?: Record<string, string>;
  documentation?: string[];
}

export interface FullstackAdapter {
  id: string;
  kind: FullstackAdapterKind;
  supports(context: FullstackGenerationContext): boolean;
  contribute(context: FullstackGenerationContext): FullstackContribution;
}

export interface FullstackGenerationContext {
  config: NormalizedProjectConfig;
  layout: WorkspaceLayout;
  features: readonly FullstackFeatureId[];
}

export interface WorkspaceLayout {
  root: string;
  frontend: string;
  backend: string;
  shared: string;
}

export const DEFAULT_FULLSTACK_WORKSPACE: WorkspaceLayout = {
  root: '.',
  frontend: 'frontend',
  backend: 'backend',
  shared: 'packages/shared',
};

// Unified Composition IDs: Features (Platform Capabilities) & Domain Modules (Business Entities)
export type FullstackFeatureId =
  // --- Platform Features (Platform Capabilities) ---
  | 'authentication'
  | 'user-profile'
  | 'rbac'
  | 'permission'
  | 'dashboard'
  | 'settings'
  | 'notification'
  | 'search'
  | 'pagination'
  | 'filtering-sorting'
  | 'form-validation'
  | 'api-client'
  | 'shared-ui'
  | 'shared-layout'
  | 'navigation'
  | 'file-upload'
  | 'image-upload'
  | 'audit-logging'
  | 'activity-timeline'
  | 'configuration'
  | 'environment'
  | 'shared-types'
  | 'repositories'
  | 'service-layer'
  | 'middleware'
  | 'error-handling'
  | 'response-utilities'
  | 'request-validation'
  | 'logging'
  | 'email'
  | 'background-job'
  | 'health-check'
  | 'metrics'
  | 'documentation-generator'
  | 'seed-data'
  | 'testing-utilities'
  | 'extension-hooks'
  // --- Domain Modules (Business Entities) ---
  | 'users'
  | 'organizations'
  | 'teams'
  | 'departments'
  | 'roles'
  | 'permissions'
  | 'customers'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'suppliers'
  | 'shopping-cart'
  | 'wishlist'
  | 'orders'
  | 'order-items'
  | 'payments'
  | 'invoices'
  | 'addresses'
  | 'reviews'
  | 'coupons'
  | 'taxes'
  | 'shipping'
  | 'notifications'
  | 'files'
  | 'documents'
  | 'comments'
  | 'activity-logs'
  | 'attachments'
  | 'dashboards'
  | 'reports'
  | 'analytics'
  | 'audit-trails'
  | 'api-resources'
  | 'background-tasks'
  | 'email-templates'
  | 'media-assets'
  | 'search-indexes'
  | 'tags'
  | 'labels'
  | 'metadata'
  // Overlay boundaries
  | 'cart'
  | 'checkout'
  | 'administration'
  | 'storefront'
  | 'profile'
  | 'documentation'
  | 'validation'
  // --- Project Management Domain ---
  | 'projects'
  | 'milestones'
  | 'epics'
  | 'sprints'
  | 'tasks'
  | 'subtasks'
  | 'board';

export interface FullstackFeatureModule {
  id: FullstackFeatureId;
  requires: readonly FullstackFeatureId[];
  kind: 'feature' | 'domain';
  contribute(context: FullstackGenerationContext): FullstackContribution;
}

// Composition Registry definition
const featureModules: Record<FullstackFeatureId, FullstackFeatureModule> = {
  // Platform Features definitions
  authentication: {
    id: 'authentication',
    requires: ['shared-types'],
    kind: 'feature',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.backend}/src/application/auth.service.ts`,
          content: `import type { UserProfile } from '../../shared/types/ecommerce.js';\n\nexport class AuthService {\n  async validateToken(token: string): Promise<UserProfile | null> {\n    if (!token) return null;\n    return {\n      id: 'usr_1',\n      email: 'customer@example.com',\n      role: 'customer',\n    };\n  }\n}\n`,
          source: 'feature:authentication',
        },
      ],
    }),
  },
  'user-profile': {
    id: 'user-profile',
    requires: ['shared-types'],
    kind: 'feature',
    contribute: () => ({}),
  },
  rbac: {
    id: 'rbac',
    requires: ['authentication'],
    kind: 'feature',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.backend}/src/middleware/authorization.ts`,
          content: `export function adminGuard(req: any, res: any, next: any) {\n  if (req.user?.role !== 'admin') {\n    return res.status(403).json({ error: 'Admin access denied' });\n  }\n  next();\n}\n`,
          source: 'feature:rbac',
        },
      ],
    }),
  },
  permission: { id: 'permission', requires: ['rbac'], kind: 'feature', contribute: () => ({}) },
  dashboard: { id: 'dashboard', requires: ['shared-ui'], kind: 'feature', contribute: () => ({}) },
  settings: { id: 'settings', requires: ['shared-types'], kind: 'feature', contribute: () => ({}) },
  notification: { id: 'notification', requires: [], kind: 'feature', contribute: () => ({}) },
  search: { id: 'search', requires: ['products'], kind: 'feature', contribute: () => ({}) },
  pagination: {
    id: 'pagination',
    requires: ['shared-types'],
    kind: 'feature',
    contribute: () => ({}),
  },
  'filtering-sorting': {
    id: 'filtering-sorting',
    requires: [],
    kind: 'feature',
    contribute: () => ({}),
  },
  'form-validation': {
    id: 'form-validation',
    requires: [],
    kind: 'feature',
    contribute: () => ({}),
  },
  'api-client': {
    id: 'api-client',
    requires: ['shared-types'],
    kind: 'feature',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.shared}/src/api/client.ts`,
          content: `export interface ApiResult<T> {\n  data: T;\n  error?: string;\n}\n\nexport async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {\n  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';\n  const res = await fetch(\`\${baseUrl}\${endpoint}\`, {\n    ...options,\n    headers: {\n      'Content-Type': 'application/json',\n      ...(options?.headers || {}),\n    },\n  });\n  if (!res.ok) {\n    return { data: null as any, error: \`API Request failed with status \${res.status}\` };\n  }\n  return res.json() as Promise<ApiResult<T>>;\n}\n`,
          source: 'feature:api-client',
        },
      ],
    }),
  },
  'shared-ui': {
    id: 'shared-ui',
    requires: ['shared-layout'],
    kind: 'feature',
    contribute: () => ({}),
  },
  'shared-layout': {
    id: 'shared-layout',
    requires: ['navigation'],
    kind: 'feature',
    contribute: () => ({}),
  },
  navigation: {
    id: 'navigation',
    requires: ['shared-types'],
    kind: 'feature',
    contribute: () => ({}),
  },
  'file-upload': {
    id: 'file-upload',
    requires: ['shared-types'],
    kind: 'feature',
    contribute: () => ({}),
  },
  'image-upload': {
    id: 'image-upload',
    requires: ['file-upload'],
    kind: 'feature',
    contribute: () => ({}),
  },
  'audit-logging': {
    id: 'audit-logging',
    requires: ['logging'],
    kind: 'feature',
    contribute: () => ({}),
  },
  'activity-timeline': {
    id: 'activity-timeline',
    requires: ['shared-types'],
    kind: 'feature',
    contribute: () => ({}),
  },
  configuration: {
    id: 'configuration',
    requires: [],
    kind: 'feature',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.shared}/src/config/platform.ts`,
          content: `export const platformConfig = {\n  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',\n  environment: process.env.NODE_ENV || 'development',\n} as const;\n`,
          source: 'feature:configuration',
        },
      ],
    }),
  },
  environment: { id: 'environment', requires: [], kind: 'feature', contribute: () => ({}) },
  'shared-types': {
    id: 'shared-types',
    requires: [],
    kind: 'feature',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.shared}/src/types/domain.ts`,
          content: `export interface Product {\n  id: string;\n  name: string;\n  slug: string;\n  description: string;\n  price: number;\n  category: string;\n  rating: number;\n  inventory: number;\n  image?: string;\n}\n\nexport interface Category {\n  id: string;\n  name: string;\n  slug: string;\n}\n\nexport interface CartItem {\n  productId: string;\n  quantity: number;\n}\n\nexport interface Order {\n  id: string;\n  userId: string;\n  items: CartItem[];\n  total: number;\n  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';\n  createdAt: string;\n}\n\nexport interface UserProfile {\n  id: string;\n  email: string;\n  name?: string;\n  role: 'customer' | 'admin';\n}\n`,
          source: 'feature:shared-types',
        },
      ],
    }),
  },
  repositories: {
    id: 'repositories',
    requires: ['shared-types'],
    kind: 'feature',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.backend}/src/infrastructure/database/repository.ts`,
          content: `export interface Repository<T> {\n  find(id: string): Promise<T | null>;\n  save(entity: T): Promise<T>;\n}\n`,
          source: 'feature:repositories',
        },
      ],
    }),
  },
  'service-layer': { id: 'service-layer', requires: [], kind: 'feature', contribute: () => ({}) },
  middleware: {
    id: 'middleware',
    requires: [],
    kind: 'feature',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.backend}/src/middleware/authentication.ts`,
          content: `export function authMiddleware(req: any, res: any, next: any) {\n  const token = req.headers.authorization?.split(' ')[1];\n  if (!token) {\n    return res.status(401).json({ error: 'Unauthorized credentials required' });\n  }\n  next();\n}\n`,
          source: 'feature:middleware',
        },
      ],
    }),
  },
  'error-handling': { id: 'error-handling', requires: [], kind: 'feature', contribute: () => ({}) },
  'response-utilities': {
    id: 'response-utilities',
    requires: [],
    kind: 'feature',
    contribute: () => ({}),
  },
  'request-validation': {
    id: 'request-validation',
    requires: [],
    kind: 'feature',
    contribute: () => ({}),
  },
  logging: { id: 'logging', requires: [], kind: 'feature', contribute: () => ({}) },
  email: { id: 'email', requires: [], kind: 'feature', contribute: () => ({}) },
  'background-job': { id: 'background-job', requires: [], kind: 'feature', contribute: () => ({}) },
  'health-check': { id: 'health-check', requires: [], kind: 'feature', contribute: () => ({}) },
  metrics: { id: 'metrics', requires: [], kind: 'feature', contribute: () => ({}) },
  'documentation-generator': {
    id: 'documentation-generator',
    requires: [],
    kind: 'feature',
    contribute: () => ({}),
  },
  'seed-data': { id: 'seed-data', requires: [], kind: 'feature', contribute: () => ({}) },
  'testing-utilities': {
    id: 'testing-utilities',
    requires: [],
    kind: 'feature',
    contribute: () => ({}),
  },
  'extension-hooks': {
    id: 'extension-hooks',
    requires: [],
    kind: 'feature',
    contribute: () => ({}),
  },

  // Domain Modules (Business Entities)
  users: { id: 'users', requires: ['shared-types'], kind: 'domain', contribute: () => ({}) },
  organizations: {
    id: 'organizations',
    requires: ['shared-types'],
    kind: 'domain',
    contribute: () => ({}),
  },
  teams: { id: 'teams', requires: ['shared-types'], kind: 'domain', contribute: () => ({}) },
  departments: {
    id: 'departments',
    requires: ['shared-types'],
    kind: 'domain',
    contribute: () => ({}),
  },
  roles: { id: 'roles', requires: ['shared-types'], kind: 'domain', contribute: () => ({}) },
  permissions: {
    id: 'permissions',
    requires: ['shared-types'],
    kind: 'domain',
    contribute: () => ({}),
  },
  customers: {
    id: 'customers',
    requires: ['shared-types'],
    kind: 'domain',
    contribute: () => ({}),
  },
  products: {
    id: 'products',
    requires: ['shared-types', 'repositories'],
    kind: 'domain',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.backend}/src/application/catalog.service.ts`,
          content: `import type { Product } from '../../shared/types/ecommerce.js';\n\nexport class CatalogService {\n  private products: Product[] = [\n    { id: '1', name: 'Everyday Backpack', slug: 'everyday-backpack', description: 'Functional daily pack.', price: 48, category: 'Accessories', rating: 4.8, inventory: 50 },\n    { id: '2', name: 'Studio Desk Lamp', slug: 'studio-desk-lamp', description: 'Architectural warm light.', price: 129, category: 'Home Decor', rating: 4.5, inventory: 20 },\n  ];\n\n  async getProducts(): Promise<Product[]> {\n    return this.products;\n  }\n\n  async getProductBySlug(slug: string): Promise<Product | undefined> {\n    return this.products.find(p => p.slug === slug);\n  }\n}\n`,
          source: 'feature:products',
        },
      ],
    }),
  },
  categories: {
    id: 'categories',
    requires: ['shared-types', 'repositories'],
    kind: 'domain',
    contribute: () => ({}),
  },
  inventory: { id: 'inventory', requires: ['products'], kind: 'domain', contribute: () => ({}) },
  suppliers: {
    id: 'suppliers',
    requires: ['shared-types'],
    kind: 'domain',
    contribute: () => ({}),
  },
  'shopping-cart': {
    id: 'shopping-cart',
    requires: ['shared-types'],
    kind: 'domain',
    contribute: () => ({}),
  },
  wishlist: { id: 'wishlist', requires: ['shared-types'], kind: 'domain', contribute: () => ({}) },
  orders: {
    id: 'orders',
    requires: ['shared-types', 'repositories'],
    kind: 'domain',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.backend}/src/application/order.service.ts`,
          content: `import type { Order, CartItem } from '../../shared/types/ecommerce.js';\n\nexport class OrderService {\n  async createOrder(userId: string, items: CartItem[], total: number): Promise<Order> {\n    return {\n      id: Math.random().toString(36).substring(7),\n      userId,\n      items,\n      total,\n      status: 'pending',\n      createdAt: new Date().toISOString(),\n    };\n  }\n}\n`,
          source: 'feature:orders',
        },
      ],
    }),
  },
  'order-items': {
    id: 'order-items',
    requires: ['orders'],
    kind: 'domain',
    contribute: () => ({}),
  },
  payments: { id: 'payments', requires: ['orders'], kind: 'domain', contribute: () => ({}) },
  invoices: { id: 'invoices', requires: ['orders'], kind: 'domain', contribute: () => ({}) },
  addresses: {
    id: 'addresses',
    requires: ['shared-types'],
    kind: 'domain',
    contribute: () => ({}),
  },
  reviews: { id: 'reviews', requires: ['products'], kind: 'domain', contribute: () => ({}) },
  coupons: { id: 'coupons', requires: ['shared-types'], kind: 'domain', contribute: () => ({}) },
  taxes: { id: 'taxes', requires: ['shared-types'], kind: 'domain', contribute: () => ({}) },
  shipping: { id: 'shipping', requires: ['orders'], kind: 'domain', contribute: () => ({}) },
  notifications: { id: 'notifications', requires: [], kind: 'domain', contribute: () => ({}) },
  files: { id: 'files', requires: [], kind: 'domain', contribute: () => ({}) },
  documents: { id: 'documents', requires: [], kind: 'domain', contribute: () => ({}) },
  comments: { id: 'comments', requires: [], kind: 'domain', contribute: () => ({}) },
  'activity-logs': { id: 'activity-logs', requires: [], kind: 'domain', contribute: () => ({}) },
  attachments: { id: 'attachments', requires: [], kind: 'domain', contribute: () => ({}) },
  dashboards: { id: 'dashboards', requires: [], kind: 'domain', contribute: () => ({}) },
  reports: { id: 'reports', requires: [], kind: 'domain', contribute: () => ({}) },
  analytics: { id: 'analytics', requires: [], kind: 'domain', contribute: () => ({}) },
  'audit-trails': { id: 'audit-trails', requires: [], kind: 'domain', contribute: () => ({}) },
  'api-resources': { id: 'api-resources', requires: [], kind: 'domain', contribute: () => ({}) },
  'background-tasks': {
    id: 'background-tasks',
    requires: [],
    kind: 'domain',
    contribute: () => ({}),
  },
  'email-templates': {
    id: 'email-templates',
    requires: [],
    kind: 'domain',
    contribute: () => ({}),
  },
  'media-assets': { id: 'media-assets', requires: [], kind: 'domain', contribute: () => ({}) },
  'search-indexes': { id: 'search-indexes', requires: [], kind: 'domain', contribute: () => ({}) },
  tags: { id: 'tags', requires: [], kind: 'domain', contribute: () => ({}) },
  labels: { id: 'labels', requires: [], kind: 'domain', contribute: () => ({}) },
  metadata: { id: 'metadata', requires: [], kind: 'domain', contribute: () => ({}) },

  // Overlay / Alias mappings
  cart: { id: 'cart', requires: ['shared-types'], kind: 'domain', contribute: () => ({}) },
  checkout: {
    id: 'checkout',
    requires: ['orders', 'cart'],
    kind: 'domain',
    contribute: () => ({}),
  },
  administration: {
    id: 'administration',
    requires: ['products', 'orders'],
    kind: 'domain',
    contribute: () => ({}),
  },
  profile: { id: 'profile', requires: ['shared-types'], kind: 'domain', contribute: () => ({}) },
  documentation: { id: 'documentation', requires: [], kind: 'domain', contribute: () => ({}) },
  validation: {
    id: 'validation',
    requires: [],
    kind: 'domain',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.backend}/src/validation/entity.ts`,
          content: `export function validateProductSchema(input: any) {\n  if (!input.name || typeof input.name !== 'string') {\n    throw new Error('Product name is required and must be a string');\n  }\n  if (typeof input.price !== 'number' || input.price < 0) {\n    throw new Error('Product price must be a positive number');\n  }\n}\n`,
          source: 'feature:validation',
        },
      ],
    }),
  },
  storefront: {
    id: 'storefront',
    requires: ['shared-ui', 'api-client'],
    kind: 'domain',
    contribute: (context) => {
      const files: FullstackGeneratedFile[] = [];
      const brandLabel = context.config.projectName.toUpperCase();
      const component = `'use client';\n\nimport React, { useState } from 'react';\n\nconst categories = ['Electronics', 'Apparel', 'Home Decor', 'Accessories'];\nconst initialProducts = [\n  { id: '1', name: 'Everyday Backpack', price: 48, category: 'Accessories', rating: 4.8, image: '🎒' },\n  { id: '2', name: 'Studio Desk Lamp', price: 129, category: 'Home Decor', rating: 4.5, image: '💡' },\n  { id: '3', name: 'Leather Travel Kit', price: 32, category: 'Accessories', rating: 4.9, image: '👜' },\n  { id: '4', name: 'Premium Bluetooth Headphones', price: 199, category: 'Electronics', rating: 4.7, image: '🎧' },\n  { id: '5', name: 'Minimalist Wall Clock', price: 45, category: 'Home Decor', rating: 4.2, image: '🕒' },\n  { id: '6', name: 'Organic Cotton Tee', price: 28, category: 'Apparel', rating: 4.6, image: '👕' }\n];\n\nexport default function Storefront() {\n  const [search, setSearch] = useState('');\n  const [selectedCategory, setSelectedCategory] = useState('All');\n  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);\n  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'admin'>('shop');\n\n  const addToCart = (product: typeof initialProducts[0]) => {\n    setCart((prev) => {\n      const existing = prev.find(item => item.id === product.id);\n      if (existing) {\n        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);\n      }\n      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];\n    });\n  };\n\n  const filteredProducts = initialProducts.filter(p => {\n    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());\n    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;\n    return matchesSearch && matchesCat;\n  });\n\n  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);\n\n  return (\n    <div className="storefront-app">\n      <header className="storefront-header">\n        <div className="header-container">\n          <div className="brand" onClick={() => setActiveTab('shop')}>${brandLabel}</div>\n          <nav className="nav-links">\n            <button className={activeTab === 'shop' ? 'active' : ''} onClick={() => setActiveTab('shop')}>Shop</button>\n            <button className={activeTab === 'cart' ? 'active' : ''} onClick={() => setActiveTab('cart')}>Cart ({cart.length})</button>\n            <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>Admin</button>\n          </nav>\n        </div>\n      </header>\n\n      <main className="storefront-main">\n        {activeTab === 'shop' && (\n          <div>\n            <section className="hero">\n              <h1>Designed for Modern Commerce</h1>\n              <p>Explore our premium collections crafted with precision and care.</p>\n            </section>\n\n            <div className="catalog-filters">\n              <input \n                type="text" \n                placeholder="Search products..." \n                value={search} \n                onChange={(e) => setSearch(e.target.value)} \n                className="search-input"\n              />\n              <div className="category-filters">\n                <button className={selectedCategory === 'All' ? 'active' : ''} onClick={() => setSelectedCategory('All')}>All</button>\n                {categories.map(c => (\n                  <button key={c} className={selectedCategory === c ? 'active' : ''} onClick={() => setSelectedCategory(c)}>{c}</button>\n                ))}\n              </div>\n            </div>\n\n            <section className="products-grid">\n              {filteredProducts.map(p => (\n                <div key={p.id} className="product-card">\n                  <div className="product-image">{p.image}</div>\n                  <div className="product-details">\n                    <span className="product-cat">{p.category}</span>\n                    <h3>{p.name}</h3>\n                    <div className="product-meta">\n                      <span className="price">\\\${p.price}</span>\n                      <span className="rating">★ {p.rating}</span>\n                    </div>\n                    <button className="add-btn" onClick={() => addToCart(p)}>Add to Cart</button>\n                  </div>\n                </div>\n              ))}\n            </section>\n          </div>\n        )}\n\n        {activeTab === 'cart' && (\n          <section className="cart-section">\n            <h2>Your Shopping Cart</h2>\n            {cart.length === 0 ? (\n              <p>Your cart is empty. <button onClick={() => setActiveTab('shop')} className="btn-link">Go shop</button></p>\n            ) : (\n              <div className="cart-layout">\n                <div className="cart-items">\n                  {cart.map(item => (\n                    <div key={item.id} className="cart-item">\n                      <div>\n                        <h3>{item.name}</h3>\n                        <p>\\\${item.price} x {item.quantity}</p>\n                      </div>\n                      <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="remove-btn">Remove</button>\n                    </div>\n                  ))}\n                </div>\n                <div className="cart-summary">\n                  <h3>Order Summary</h3>\n                  <div className="summary-row"><span>Subtotal</span><span>\\\${cartTotal}</span></div>\n                  <div className="summary-row"><span>Shipping</span><span>Free</span></div>\n                  <hr />\n                  <div className="summary-row total"><span>Total</span><span>\\\${cartTotal}</span></div>\n                  <button className="checkout-btn" onClick={() => alert('Checkout integration point: connect Stripe/PayPal')}>Proceed to Checkout</button>\n                </div>\n              </div>\n            )}\n          </section>\n        )}\n\n        {activeTab === 'admin' && (\n          <section className="admin-section">\n            <h2>Administration Dashboard</h2>\n            <div className="admin-grid">\n              <div className="admin-card">\n                <h3>Products</h3>\n                <p>{initialProducts.length} total products registered.</p>\n              </div>\n              <div className="admin-card">\n                <h3>Categories</h3>\n                <p>{categories.length} active categories.</p>\n              </div>\n              <div className="admin-card">\n                <h3>Active Orders</h3>\n                <p>0 pending order reviews.</p>\n              </div>\n            </div>\n            <p className="admin-notice">Extend this panel with back-office integrations for inventory replenishment and logistics management.</p>\n          </section>\n        )}\n      </main>\n\n      <footer className="storefront-footer">\n        <p>&copy; {new Date().getFullYear()} ${brandLabel}. Powering digital storefronts with clean modular architecture.</p>\n      </footer>\n    </div>\n  );\n}\n`;

      const css = `\n:root {\n  --bg-color: #fafaf9;\n  --text-color: #1c1917;\n  --primary-color: #0f172a;\n  --accent-color: #d97706;\n  --border-color: #e7e5e4;\n}\n\nbody {\n  margin: 0;\n  padding: 0;\n  background-color: var(--bg-color);\n  color: var(--text-color);\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\n}\n\n.storefront-app {\n  display: flex;\n  flex-direction: column;\n  min-height: 100vh;\n}\n\n.storefront-header {\n  background-color: #ffffff;\n  border-bottom: 1px solid var(--border-color);\n  position: sticky;\n  top: 0;\n  z-index: 10;\n}\n\n.header-container {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 1rem 2rem;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n\n.brand {\n  font-size: 1.5rem;\n  font-weight: 800;\n  cursor: pointer;\n  letter-spacing: -0.05em;\n}\n\n.nav-links button {\n  background: none;\n  border: none;\n  font-size: 1rem;\n  margin-left: 1.5rem;\n  padding: 0.5rem 0.75rem;\n  cursor: pointer;\n  border-radius: 6px;\n  transition: all 0.2s ease;\n}\n\n.nav-links button.active {\n  background-color: var(--primary-color);\n  color: #ffffff;\n}\n\n.storefront-main {\n  flex: 1;\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 2rem;\n  width: 100%;\n}\n\n.hero {\n  padding: 4rem 2rem;\n  text-align: center;\n  background: radial-gradient(circle at 10% 20%, #fef3c7 0%, transparent 60%);\n  border-radius: 16px;\n  margin-bottom: 2rem;\n}\n\n.hero h1 {\n  font-size: 3rem;\n  margin: 0 0 1rem;\n  letter-spacing: -0.03em;\n}\n\n.catalog-filters {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 1rem;\n  margin-bottom: 2rem;\n}\n\n.search-input {\n  padding: 0.75rem 1rem;\n  border: 1px solid var(--border-color);\n  border-radius: 8px;\n  width: 300px;\n  max-width: 100%;\n}\n\n.category-filters button {\n  background-color: #ffffff;\n  border: 1px solid var(--border-color);\n  padding: 0.5rem 1rem;\n  margin-right: 0.5rem;\n  border-radius: 20px;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.category-filters button.active {\n  background-color: var(--primary-color);\n  color: #ffffff;\n  border-color: var(--primary-color);\n}\n\n.products-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 2rem;\n}\n\n.product-card {\n  background-color: #ffffff;\n  border: 1px solid var(--border-color);\n  border-radius: 12px;\n  overflow: hidden;\n  transition: transform 0.2s ease, box-shadow 0.2s ease;\n}\n\n.product-card:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 12px 20px -8px rgba(0,0,0,0.1);\n}\n\n.product-image {\n  height: 200px;\n  background-color: #f3f4f6;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 4rem;\n}\n\n.product-details {\n  padding: 1.5rem;\n}\n\n.product-cat {\n  font-size: 0.75rem;\n  text-transform: uppercase;\n  color: #6b7280;\n  letter-spacing: 0.05em;\n}\n\n.product-details h3 {\n  margin: 0.5rem 0;\n  font-size: 1.25rem;\n}\n\n.product-meta {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n\n.price {\n  font-size: 1.25rem;\n  font-weight: 700;\n  color: var(--accent-color);\n}\n\n.add-btn {\n  width: 100%;\n  background-color: var(--primary-color);\n  color: #ffffff;\n  border: none;\n  padding: 0.75rem;\n  border-radius: 8px;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n.cart-layout {\n  display: grid;\n  grid-template-columns: 2fr 1fr;\n  gap: 2rem;\n}\n\n.cart-item {\n  background-color: #ffffff;\n  border: 1px solid var(--border-color);\n  padding: 1.5rem;\n  border-radius: 8px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n\n.remove-btn {\n  background: none;\n  border: 1px solid #ef4444;\n  color: #ef4444;\n  padding: 0.5rem 1rem;\n  border-radius: 6px;\n  cursor: pointer;\n}\n\n.cart-summary {\n  background-color: #ffffff;\n  border: 1px solid var(--border-color);\n  padding: 1.5rem;\n  border-radius: 8px;\n}\n\n.summary-row {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 0.75rem;\n}\n\n.summary-row.total {\n  font-size: 1.25rem;\n  font-weight: 700;\n}\n\n.checkout-btn {\n  width: 100%;\n  background-color: var(--accent-color);\n  color: #ffffff;\n  border: none;\n  padding: 1rem;\n  border-radius: 8px;\n  font-weight: 700;\n  cursor: pointer;\n  margin-top: 1rem;\n}\n\n.admin-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 1.5rem;\n  margin-bottom: 2rem;\n}\n\n.admin-card {\n  background-color: #ffffff;\n  border: 1px solid var(--border-color);\n  padding: 1.5rem;\n  border-radius: 8px;\n}\n\n.admin-notice {\n  color: #6b7280;\n  font-style: italic;\n}\n\n.storefront-footer {\n  background-color: #ffffff;\n  border-top: 1px solid var(--border-color);\n  padding: 2rem;\n  text-align: center;\n  color: #6b7280;\n}\n`;

      if (context.config.stack.frontend === 'next') {
        files.push(
          {
            path: `${context.layout.frontend}/app/page.tsx`,
            content: component,
            source: 'feature:storefront',
          },
          {
            path: `${context.layout.frontend}/app/globals.css`,
            content: css,
            source: 'feature:storefront',
          },
        );
      } else {
        files.push(
          {
            path: `${context.layout.frontend}/src/App.tsx`,
            content: component,
            source: 'feature:storefront',
          },
          {
            path: `${context.layout.frontend}/src/index.css`,
            content: css,
            source: 'feature:storefront',
          },
        );
      }

      files.push(
        {
          path: `${context.layout.backend}/src/routes/ecommerce.routes.ts`,
          content: `import { Router } from 'express';\nimport { CatalogService } from '../application/catalog.service.js';\n\nexport const ecommerceRouter = Router();\nconst catalogService = new CatalogService();\n\necommerceRouter.get('/products', async (req, res) => {\n  const products = await catalogService.getProducts();\n  res.json({ data: products });\n});\n`,
          source: 'feature:storefront',
        },
        {
          path: `${context.layout.backend}/src/modules/README.md`,
          content: `# Backend Modules\nPlace backend routes, service classes, database queries, and repository files here.\n`,
          source: 'feature:storefront',
        },
        {
          path: `${context.layout.frontend}/src/features/README.md`,
          content: `# Storefront UI features\nStorefront pages, widgets, state management hooks, and theme configurations.\n`,
          source: 'feature:storefront',
        },
        {
          path: 'README.md',
          content: `# ${brandLabel} - E-Commerce Platform\n\nA production-oriented E-Commerce Platform workspace generated by Structify.\n\n## Workspace Layout\n- \`frontend\`: Elevates storefront UI.\n- \`backend\`: API services using **${context.config.stack.backend}**.\n- \`packages/shared\`: Shared API client and models.\n`,
          source: 'feature:storefront',
        },
        {
          path: '.env.example',
          content: `NODE_ENV=development\nPORT=3000\nAPI_BASE_URL=http://localhost:3000/api\nDATABASE_URL=replace-with-${context.config.stack.database}-connection-string\nJWT_SECRET=replace-with-jwt-secret\n`,
          source: 'feature:storefront',
        },
        {
          path: 'docs/ecommerce-architecture.md',
          content: `# E-Commerce Platform Architecture Overview\n\nWorkspace isolation features.\n`,
          source: 'feature:storefront',
        },
      );

      return { files };
    },
  },
  projects: {
    id: 'projects',
    requires: ['shared-types', 'repositories'],
    kind: 'domain',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.backend}/src/application/project.service.ts`,
          content: `import type { Project } from '../../shared/types/ecommerce.js';\n\nexport class ProjectService {\n  private projects = [\n    { id: 'proj_1', name: 'Phoenix Platform Upgrade', code: 'PHX', description: 'Core system migrations.', status: 'active', owner: 'Alice Smith' },\n    { id: 'proj_2', name: 'Mobile App Redesign', code: 'MOB', description: 'React Native upgrade.', status: 'planning', owner: 'Bob Jones' },\n  ];\n\n  async getProjects() {\n    return this.projects;\n  }\n}\n`,
          source: 'feature:projects',
        },
      ],
    }),
  },
  milestones: { id: 'milestones', requires: ['projects'], kind: 'domain', contribute: () => ({}) },
  epics: { id: 'epics', requires: ['projects'], kind: 'domain', contribute: () => ({}) },
  sprints: { id: 'sprints', requires: ['projects'], kind: 'domain', contribute: () => ({}) },
  tasks: {
    id: 'tasks',
    requires: ['projects', 'repositories'],
    kind: 'domain',
    contribute: (context) => ({
      files: [
        {
          path: `${context.layout.backend}/src/application/task.service.ts`,
          content: `export class TaskService {\n  private tasks = [\n    { id: 'tsk_1', projectId: 'proj_1', title: 'Setup CI/CD pipeline', priority: 'high', status: 'todo', assignee: 'Charlie Brown' },\n    { id: 'tsk_2', projectId: 'proj_1', title: 'Database schema migration', priority: 'critical', status: 'in-progress', assignee: 'Alice Smith' },\n    { id: 'tsk_3', projectId: 'proj_2', title: 'Design user onboarding flow', priority: 'medium', status: 'done', assignee: 'Bob Jones' },\n  ];\n\n  async getTasks(projectId?: string) {\n    if (projectId) return this.tasks.filter(t => t.projectId === projectId);\n    return this.tasks;\n  }\n}\n`,
          source: 'feature:tasks',
        },
      ],
    }),
  },
  subtasks: { id: 'subtasks', requires: ['tasks'], kind: 'domain', contribute: () => ({}) },
  board: {
    id: 'board',
    requires: ['shared-ui', 'api-client', 'projects', 'tasks'],
    kind: 'domain',
    contribute: (context) => {
      const files: FullstackGeneratedFile[] = [];
      const brandLabel = context.config.projectName.toUpperCase();
      const component = `'use client';\n\nimport React, { useState } from 'react';\n\nconst initialProjects = [\n  { id: 'proj_1', name: 'Phoenix Platform Upgrade', code: 'PHX', description: 'Core system migrations.', status: 'active', owner: 'Alice Smith' },\n  { id: 'proj_2', name: 'Mobile App Redesign', code: 'MOB', description: 'React Native upgrade.', status: 'planning', owner: 'Bob Jones' }\n];\n\nconst initialTasks = [\n  { id: 'tsk_1', projectId: 'proj_1', title: 'Setup CI/CD pipeline', priority: 'high', status: 'todo', assignee: 'Charlie Brown' },\n  { id: 'tsk_2', projectId: 'proj_1', title: 'Database schema migration', priority: 'critical', status: 'in-progress', assignee: 'Alice Smith' },\n  { id: 'tsk_3', projectId: 'proj_2', title: 'Design user onboarding flow', priority: 'medium', status: 'done', assignee: 'Bob Jones' }\n];\n\nexport default function ProjectBoard() {\n  const [projects] = useState(initialProjects);\n  const [tasks, setTasks] = useState(initialTasks);\n  const [activeTab, setActiveTab] = useState<'board' | 'backlog' | 'settings'>('board');\n  const [selectedProjectId, setSelectedProjectId] = useState('proj_1');\n\n  const moveTask = (taskId: string, newStatus: 'todo' | 'in-progress' | 'done') => {\n    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));\n  };\n\n  const filteredTasks = tasks.filter(t => t.projectId === selectedProjectId);\n  const currentProject = projects.find(p => p.id === selectedProjectId);\n\n  return (\n    <div className="pm-app">\n      <header className="pm-header">\n        <div className="header-container">\n          <div className="brand" onClick={() => setActiveTab('board')}>📁 ${brandLabel} PM</div>\n          <nav className="nav-links">\n            <button className={activeTab === 'board' ? 'active' : ''} onClick={() => setActiveTab('board')}>Kanban Board</button>\n            <button className={activeTab === 'backlog' ? 'active' : ''} onClick={() => setActiveTab('backlog')}>Backlog & Sprints</button>\n            <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>\n          </nav>\n        </div>\n      </header>\n\n      <main className="pm-main">\n        <div className="project-selector-bar">\n          <label>Active Project: </label>\n          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>\n            {projects.map(p => (\n              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>\n            ))}\n          </select>\n          <span className="owner-badge">Owner: {currentProject?.owner}</span>\n        </div>\n\n        {activeTab === 'board' && (\n          <div>\n            <section className="board-grid">\n              {['todo', 'in-progress', 'done'].map(status => (\n                <div key={status} className="board-column">\n                  <h2 className="column-title">{status.toUpperCase()}</h2>\n                  <div className="tasks-container">\n                    {filteredTasks.filter(t => t.status === status).map(t => (\n                      <div key={t.id} className="task-card">\n                        <h3>{t.title}</h3>\n                        <div className="task-meta">\n                          <span className={\`priority-badge \${t.priority}\`}>{t.priority}</span>\n                          <span className="assignee">{t.assignee}</span>\n                        </div>\n                        <div className="actions">\n                          {status !== 'todo' && <button onClick={() => moveTask(t.id, 'todo')}>Todo</button>}\n                          {status !== 'in-progress' && <button onClick={() => moveTask(t.id, 'in-progress')}>Work</button>}\n                          {status !== 'done' && <button onClick={() => moveTask(t.id, 'done')}>Done</button>}\n                        </div>\n                      </div>\n                    ))}\n                  </div>\n                </div>\n              ))}\n            </section>\n          </div>\n        )}\n\n        {activeTab === 'backlog' && (\n          <section className="backlog-section">\n            <h2>Product Backlog & Epics</h2>\n            <div className="backlog-list">\n              {filteredTasks.map(t => (\n                <div key={t.id} className="backlog-item">\n                  <span className="backlog-id">{t.id}</span>\n                  <span className="backlog-title">{t.title}</span>\n                  <span className={\`priority-badge \${t.priority}\`}>{t.priority}</span>\n                  <span className="backlog-status">{t.status}</span>\n                </div>\n              ))}\n            </div>\n          </section>\n        )}\n\n        {activeTab === 'settings' && (\n          <section className="settings-section">\n            <h2>Project Configuration</h2>\n            <div className="settings-form">\n              <div className="form-group">\n                <label>Project Name</label>\n                <input type="text" defaultValue={currentProject?.name} disabled />\n              </div>\n              <div className="form-group">\n                <label>Code Prefix</label>\n                <input type="text" defaultValue={currentProject?.code} disabled />\n              </div>\n              <p className="notice">Settings and access rules are locked in read-only mode. Integrate database storage to persist configurations.</p>\n            </div>\n          </section>\n        )}\n      </main>\n\n      <footer className="pm-footer">\n        <p>&copy; {new Date().getFullYear()} ${brandLabel}. Workspaces powered by clean modular fullstack architecture.</p>\n      </footer>\n    </div>\n  );\n}\n`;
      const css = `\n:root {\n  --bg-color: #f8fafc;\n  --text-color: #0f172a;\n  --primary-color: #2563eb;\n  --border-color: #e2e8f0;\n  --card-bg: #ffffff;\n}\n\nbody {\n  margin: 0;\n  padding: 0;\n  background-color: var(--bg-color);\n  color: var(--text-color);\n  font-family: ui-sans-serif, system-ui, sans-serif;\n}\n\n.pm-app {\n  display: flex;\n  flex-direction: column;\n  min-height: 100vh;\n}\n\n.pm-header {\n  background-color: #ffffff;\n  border-bottom: 1px solid var(--border-color);\n  position: sticky;\n  top: 0;\n  z-index: 10;\n}\n\n.header-container {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 1rem 2rem;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n\n.brand {\n  font-size: 1.25rem;\n  font-weight: 700;\n  cursor: pointer;\n}\n\n.nav-links button {\n  background: none;\n  border: none;\n  font-size: 0.95rem;\n  margin-left: 1rem;\n  padding: 0.5rem 1rem;\n  cursor: pointer;\n  border-radius: 6px;\n  transition: all 0.2s ease;\n}\n\n.nav-links button.active {\n  background-color: var(--primary-color);\n  color: #ffffff;\n}\n\n.pm-main {\n  flex: 1;\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 2rem;\n  width: 100%;\n}\n\n.project-selector-bar {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  margin-bottom: 2rem;\n  background: #ffffff;\n  padding: 1rem;\n  border-radius: 8px;\n  border: 1px solid var(--border-color);\n}\n\n.project-selector-bar select {\n  padding: 0.5rem;\n  border-radius: 6px;\n  border: 1px solid var(--border-color);\n}\n\n.owner-badge {\n  font-size: 0.85rem;\n  color: #64748b;\n  margin-left: auto;\n}\n\n.board-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 1.5rem;\n}\n\n.board-column {\n  background: #f1f5f9;\n  padding: 1rem;\n  border-radius: 10px;\n  min-height: 500px;\n}\n\n.column-title {\n  font-size: 0.9rem;\n  color: #475569;\n  margin-bottom: 1rem;\n  border-bottom: 2px solid var(--border-color);\n  padding-bottom: 0.5rem;\n}\n\n.tasks-container {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n\n.task-card {\n  background: var(--card-bg);\n  padding: 1rem;\n  border-radius: 8px;\n  box-shadow: 0 1px 3px rgba(0,0,0,0.05);\n  border: 1px solid var(--border-color);\n}\n\n.task-card h3 {\n  margin: 0 0 0.75rem;\n  font-size: 1rem;\n}\n\n.task-meta {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n\n.priority-badge {\n  font-size: 0.75rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 4px;\n  font-weight: 600;\n  text-transform: uppercase;\n}\n\n.priority-badge.high { background: #fee2e2; color: #991b1b; }\n.priority-badge.critical { background: #fef2f2; color: #b91c1c; border: 1px solid #f87171; }\n.priority-badge.medium { background: #fef3c7; color: #92400e; }\n\n.assignee {\n  font-size: 0.8rem;\n  color: #64748b;\n}\n\n.actions {\n  display: flex;\n  gap: 0.5rem;\n}\n\n.actions button {\n  flex: 1;\n  font-size: 0.8rem;\n  padding: 0.25rem;\n  border: 1px solid var(--border-color);\n  background: #ffffff;\n  cursor: pointer;\n  border-radius: 4px;\n}\n\n.backlog-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n\n.backlog-item {\n  background: #ffffff;\n  padding: 1rem;\n  border-radius: 8px;\n  border: 1px solid var(--border-color);\n  display: flex;\n  align-items: center;\n  gap: 1.5rem;\n}\n\n.backlog-id { font-weight: 700; color: #64748b; }\n.backlog-title { flex: 1; }\n\n.settings-form {\n  background: #ffffff;\n  padding: 2rem;\n  border-radius: 8px;\n  border: 1px solid var(--border-color);\n  max-width: 600px;\n}\n\n.form-group {\n  margin-bottom: 1.5rem;\n}\n\n.form-group label {\n  display: block;\n  margin-bottom: 0.5rem;\n  font-weight: 600;\n}\n\n.form-group input {\n  width: 100%;\n  padding: 0.5rem;\n  border: 1px solid var(--border-color);\n  border-radius: 6px;\n  background: #f8fafc;\n}\n\n.notice { color: #64748b; font-style: italic; font-size: 0.9rem; }\n\n.pm-footer {\n  background-color: #ffffff;\n  border-top: 1px solid var(--border-color);\n  padding: 2rem;\n  text-align: center;\n  color: #64748b;\n  margin-top: auto;\n}\n`;
      if (context.config.stack.frontend === 'next') {
        files.push(
          {
            path: `${context.layout.frontend}/app/page.tsx`,
            content: component,
            source: 'feature:board',
          },
          {
            path: `${context.layout.frontend}/app/globals.css`,
            content: css,
            source: 'feature:board',
          },
        );
      } else {
        files.push(
          {
            path: `${context.layout.frontend}/src/App.tsx`,
            content: component,
            source: 'feature:board',
          },
          {
            path: `${context.layout.frontend}/src/index.css`,
            content: css,
            source: 'feature:board',
          },
        );
      }

      files.push(
        {
          path: `${context.layout.backend}/src/routes/project.routes.ts`,
          content: `import { Router } from 'express';\nimport { ProjectService } from '../application/project.service.js';\n\nexport const projectRouter = Router();\nconst projectService = new ProjectService();\n\nprojectRouter.get('/projects', async (req, res) => {\n  const projects = await projectService.getProjects();\n  res.json({ data: projects });\n});\n`,
          source: 'feature:board',
        },
        {
          path: `${context.layout.backend}/src/modules/README.md`,
          content: `# PM Modules\nPlace project routing boundaries and service configurations here.\n`,
          source: 'feature:board',
        },
        {
          path: `${context.layout.frontend}/src/features/README.md`,
          content: `# Kanban UI components\nUI features and board layouts.\n`,
          source: 'feature:board',
        },
        {
          path: 'README.md',
          content: `# ${brandLabel} - Project Management Platform\n\nA professional project board workspace generated by Structify.\n`,
          source: 'feature:board',
        },
        {
          path: '.env.example',
          content: `NODE_ENV=development\nPORT=3000\nAPI_BASE_URL=http://localhost:3000/api\nDATABASE_URL=replace-with-${context.config.stack.database}-connection-string\nJWT_SECRET=replace-with-jwt-secret\n`,
          source: 'feature:board',
        },
        {
          path: 'docs/pm-architecture.md',
          content: `# Project Management Architecture Overview\nWorkspace isolation details.\n`,
          source: 'feature:board',
        },
      );
      return { files };
    },
  },
};

// Returns a helper object for feature metadata discovery
export function getFeatureRegistry() {
  return Object.values(featureModules).map((m) => ({
    id: m.id,
    requires: m.requires,
  }));
}

export function resolveFeatureModules(
  ids: readonly FullstackFeatureId[],
): FullstackFeatureModule[] {
  const resolved = new Map<FullstackFeatureId, FullstackFeatureModule>();
  const visiting = new Set<FullstackFeatureId>();

  const visit = (id: FullstackFeatureId) => {
    if (visiting.has(id)) {
      throw new Error(`Circular dependency detected: ${id}`);
    }
    if (resolved.has(id)) return;

    const module = featureModules[id];
    if (!module) {
      throw new Error(`Unknown feature module: ${id}`);
    }

    visiting.add(id);
    for (const requirement of module.requires) {
      visit(requirement);
    }
    visiting.delete(id);

    resolved.set(id, module);
  };

  ids.forEach(visit);
  return [...resolved.values()];
}

export function createFullstackArchitecturePlan(
  config: NormalizedProjectConfig,
  adapters: readonly FullstackAdapter[],
  features: readonly FullstackFeatureId[],
  layout: WorkspaceLayout = DEFAULT_FULLSTACK_WORKSPACE,
): FullstackContribution {
  const context: FullstackGenerationContext = { config, layout, features };
  const contributions = [
    ...adapters
      .filter((adapter) => adapter.supports(context))
      .map((adapter) => {
        const contrib = adapter.contribute(context);
        if (contrib.files) {
          contrib.files = contrib.files.map((file) => ({
            ...file,
            owner:
              file.owner || (adapter.id === 'fallback-starter' ? 'fallback-starter' : 'framework'),
          }));
        }
        return contrib;
      }),
    ...resolveFeatureModules(features).map((module) => {
      const contrib = module.contribute(context);
      if (contrib.files) {
        contrib.files = contrib.files.map((file) => ({
          ...file,
          owner: file.owner || (module.kind === 'domain' ? 'domain' : 'feature'),
        }));
      }
      return contrib;
    }),
  ];
  return mergeFullstackContributions(contributions);
}

function merge<T>(
  target: Map<string, T>,
  key: string,
  value: T,
  fingerprint: (value: T) => string,
  type: string,
): void {
  const existing = target.get(key);
  if (existing && fingerprint(existing) !== fingerprint(value)) {
    throw new Error(
      `Fullstack ${type} conflict at "${key}": "${fingerprint(existing)}" vs "${fingerprint(value)}"`,
    );
  }
  target.set(key, value);
}

/** Deterministic merge rules: identical values deduplicate; conflicts fail early. */
export function mergeFullstackContributions(
  contributions: readonly FullstackContribution[],
): FullstackContribution {
  const files = new Map<string, FullstackGeneratedFile>();
  const dependencies = new Map<string, FullstackDependency>();
  const scripts = new Map<string, string>();
  const environment = new Map<string, string>();
  const documentation = new Set<string>();
  for (const contribution of contributions) {
    for (const file of contribution.files ?? []) {
      const existing = files.get(file.path);
      if (existing) {
        if (existing.content === file.content) {
          continue;
        }

        const existingOwner = existing.owner || 'fallback-starter';
        const newOwner = file.owner || 'fallback-starter';

        if (existingOwner === 'fallback-starter' && newOwner !== 'fallback-starter') {
          files.set(file.path, file);
        } else if (newOwner === 'fallback-starter' && existingOwner !== 'fallback-starter') {
          continue;
        } else {
          throw new Error(
            `Fullstack file conflict at "${file.path}": "${existing.content}" vs "${file.content}" (owner: ${existingOwner} vs ${newOwner})`,
          );
        }
      } else {
        files.set(file.path, file);
      }
    }
    for (const dependency of contribution.dependencies ?? [])
      merge(
        dependencies,
        dependency.target ? `${dependency.target}:${dependency.name}` : dependency.name,
        dependency,
        (value) => `${value.version}:${value.kind}`,
        'dependency',
      );
    for (const [name, command] of Object.entries(contribution.scripts ?? {}))
      merge(scripts, name, command, (value) => value, 'script');
    for (const [name, value] of Object.entries(contribution.environment ?? {}))
      merge(environment, name, value, (value) => value, 'environment variable');
    for (const item of contribution.documentation ?? []) documentation.add(item);
  }
  return {
    files: [...files.values()],
    dependencies: [...dependencies.values()],
    scripts: Object.fromEntries(scripts),
    environment: Object.fromEntries(environment),
    documentation: [...documentation],
  };
}
