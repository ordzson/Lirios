import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './env.js';

export type StaffRole = 'admin' | 'manager';

export async function requireStaff(request: Request): Promise<{
  readonly userId: string;
  readonly role: StaffRole;
}> {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (!accessToken) {
    throw new Response('No autorizado.', { status: 401 });
  }

  const supabase = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw new Response('Sesión inválida o vencida.', { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (profileError || (profile?.role !== 'admin' && profile?.role !== 'manager')) {
    throw new Response('No tienes permisos administrativos.', { status: 403 });
  }

  return { userId: userData.user.id, role: profile.role };
}
