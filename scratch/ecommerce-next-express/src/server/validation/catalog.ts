export function validateProductInput(input: { title?: string; price?: number }) {
  if (!input.title?.trim()) throw new Error('Product title is required.');
  if (!Number.isInteger(input.price) || input.price < 0) throw new Error('Price must be a non-negative integer in minor units.');
}
