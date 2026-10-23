import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { CATALOG_PRODUCTS, CatalogProduct } from './catalog-products';

@Injectable({ providedIn: 'root' })
export class CatalogDataService {
  constructor(private readonly supabase: SupabaseService) {}

  async loadProducts(): Promise<readonly CatalogProduct[]> {
    if (!this.supabase.client) {
      return CATALOG_PRODUCTS;
    }

    const { data, error } = await this.supabase.client
      .from('products')
      .select(
        'id, slug, name, category, colors, flower_types, price, currency, featured, sort_order, product_images(public_url, alt_text, sort_order)',
      )
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => {
      const fallback = CATALOG_PRODUCTS.find((product) => product.id === row.id);
      const primaryImage = [...(row.product_images ?? [])].sort(
        (left, right) => left.sort_order - right.sort_order,
      )[0];
      const image = primaryImage?.public_url ?? fallback?.image ?? '';

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: row.category,
        colors: row.colors,
        flowerTypes: row.flower_types,
        price: row.price === null ? null : Number(row.price),
        currency: row.currency,
        image,
        imageSrcset: primaryImage ? image : (fallback?.imageSrcset ?? image),
        imageAlt: primaryImage?.alt_text ?? fallback?.imageAlt ?? row.name,
        featured: row.featured,
        sortOrder: row.sort_order,
      } satisfies CatalogProduct;
    });
  }
}
