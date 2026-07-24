import type { UserProfile } from '../../../packages/shared/src/types/domain.js';

export class AuthService {
  async validateToken(token: string): Promise<UserProfile | null> {
    if (!token) return null;
    return {
      id: 'usr_1',
      email: 'customer@example.com',
      role: 'customer',
    };
  }
}
