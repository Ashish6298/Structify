import type { Product } from '../../shared/types/ecommerce.js';

export class CatalogService {
  async search(query = ''): Promise<Product[]> {
    // Replace this fixture with a repository backed by mongodb.
    return [{ id: 'product_demo', slug: 'everyday-carry', title: 'Everyday carry', price: 4800, currency: 'USD', inventory: 12 }].filter((product) => product.title.toLowerCase().includes(query.toLowerCase()));
  }
}
