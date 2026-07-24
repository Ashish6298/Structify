export function validateEntity(input: any) {
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('A valid entity name is required');
  }
  if (typeof input.price !== 'number' || input.price < 0) {
    throw new Error('Entity values must be valid');
  }
}
