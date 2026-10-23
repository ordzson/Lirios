import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';

export interface OrderItem {
  readonly productId: string;
  readonly slug: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number | null;
  readonly lineSubtotal: number | null;
  readonly currency: 'GTQ';
  readonly image: string;
  readonly imageAlt: string;
}

export interface OrderContact {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
}

export interface OrderDelivery {
  readonly recipientName: string;
  readonly address: string;
  readonly municipality: string;
  readonly references: string;
  readonly notes: string;
}

export interface CreateOrderInput {
  readonly items: readonly OrderItem[];
  readonly subtotal: number | null;
  readonly contact: OrderContact;
  readonly delivery: OrderDelivery;
}

export interface OrderRecord extends CreateOrderInput {
  readonly orderNumber: string;
  readonly createdAt: string;
  readonly status: 'received';
  readonly paymentMethod: 'cash-on-delivery';
  readonly deliveryFee: null;
  readonly total: number | null;
}

export type TrackedOrderStatus =
  | 'received'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface TrackedOrder {
  readonly orderNumber: string;
  readonly status: TrackedOrderStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly total: number | null;
}

const ORDERS_STORAGE_KEY = 'lirios:orders:v1';
const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class OrderStorageError extends Error {
  constructor() {
    super('No fue posible guardar el pedido en este navegador.');
    this.name = 'OrderStorageError';
  }
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly state = signal<readonly OrderRecord[]>(this.load());
  readonly orders = this.state.asReadonly();

  constructor(private readonly supabase: SupabaseService) {}

  async create(input: CreateOrderInput): Promise<OrderRecord> {
    if (this.supabase.client) {
      const { data, error } = await this.supabase.client.rpc('create_order', {
        p_payload: {
          items: input.items,
          contact: input.contact,
          delivery: input.delivery,
          paymentMethod: 'cash-on-delivery',
        },
      });

      if (error) {
        throw error;
      }

      const response = data as {
        orderNumber: string;
        createdAt: string;
        status: 'received';
        paymentMethod: 'cash-on-delivery';
        deliveryFee: null;
        total: number | null;
      };
      const order: OrderRecord = {
        ...input,
        orderNumber: response.orderNumber,
        createdAt: response.createdAt,
        status: response.status,
        paymentMethod: response.paymentMethod,
        deliveryFee: response.deliveryFee,
        total: response.total,
      };
      this.state.update((orders) => [order, ...orders].slice(0, 25));
      return order;
    }

    const order: OrderRecord = {
      ...input,
      items: input.items.map((item) => ({ ...item })),
      contact: { ...input.contact },
      delivery: { ...input.delivery },
      orderNumber: this.createOrderNumber(),
      createdAt: new Date().toISOString(),
      status: 'received',
      paymentMethod: 'cash-on-delivery',
      deliveryFee: null,
      total: input.subtotal,
    };

    const nextOrders = [order, ...this.state()].slice(0, 25);
    const storage = this.storage();

    if (!storage) {
      throw new OrderStorageError();
    }

    try {
      storage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(nextOrders));
    } catch {
      throw new OrderStorageError();
    }

    this.state.set(nextOrders);
    return order;
  }

  async track(orderNumber: string): Promise<TrackedOrder | null> {
    if (!this.supabase.client) {
      if (orderNumber === 'LIR-2048') {
        return {
          orderNumber,
          status: 'in_production',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          total: null,
        };
      }
      return null;
    }

    const { data, error } = await this.supabase.client.rpc('track_order', {
      p_order_number: orderNumber,
    });
    if (error) throw error;
    if (!data) return null;
    return data as TrackedOrder;
  }

  find(orderNumber: string): OrderRecord | null {
    return this.state().find((order) => order.orderNumber === orderNumber) ?? null;
  }

  private createOrderNumber(): string {
    const date = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Guatemala',
    })
      .format(new Date())
      .replaceAll('-', '');

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const suffix = this.randomSuffix();
      const candidate = `LIR-${date}-${suffix}`;
      if (!this.state().some((order) => order.orderNumber === candidate)) {
        return candidate;
      }
    }

    return `LIR-${date}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  private randomSuffix(): string {
    const bytes = new Uint8Array(4);

    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }

    return Array.from(bytes, (value) => ORDER_ALPHABET[value % ORDER_ALPHABET.length]).join('');
  }

  private load(): readonly OrderRecord[] {
    const storage = this.storage();
    if (!storage) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(storage.getItem(ORDERS_STORAGE_KEY) ?? '[]');
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (order): order is OrderRecord =>
          typeof order === 'object' &&
          order !== null &&
          typeof (order as OrderRecord).orderNumber === 'string' &&
          Array.isArray((order as OrderRecord).items),
      );
    } catch {
      return [];
    }
  }

  private storage(): Storage | null {
    try {
      return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
      return null;
    }
  }
}
