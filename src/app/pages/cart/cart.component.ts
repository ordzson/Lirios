import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CatalogDataService } from '../catalog/catalog-data.service';
import { CatalogProduct } from '../catalog/catalog-products';
import { CartService } from '../../shared/cart/cart.service';
import { OrderItem, OrderService } from '../../shared/orders/order.service';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';

type LoadState = 'loading' | 'ready' | 'error';
type FlowStep = 'cart' | 'contact' | 'delivery' | 'confirm';

interface CartDisplayLine {
  readonly productId: string;
  readonly quantity: number;
  readonly product: CatalogProduct | null;
  readonly lineSubtotal: number | null;
}

@Component({
  selector: 'app-cart',
  imports: [ReactiveFormsModule, RouterLink, SiteHeaderComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent implements AfterViewInit {
  private readonly catalogData = inject(CatalogDataService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly cart = inject(CartService);
  protected readonly products = signal<readonly CatalogProduct[]>([]);
  protected readonly loadState = signal<LoadState>('loading');
  protected readonly activeStep = signal<FlowStep>('cart');
  protected readonly submitting = signal(false);
  protected readonly orderError = signal('');
  protected readonly validationMessage = signal('');

  protected readonly checkoutForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    phone: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?:\+?502[\s-]?)?\d{4}[\s-]?\d{4}$/),
      ],
    ],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    recipientName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    address: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(180)]],
    municipality: ['Quetzaltenango', [Validators.required]],
    references: ['', [Validators.maxLength(180)]],
    notes: ['', [Validators.maxLength(240)]],
  });

  protected readonly lines = computed<CartDisplayLine[]>(() => {
    const productsById = new Map(this.products().map((product) => [product.id, product]));

    return this.cart.lines().map((line) => {
      const product = productsById.get(line.productId) ?? null;
      return {
        ...line,
        product,
        lineSubtotal: product?.price === null || !product ? null : product.price * line.quantity,
      };
    });
  });

  protected readonly hasUnavailableLines = computed(() =>
    this.lines().some((line) => !line.product),
  );

  protected readonly subtotal = computed<number | null>(() => {
    const lines = this.lines();
    if (!lines.length || lines.some((line) => line.lineSubtotal === null)) {
      return null;
    }

    return lines.reduce((total, line) => total + (line.lineSubtotal ?? 0), 0);
  });

  constructor() {
    void this.loadProducts();
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        const step = visible?.target.getAttribute('data-flow-step') as FlowStep | null;
        if (step) {
          this.activeStep.set(step);
        }
      },
      { rootMargin: '-18% 0px -64% 0px', threshold: [0, 0.25, 0.6] },
    );

    setTimeout(() => {
      this.document
        .querySelectorAll<HTMLElement>('[data-flow-step]')
        .forEach((section) => observer.observe(section));
    });

    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  protected increase(productId: string): void {
    this.cart.increase(productId);
  }

  protected decrease(productId: string): void {
    this.cart.decrease(productId);
  }

  protected remove(productId: string): void {
    this.cart.remove(productId);
  }

  protected retryCatalog(): void {
    void this.loadProducts();
  }

  protected formatPrice(value: number | null): string {
    if (value === null) {
      return 'Por confirmar';
    }

    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      maximumFractionDigits: 2,
    }).format(value);
  }

  protected checkoutImage(product: CatalogProduct): string {
    if (product.id === 'arrangement-crimson-lilies') {
      return 'assets/plates/product-one-photo.png';
    }

    if (product.id === 'arrangement-golden-gerberas') {
      return 'assets/plates/product-two-photo.png';
    }

    return product.image;
  }

  protected async submitOrder(): Promise<void> {
    this.orderError.set('');
    this.validationMessage.set('');

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.validationMessage.set('Revisa los campos marcados antes de confirmar el pedido.');
      setTimeout(() =>
        this.document.querySelector<HTMLElement>('.field [aria-invalid="true"]')?.focus(),
      );
      return;
    }

    const availableLines = this.lines().filter(
      (line): line is CartDisplayLine & { product: CatalogProduct } => Boolean(line.product),
    );

    if (!availableLines.length || this.hasUnavailableLines()) {
      this.orderError.set(
        'Hay una pieza que ya no está disponible. Elimínala del carrito para continuar.',
      );
      return;
    }

    this.submitting.set(true);
    const values = this.checkoutForm.getRawValue();
    const items: OrderItem[] = availableLines.map((line) => ({
      productId: line.product.id,
      slug: line.product.slug,
      name: line.product.name,
      quantity: line.quantity,
      unitPrice: line.product.price,
      lineSubtotal: line.lineSubtotal,
      currency: line.product.currency,
      image: line.product.image,
      imageAlt: line.product.imageAlt,
    }));

    try {
      const order = await this.orderService.create({
        items,
        subtotal: this.subtotal(),
        contact: {
          fullName: values.fullName.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
        },
        delivery: {
          recipientName: values.recipientName.trim(),
          address: values.address.trim(),
          municipality: values.municipality.trim(),
          references: values.references.trim(),
          notes: values.notes.trim(),
        },
      });

      this.cart.clear();
      await this.router.navigate(['/pedido', order.orderNumber]);
    } catch {
      this.orderError.set(
        'No pudimos guardar el pedido. Tu carrito y tus datos siguen aquí; inténtalo de nuevo.',
      );
      setTimeout(() => this.document.querySelector<HTMLElement>('#order-error')?.focus());
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadProducts(): Promise<void> {
    this.loadState.set('loading');

    try {
      this.products.set(await this.catalogData.loadProducts());
      this.loadState.set('ready');
    } catch {
      this.products.set([]);
      this.loadState.set('error');
    }
  }
}
