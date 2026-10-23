import { TestBed } from '@angular/core/testing';
import { CreateOrderInput, OrderService, OrderStorageError } from './order.service';

const ORDERS_STORAGE_KEY = 'lirios:orders:v1';

const input: CreateOrderInput = {
  items: [
    {
      productId: 'arrangement-crimson-lilies',
      slug: 'lirios-carmesi',
      name: 'Lirios carmesí',
      quantity: 1,
      unitPrice: 145,
      lineSubtotal: 145,
      currency: 'GTQ',
      image: 'assets/pics/lirios.webp',
      imageAlt: 'Arreglo de lirios carmesí',
    },
  ],
  subtotal: 145,
  contact: { fullName: 'Ana López', phone: '5555 5555', email: 'ana@example.com' },
  delivery: {
    recipientName: 'Ana López',
    address: 'Zona 1, Quetzaltenango',
    municipality: 'Quetzaltenango',
    references: '',
    notes: '',
  },
};

describe('OrderService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('creates, persists, and retrieves an order with a reusable number', async () => {
    const orders = TestBed.inject(OrderService);

    const created = await orders.create(input);

    expect(created.orderNumber).toMatch(/^LIR-\d{8}-[A-Z2-9]{4}$/);
    expect(created.paymentMethod).toBe('cash-on-delivery');
    expect(created.deliveryFee).toBeNull();
    expect(orders.find(created.orderNumber)).toEqual(created);

    const persisted = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) ?? '[]');
    expect(persisted[0].orderNumber).toBe(created.orderNumber);
  });

  it('does not publish an order when browser storage fails', async () => {
    const orders = TestBed.inject(OrderService);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    await expect(orders.create(input)).rejects.toBeInstanceOf(OrderStorageError);
    expect(orders.orders()).toEqual([]);
  });
});
