import type { Order, CartItem } from '../../../packages/shared/src/types/ecommerce.js';

export class OrderService {
  async createOrder(userId: string, items: CartItem[], total: number): Promise<Order> {
    return {
      id: Math.random().toString(36).substring(7),
      userId,
      items,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }
}
