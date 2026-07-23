import type { Order } from '../../shared/types/ecommerce.js';

export class OrderService {
  async createCheckoutPlaceholder(): Promise<Order> {
    return { id: 'order_pending', status: 'draft', total: 0 };
  }
}
