import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

export class SupabaseClientFactory {
  private adminClient: SupabaseClient | null = null;

  constructor(
    private readonly url: string = env.supabaseUrl,
    private readonly anonKey: string = env.supabaseAnonKey,
    private readonly serviceRoleKey: string = env.supabaseServiceRoleKey,
  ) {}

  createClient(accessToken?: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    });
  }

  getAdmin(): SupabaseClient {
    if (!this.adminClient) {
      this.adminClient = createClient(this.url, this.serviceRoleKey);
    }
    return this.adminClient;
  }

  /** Alias for getAdmin() — service role client that bypasses RLS */
  createServiceClient(): SupabaseClient {
    return this.getAdmin();
  }

  /** Alias for getAdmin() — used when calling auth.admin methods */
  createAdminClient(): SupabaseClient {
    return this.getAdmin();
  }
}
