import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartService } from '../../shared/cart/cart.service';
import { OrderService } from '../../shared/orders/order.service';
import { CatalogDataService } from '../catalog/catalog-data.service';
import { CATALOG_PRODUCTS } from '../catalog/catalog-products';
import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function setup(orderService: { create: ReturnType<typeof vi.fn> }) {
    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        provideRouter([]),
        {
          provide: CatalogDataService,
          useValue: { loadProducts: () => Promise.resolve(CATALOG_PRODUCTS) },
        },
        { provide: OrderService, useValue: orderService },
      ],
    }).compileComponents();

    const cart = TestBed.inject(CartService);
    cart.add(CATALOG_PRODUCTS[0].id, 1);
    const fixture = TestBed.createComponent(CartComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, cart };
  }

  it('marks required fields and explains how to recover from invalid input', async () => {
    const create = vi.fn();
    const { fixture } = await setup({ create });

    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Revisa los campos marcados antes de confirmar el pedido.');
    expect(text).toContain('Escribe tu nombre completo.');
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps the cart and entered data when order persistence fails', async () => {
    const create = vi.fn().mockRejectedValue(new Error('storage unavailable'));
    const { fixture, cart } = await setup({ create });
    const component = fixture.componentInstance as any;

    component.checkoutForm.setValue({
      fullName: 'Ana López',
      phone: '5555 5555',
      email: 'ana@example.com',
      recipientName: 'María López',
      address: 'Zona 1, Quetzaltenango',
      municipality: 'Quetzaltenango',
      references: 'Portón negro',
      notes: 'Llamar al llegar',
    });

    await component.submitOrder();
    fixture.detectChanges();

    expect(create).toHaveBeenCalledOnce();
    expect(cart.lines()).toHaveLength(1);
    expect(component.checkoutForm.controls.fullName.value).toBe('Ana López');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Tu carrito y tus datos siguen aquí',
    );
  });
});
