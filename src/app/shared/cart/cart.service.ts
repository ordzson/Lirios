import { Injectable, computed, signal } from '@angular/core';

export interface CartLine {
  readonly productId: string;
  readonly quantity: number;
}

const CART_STORAGE_KEY = 'lirios:cart:v1';
const MAX_QUANTITY = 99;

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly persistenceMessage = signal('');
  private readonly state = signal<CartLine[]>(this.load());

  readonly lines = this.state.asReadonly();
  readonly storageError = this.persistenceMessage.asReadonly();
  readonly itemCount = computed(() =>
    this.state().reduce((total, line) => total + line.quantity, 0),
  );

  add(productId: string, quantity: number): void {
    const safeQuantity = this.safeQuantity(quantity);
    const existing = this.state().find((line) => line.productId === productId);

    this.commit(
      existing
        ? this.state().map((line) =>
            line.productId === productId
              ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + safeQuantity) }
              : line,
          )
        : [...this.state(), { productId, quantity: safeQuantity }],
    );
  }

  increase(productId: string): void {
    const line = this.state().find((candidate) => candidate.productId === productId);
    if (line) {
      this.setQuantity(productId, line.quantity + 1);
    }
  }

  decrease(productId: string): void {
    const line = this.state().find((candidate) => candidate.productId === productId);
    if (line && line.quantity > 1) {
      this.setQuantity(productId, line.quantity - 1);
    }
  }

  setQuantity(productId: string, quantity: number): void {
    const safeQuantity = this.safeQuantity(quantity);
    this.commit(
      this.state().map((line) =>
        line.productId === productId ? { ...line, quantity: safeQuantity } : line,
      ),
    );
  }

  remove(productId: string): void {
    this.commit(this.state().filter((line) => line.productId !== productId));
  }

  clear(): void {
    this.commit([]);
  }

  retryPersistence(): void {
    this.persist(this.state());
  }

  private safeQuantity(quantity: number): number {
    if (!Number.isFinite(quantity)) {
      return 1;
    }

    return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
  }

  private commit(lines: CartLine[]): void {
    this.state.set(lines);
    this.persist(lines);
  }

  private load(): CartLine[] {
    const storage = this.storage();
    if (!storage) {
      return [];
    }

    try {
      const raw = storage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid cart');
      }

      return parsed
        .filter(
          (line): line is CartLine =>
            typeof line === 'object' &&
            line !== null &&
            typeof (line as CartLine).productId === 'string' &&
            Number.isFinite((line as CartLine).quantity),
        )
        .map((line) => ({
          productId: line.productId,
          quantity: this.safeQuantity(line.quantity),
        }));
    } catch {
      this.persistenceMessage.set(
        'No pudimos recuperar el carrito guardado. Puedes comenzar uno nuevo.',
      );
      return [];
    }
  }

  private persist(lines: readonly CartLine[]): void {
    const storage = this.storage();
    if (!storage) {
      this.persistenceMessage.set(
        'El carrito se conservará solo durante esta visita porque el almacenamiento está desactivado.',
      );
      return;
    }

    try {
      storage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
      this.persistenceMessage.set('');
    } catch {
      this.persistenceMessage.set(
        'No pudimos guardar el carrito para la próxima recarga. Revisa el espacio del navegador e inténtalo de nuevo.',
      );
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
