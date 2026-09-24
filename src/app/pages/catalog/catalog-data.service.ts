import { Injectable } from '@angular/core';
import { CATALOG_PRODUCTS, CatalogProduct } from './catalog-products';

@Injectable({ providedIn: 'root' })
export class CatalogDataService {
  loadProducts(): Promise<readonly CatalogProduct[]> {
    return Promise.resolve(CATALOG_PRODUCTS);
  }
}
