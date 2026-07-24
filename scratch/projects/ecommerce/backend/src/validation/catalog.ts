export function validateProductSchema(input: any) {
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('Product name is required and must be a string');
  }
  if (typeof input.price !== 'number' || input.price < 0) {
    throw new Error('Product price must be a positive number');
  }
}
