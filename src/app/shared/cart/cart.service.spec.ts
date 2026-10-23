import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';

const CART_STORAGE_KEY = 'lirios:cart:v1';

describe('CartService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists added lines and restores them in a new instance', () => {
    const cart = TestBed.inject(CartService);

    cart.add('arrangement-crimson-lilies', 2);

    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]')).toEqual([
      { productId: 'arrangement-crimson-lilies', quantity: 2 },
    ]);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(CartService).lines()).toEqual([
      { productId: 'arrangement-crimson-lilies', quantity: 2 },
    ]);
  });

  it('increments, decrements without crossing one, and removes a line', () => {
    const cart = TestBed.inject(CartService);

    cart.add('arrangement-golden-gerberas', 1);
    cart.increase('arrangement-golden-gerberas');
    expect(cart.lines()[0].quantity).toBe(2);

    cart.decrease('arrangement-golden-gerberas');
    cart.decrease('arrangement-golden-gerberas');
    expect(cart.lines()[0].quantity).toBe(1);

    cart.remove('arrangement-golden-gerberas');
    expect(cart.lines()).toEqual([]);
  });

  it('recovers from corrupted persisted data with an actionable message', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{invalid json');

    const cart = TestBed.inject(CartService);

    expect(cart.lines()).toEqual([]);
    expect(cart.storageError()).toContain('No pudimos recuperar el carrito guardado');
  });
});
