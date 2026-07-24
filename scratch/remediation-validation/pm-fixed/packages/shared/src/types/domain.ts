export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  rating: number;
  inventory: number;
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: 'customer' | 'admin';
}
