import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { readRuntimeConfig } from '../config/runtime-config';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly config = readRuntimeConfig();
  readonly configured = Boolean(this.config.supabaseUrl && this.config.supabasePublishableKey);
  readonly client: SupabaseClient | null = this.configured
    ? createClient(this.config.supabaseUrl, this.config.supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

  requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase no está configurado.');
    }

    return this.client;
  }
}
