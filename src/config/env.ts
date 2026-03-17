import { config } from 'dotenv';

config();

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  authHashSecret: process.env.AUTH_HASH_SECRET || '',
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    redirectUri: process.env.TIKTOK_REDIRECT_URI || '',
  },
};
