export function requireAdmin(role?: string) {
  if (role !== 'admin') throw new Error('FORBIDDEN');
}
