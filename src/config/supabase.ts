import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './index';

let supabase: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;

// Only create clients if configuration is provided
if (config.supabase.url && config.supabase.anonKey) {
  // Client for regular operations
  supabase = createClient(
    config.supabase.url,
    config.supabase.anonKey
  );

  // Admin client for service-level operations
  supabaseAdmin = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey || config.supabase.anonKey
  );
} else {
  console.warn('⚠️ Supabase configuration not provided. Database features will be disabled.');
}

export { supabase, supabaseAdmin };
