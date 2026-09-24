import { Injectable, computed, signal } from '@angular/core';

interface CartLine {
  productId: string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly lines = signal<CartLine[]>([]);

  readonly itemCount = computed(() =>
    this.lines().reduce((total, line) => total + line.quantity, 0),
  );

  add(productId: string, quantity: number): void {
    const safeQuantity = Math.max(1, Math.floor(quantity));

    this.lines.update((lines) => {
      const existing = lines.find((line) => line.productId === productId);

      if (!existing) {
        return [...lines, { productId, quantity: safeQuantity }];
      }

      return lines.map((line) =>
        line.productId === productId
          ? { ...line, quantity: line.quantity + safeQuantity }
          : line,
      );
    });
  }
}
