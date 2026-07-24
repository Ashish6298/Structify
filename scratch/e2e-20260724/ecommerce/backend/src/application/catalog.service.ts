import type { Product } from '../../../packages/shared/src/types/ecommerce.js';

export class CatalogService {
  private products: Product[] = [
    { id: '1', name: 'Everyday Backpack', slug: 'everyday-backpack', description: 'Functional daily pack.', price: 48, category: 'Accessories', rating: 4.8, inventory: 50 },
    { id: '2', name: 'Studio Desk Lamp', slug: 'studio-desk-lamp', description: 'Architectural warm light.', price: 129, category: 'Home Decor', rating: 4.5, inventory: 20 },
  ];

  async getProducts(): Promise<Product[]> {
    return this.products;
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return this.products.find(p => p.slug === slug);
  }
}
