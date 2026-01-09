import { createClient } from '@supabase/supabase-js';
import { config } from './index';

// Client for regular operations
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Admin client for service-level operations
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey || config.supabase.anonKey
);
