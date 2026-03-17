import { config } from 'dotenv';

config({ override: true });

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  authHashSecret: process.env.AUTH_HASH_SECRET || '',
};
