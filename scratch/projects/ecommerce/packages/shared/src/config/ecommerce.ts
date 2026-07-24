export const ecommerceConfig = {
  currency: 'USD',
  checkoutEnabled: true,
  taxRate: 0.08,
  shippingMethods: [
    { id: 'standard', name: 'Standard Shipping', cost: 0 },
    { id: 'express', name: 'Express Shipping', cost: 15 },
  ],
} as const;
