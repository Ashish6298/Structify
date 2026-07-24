export const platformConfig = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
  environment: process.env.NODE_ENV || 'development',
} as const;
