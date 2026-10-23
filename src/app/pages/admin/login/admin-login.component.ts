import { BrandComponent } from '../../../shared/brand/brand.component';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Component({
  selector: 'app-admin-login',
  imports: [BrandComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
})
export class AdminLoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly supabase = inject(SupabaseService);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected async submit(): Promise<void> {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revisa tu correo y contraseña para continuar.');
      return;
    }

    this.submitting.set(true);
    try {
      const values = this.form.getRawValue();
      await this.auth.signIn(values.email.trim(), values.password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl?.startsWith('/admin') ? returnUrl : '/admin');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error && error.message.includes('acceso administrativo')
          ? error.message
          : 'No pudimos iniciar sesión. Comprueba los datos o restablece la contraseña en Supabase.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
