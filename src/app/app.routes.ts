import { Routes } from '@angular/router';

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
  { path: '**', redirectTo: '' },
];
