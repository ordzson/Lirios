import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const isLocalPreview =
    !supabase.configured &&
    _route.queryParamMap.get('preview') === '1' &&
    typeof location !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(location.hostname);

  if (isLocalPreview) {
    return true;
  }

  await auth.ready();

  return auth.isStaff()
    ? true
    : router.createUrlTree(['/admin/acceso'], { queryParams: { returnUrl: state.url } });
};
