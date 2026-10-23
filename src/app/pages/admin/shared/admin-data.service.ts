import { Injectable } from '@angular/core';
import { AppRole, AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export type AdminSection = 'overview' | 'orders' | 'catalog' | 'team';
export type OrderStatus =
  | 'received'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';
export type ProductStatus = 'draft' | 'active' | 'archived';

export interface AdminOrderItem {
  readonly id: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number | null;
}

export interface AdminOrder {
  readonly id: string;
  readonly orderNumber: string;
  readonly status: OrderStatus;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail: string;
  readonly recipientName: string;
  readonly deliveryAddress: string;
  readonly municipality: string;
  readonly notes: string;
  readonly total: number | null;
  readonly createdAt: string;
  readonly items: readonly AdminOrderItem[];
}

export interface AdminProductImage {
  readonly id: string;
  readonly objectKey: string;
  readonly publicUrl: string;
  readonly altText: string;
  readonly sortOrder: number;
}

export interface AdminProduct {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'arrangement' | 'single-flower';
  readonly price: number | null;
  readonly inventory: number;
  readonly trackInventory: boolean;
  readonly status: ProductStatus;
  readonly featured: boolean;
  readonly sortOrder: number;
  readonly images: readonly AdminProductImage[];
}

export interface TeamMember {
  readonly id: string;
  readonly fullName: string;
  readonly role: AppRole | null;
  readonly createdAt: string;
}

export interface ProductDraft {
  readonly id?: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'arrangement' | 'single-flower';
  readonly price: number | null;
  readonly inventory: number;
  readonly trackInventory: boolean;
  readonly status: ProductStatus;
  readonly featured: boolean;
  readonly sortOrder: number;
}

interface UploadTicket {
  readonly uploadUrl: string;
  readonly publicUrl: string;
  readonly key: string;
}

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService,
  ) {}

  get previewMode(): boolean {
    return (
      !this.supabase.configured &&
      typeof location !== 'undefined' &&
      ['localhost', '127.0.0.1'].includes(location.hostname)
    );
  }

  async loadOrders(): Promise<readonly AdminOrder[]> {
    if (this.previewMode) return PREVIEW_ORDERS;
    const { data, error } = await this.supabase
      .requireClient()
      .from('orders')
      .select(
        'id, order_number, status, customer_name, customer_phone, customer_email, recipient_name, delivery_address, municipality, notes, total, created_at, order_items(id, product_name, quantity, unit_price)',
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status as OrderStatus,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      recipientName: row.recipient_name,
      deliveryAddress: row.delivery_address,
      municipality: row.municipality,
      notes: row.notes,
      total: row.total === null ? null : Number(row.total),
      createdAt: row.created_at,
      items: (row.order_items ?? []).map((item: Record<string, unknown>) => ({
        id: String(item['id']),
        productName: String(item['product_name']),
        quantity: Number(item['quantity']),
        unitPrice: item['unit_price'] === null ? null : Number(item['unit_price']),
      })),
    }));
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    if (this.previewMode) return;
    const { error } = await this.supabase
      .requireClient()
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    if (error) throw error;
  }

  async loadProducts(): Promise<readonly AdminProduct[]> {
    if (this.previewMode) return PREVIEW_PRODUCTS;
    const { data, error } = await this.supabase
      .requireClient()
      .from('products')
      .select(
        'id, slug, name, description, category, price, inventory, track_inventory, status, featured, sort_order, product_images(id, object_key, public_url, alt_text, sort_order)',
      )
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category as AdminProduct['category'],
      price: row.price === null ? null : Number(row.price),
      inventory: row.inventory,
      trackInventory: row.track_inventory,
      status: row.status as ProductStatus,
      featured: row.featured,
      sortOrder: row.sort_order,
      images: (row.product_images ?? [])
        .map((image: Record<string, unknown>) => ({
          id: String(image['id']),
          objectKey: String(image['object_key']),
          publicUrl: String(image['public_url']),
          altText: String(image['alt_text']),
          sortOrder: Number(image['sort_order']),
        }))
        .sort((left: AdminProductImage, right: AdminProductImage) => left.sortOrder - right.sortOrder),
    }));
  }

  async saveProduct(draft: ProductDraft): Promise<string> {
    if (this.previewMode) return draft.id ?? 'preview-new-product';
    const payload = {
      ...(draft.id ? { id: draft.id } : {}),
      slug: draft.slug,
      name: draft.name,
      description: draft.description,
      category: draft.category,
      price: draft.price,
      inventory: draft.inventory,
      track_inventory: draft.trackInventory,
      status: draft.status,
      featured: draft.featured,
      sort_order: draft.sortOrder,
    };
    const { data, error } = await this.supabase
      .requireClient()
      .from('products')
      .upsert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async uploadProductImage(productId: string, file: File, altText: string): Promise<void> {
    if (this.previewMode) {
      throw new Error('La carga a R2 se habilita al conectar las credenciales.');
    }
    const ticketResponse = await fetch('/api/uploads/sign', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${await this.auth.accessToken()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        productId,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    if (!ticketResponse.ok) {
      const failure = (await ticketResponse.json().catch(() => null)) as { error?: string } | null;
      throw new Error(failure?.error ?? 'No pudimos preparar la carga.');
    }

    const ticket = (await ticketResponse.json()) as UploadTicket;
    const uploadResponse = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('R2 rechazó la imagen. Revisa la política CORS del bucket.');
    }

    const { error } = await this.supabase.requireClient().from('product_images').insert({
      product_id: productId,
      object_key: ticket.key,
      public_url: ticket.publicUrl,
      alt_text: altText,
      sort_order: 0,
    });
    if (error) throw error;
  }

  async loadTeam(): Promise<readonly TeamMember[]> {
    if (this.previewMode) return PREVIEW_TEAM;
    const { data, error } = await this.supabase
      .requireClient()
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role as AppRole | null,
      createdAt: profile.created_at,
    }));
  }

  async updateRole(userId: string, role: AppRole): Promise<void> {
    if (this.previewMode) return;
    const { error } = await this.supabase
      .requireClient()
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    if (error) throw error;
  }
}

const PREVIEW_ORDERS: readonly AdminOrder[] = [
  {
    id: 'preview-order-1',
    orderNumber: 'LIR-20261003-K7QM',
    status: 'received',
    customerName: 'María López',
    customerPhone: '5555 0182',
    customerEmail: 'maria@example.com',
    recipientName: 'Andrea López',
    deliveryAddress: 'Zona 3, cerca del parque',
    municipality: 'Quetzaltenango',
    notes: 'Entregar después de las 15:00.',
    total: 145,
    createdAt: '2026-10-03T15:20:00.000Z',
    items: [{ id: 'preview-item-1', productName: 'Lirios carmesí', quantity: 1, unitPrice: 145 }],
  },
  {
    id: 'preview-order-2',
    orderNumber: 'LIR-20261003-P4HX',
    status: 'in_production',
    customerName: 'Carlos Méndez',
    customerPhone: '5555 6734',
    customerEmail: '',
    recipientName: 'Sofía Méndez',
    deliveryAddress: 'Zona 1, 4a calle',
    municipality: 'Quetzaltenango',
    notes: '',
    total: 210,
    createdAt: '2026-10-03T14:05:00.000Z',
    items: [{ id: 'preview-item-2', productName: 'Lirios y margaritas', quantity: 1, unitPrice: 210 }],
  },
  {
    id: 'preview-order-3',
    orderNumber: 'LIR-20261002-T9NW',
    status: 'ready',
    customerName: 'Ana Ruiz',
    customerPhone: '5555 4412',
    customerEmail: 'ana@example.com',
    recipientName: 'Ana Ruiz',
    deliveryAddress: 'Zona 7, Condominio Los Arcos',
    municipality: 'Quetzaltenango',
    notes: 'Llamar al llegar.',
    total: 260,
    createdAt: '2026-10-02T20:12:00.000Z',
    items: [{ id: 'preview-item-3', productName: 'Arreglo silvestre', quantity: 1, unitPrice: 260 }],
  },
];

const PREVIEW_PRODUCTS: readonly AdminProduct[] = [
  {
    id: 'arrangement-crimson-lilies', slug: 'lirios-carmesi', name: 'Lirios carmesí', description: '',
    category: 'arrangement', price: 145, inventory: 4, trackInventory: true, status: 'active', featured: true, sortOrder: 1,
    images: [{ id: 'preview-image-1', objectKey: 'legacy/lirios.webp', publicUrl: 'assets/pics/retouched/webp/arreglo_tier1-retouched-full.webp', altText: 'Arreglo de lirios carmesí', sortOrder: 0 }],
  },
  {
    id: 'arrangement-wildflowers', slug: 'arreglo-silvestre', name: 'Arreglo silvestre', description: '',
    category: 'arrangement', price: 260, inventory: 2, trackInventory: true, status: 'active', featured: false, sortOrder: 2,
    images: [{ id: 'preview-image-2', objectKey: 'legacy/silvestre.webp', publicUrl: 'assets/pics/retouched/webp/arreglo_tier3_3-retouched-full.webp', altText: 'Arreglo multicolor', sortOrder: 0 }],
  },
  {
    id: 'single-cherry-blossom', slug: 'flor-de-cerezo', name: 'Flor de cerezo', description: '',
    category: 'single-flower', price: 45, inventory: 1, trackInventory: true, status: 'draft', featured: false, sortOrder: 3,
    images: [{ id: 'preview-image-3', objectKey: 'legacy/cerezo.webp', publicUrl: 'assets/pics/retouched/webp/flor_individual_1-retouched-full.webp', altText: 'Rama de flores blancas', sortOrder: 0 }],
  },
];

const PREVIEW_TEAM: readonly TeamMember[] = [
  { id: 'preview-admin', fullName: 'Administración Dumish Blooms', role: 'admin', createdAt: '2026-10-01T12:00:00.000Z' },
];
