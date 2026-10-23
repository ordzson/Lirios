import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { OrderRecord, OrderService } from '../../shared/orders/order.service';
import { OrderConfirmationComponent } from './order-confirmation.component';

const order: OrderRecord = {
  orderNumber: 'LIR-20261003-ABCD',
  createdAt: '2026-10-03T18:00:00.000Z',
  status: 'received',
  paymentMethod: 'cash-on-delivery',
  deliveryFee: null,
  subtotal: 145,
  total: 145,
  items: [
    {
      productId: 'arrangement-crimson-lilies',
      slug: 'lirios-carmesi',
      name: 'Lirios carmesí',
      quantity: 1,
      unitPrice: 145,
      lineSubtotal: 145,
      currency: 'GTQ',
      image: 'assets/pics/retouched/webp/arreglo_tier1-retouched-full.webp',
      imageAlt: 'Arreglo de lirios carmesí',
    },
  ],
  contact: { fullName: 'Ana López', phone: '5555 5555', email: 'ana@example.com' },
  delivery: {
    recipientName: 'María López',
    address: 'Zona 1, Quetzaltenango',
    municipality: 'Quetzaltenango',
    references: 'Portón negro',
    notes: '',
  },
};

describe('OrderConfirmationComponent', () => {
  async function render(foundOrder: OrderRecord | null) {
    await TestBed.configureTestingModule({
      imports: [OrderConfirmationComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ orderNumber: order.orderNumber }) },
          },
        },
        { provide: OrderService, useValue: { find: () => foundOrder } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OrderConfirmationComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the saved order, payment, delivery, and reusable number', async () => {
    const element = await render(order);
    const text = element.textContent ?? '';

    expect(text).toContain('Solicitud recibida.');
    expect(text).toContain(order.orderNumber);
    expect(text).toContain('Lirios carmesí');
    expect(text).toContain('Pago contraentrega');
    expect(text).toContain('Zona 1, Quetzaltenango');
  });

  it('shows a recoverable state when the order is absent in this browser', async () => {
    const element = await render(null);
    const text = element.textContent ?? '';

    expect(text).toContain('No encontramos esta solicitud.');
    expect(text).toContain('El pedido no está guardado en este navegador.');
    expect(text).toContain('Explorar catálogo');
  });
});
