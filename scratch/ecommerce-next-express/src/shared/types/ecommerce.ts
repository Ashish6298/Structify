export interface Product { id: string; slug: string; title: string; price: number; currency: string; inventory: number; }
export interface CartItem { productId: string; quantity: number; }
export interface Order { id: string; status: 'draft' | 'pending' | 'paid' | 'fulfilled' | 'cancelled'; total: number; }
export interface UserProfile { id: string; email: string; role: 'customer' | 'admin'; }
