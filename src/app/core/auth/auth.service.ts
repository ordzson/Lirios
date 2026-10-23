import { Injectable, computed, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

export type AppRole = 'admin' | 'manager';

export interface StaffProfile {
  readonly id: string;
  readonly fullName: string;
  readonly role: AppRole;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userState = signal<User | null>(null);
  private readonly profileState = signal<StaffProfile | null>(null);
  private readonly loadingState = signal(true);
  private initialization?: Promise<void>;

  readonly user = this.userState.asReadonly();
  readonly profile = this.profileState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly isStaff = computed(() => Boolean(this.profileState()));
  readonly isAdmin = computed(() => this.profileState()?.role === 'admin');

  constructor(private readonly supabase: SupabaseService) {
    if (!this.supabase.client) {
      this.loadingState.set(false);
      return;
    }

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.userState.set(session?.user ?? null);
      queueMicrotask(() => void this.loadProfile(session));
    });
  }

  ready(): Promise<void> {
    this.initialization ??= this.initialize();
    return this.initialization;
  }

  async signIn(email: string, password: string): Promise<void> {
    const client = this.supabase.requireClient();
    this.loadingState.set(true);
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      this.loadingState.set(false);
      throw error;
    }

    await this.loadProfile(data.session);
    if (!this.profileState()) {
      await client.auth.signOut();
      throw new Error('Tu cuenta existe, pero todavía no tiene acceso administrativo.');
    }
  }

  async signOut(): Promise<void> {
    if (this.supabase.client) {
      await this.supabase.client.auth.signOut();
    }
    this.userState.set(null);
    this.profileState.set(null);
  }

  async accessToken(): Promise<string> {
    const { data } = await this.supabase.requireClient().auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');
    }
    return accessToken;
  }

  private async initialize(): Promise<void> {
    if (!this.supabase.client) {
      this.loadingState.set(false);
      return;
    }

    const { data } = await this.supabase.client.auth.getSession();
    this.userState.set(data.session?.user ?? null);
    await this.loadProfile(data.session);
  }

  private async loadProfile(session: Session | null): Promise<void> {
    if (!session || !this.supabase.client) {
      this.profileState.set(null);
      this.loadingState.set(false);
      return;
    }

    this.userState.set(session.user);
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', session.user.id)
      .single();

    if (error || (data?.role !== 'admin' && data?.role !== 'manager')) {
      this.profileState.set(null);
    } else {
      this.profileState.set({ id: data.id, fullName: data.full_name, role: data.role });
    }
    this.loadingState.set(false);
  }
}
