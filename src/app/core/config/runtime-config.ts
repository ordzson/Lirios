export interface LiriosRuntimeConfig {
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
}

declare global {
  interface Window {
    __LIRIOS_CONFIG__?: Partial<LiriosRuntimeConfig>;
  }
}

const EMPTY_CONFIG: LiriosRuntimeConfig = {
  supabaseUrl: '',
  supabasePublishableKey: '',
};

export function readRuntimeConfig(): LiriosRuntimeConfig {
  if (typeof window === 'undefined') {
    return EMPTY_CONFIG;
  }

  return {
    supabaseUrl: window.__LIRIOS_CONFIG__?.supabaseUrl?.trim() ?? '',
    supabasePublishableKey: window.__LIRIOS_CONFIG__?.supabasePublishableKey?.trim() ?? '',
  };
}
