import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((module) => module.HomeComponent),
  },
  {
    path: 'catalogo',
    loadComponent: () =>
      import('./pages/catalog/catalog.component').then((module) => module.CatalogComponent),
  },
  {
    path: 'catalogo/:slug',
    loadComponent: () =>
      import('./pages/catalog/catalog.component').then((module) => module.CatalogComponent),
  },
  {
    path: 'personalizados',
    loadComponent: () =>
      import('./pages/custom-arrangements/custom-arrangements.component').then(
        (module) => module.CustomArrangementsComponent,
      ),
  },
  {
    path: 'carrito',
    loadComponent: () =>
      import('./pages/cart/cart.component').then((module) => module.CartComponent),
  },
  {
    path: 'pedido/:orderNumber',
    loadComponent: () =>
      import('./pages/order-confirmation/order-confirmation.component').then(
        (module) => module.OrderConfirmationComponent,
      ),
  },
  {
    path: 'admin/acceso',
    loadComponent: () =>
      import('./pages/admin/login/admin-login.component').then(
        (module) => module.AdminLoginComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/dashboard/admin-dashboard.component').then(
        (module) => module.AdminDashboardComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
