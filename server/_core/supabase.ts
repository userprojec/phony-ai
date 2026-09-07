import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env.js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key must be configured');
    }
    supabaseClient = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey);
  }
  return supabaseClient;
}
