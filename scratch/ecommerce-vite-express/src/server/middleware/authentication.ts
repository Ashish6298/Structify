export interface AuthenticatedRequestContext { userId?: string; role?: 'customer' | 'admin'; }

export function requireAuthenticatedUser(context: AuthenticatedRequestContext) {
  if (!context.userId) throw new Error('UNAUTHENTICATED');
  return context.userId;
}
