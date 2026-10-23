import { BrandComponent } from '../../../shared/brand/brand.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  AdminDataService,
  AdminOrder,
  AdminProduct,
  AdminSection,
  OrderStatus,
  ProductDraft,
  ProductStatus,
  TeamMember,
} from '../shared/admin-data.service';

type ViewState = 'loading' | 'ready' | 'error';

const STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  received: 'Recibido',
  confirmed: 'Confirmado',
  in_production: 'En preparación',
  ready: 'Listo',
  out_for_delivery: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

@Component({
  selector: 'app-admin-dashboard',
  imports: [BrandComponent, DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  protected readonly data = inject(AdminDataService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);

  protected readonly section = signal<AdminSection>('overview');
  protected readonly state = signal<ViewState>('loading');
  protected readonly orders = signal<readonly AdminOrder[]>([]);
  protected readonly products = signal<readonly AdminProduct[]>([]);
  protected readonly team = signal<readonly TeamMember[]>([]);
  protected readonly orderSearch = signal('');
  protected readonly orderStatus = signal<OrderStatus | 'all'>('all');
  protected readonly selectedOrderId = signal<string | null>(null);
  protected readonly selectedProductId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly notice = signal('');
  protected readonly errorMessage = signal('');
  protected readonly uploadProgress = signal('');

  protected readonly orderStatuses = Object.entries(STATUS_LABELS) as [OrderStatus, string][];
  protected readonly filteredOrders = computed(() => {
    const query = this.orderSearch().trim().toLocaleLowerCase('es');
    const status = this.orderStatus();
    return this.orders().filter((order) => {
      const matchesStatus = status === 'all' || order.status === status;
      const matchesQuery =
        !query ||
        [order.orderNumber, order.customerName, order.recipientName, order.customerPhone]
          .join(' ')
          .toLocaleLowerCase('es')
          .includes(query);
      return matchesStatus && matchesQuery;
    });
  });
  protected readonly selectedOrder = computed(() =>
    this.orders().find((order) => order.id === this.selectedOrderId()) ?? null,
  );
  protected readonly selectedProduct = computed(() =>
    this.products().find((product) => product.id === this.selectedProductId()) ?? null,
  );
  protected readonly metrics = computed(() => ({
    received: this.orders().filter((order) => order.status === 'received').length,
    production: this.orders().filter((order) => order.status === 'in_production').length,
    ready: this.orders().filter((order) => order.status === 'ready').length,
    lowStock: this.products().filter(
      (product) => product.trackInventory && product.inventory <= 2 && product.status === 'active',
    ).length,
  }));
  protected readonly activeOrders = computed(() =>
    this.orders()
      .filter((order) => !['delivered', 'cancelled'].includes(order.status))
      .slice(0, 6),
  );
  protected readonly lowStockProducts = computed(() =>
    this.products()
      .filter((product) => product.trackInventory && product.inventory <= 2)
      .slice(0, 5),
  );

  protected readonly productForm = this.formBuilder.group({
    id: this.formBuilder.nonNullable.control(''),
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    slug: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    ]),
    description: this.formBuilder.nonNullable.control('', [Validators.maxLength(500)]),
    category: this.formBuilder.nonNullable.control<'arrangement' | 'single-flower'>('arrangement'),
    price: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    inventory: this.formBuilder.nonNullable.control(0, [Validators.min(0)]),
    trackInventory: this.formBuilder.nonNullable.control(true),
    status: this.formBuilder.nonNullable.control<ProductStatus>('draft'),
    featured: this.formBuilder.nonNullable.control(false),
    sortOrder: this.formBuilder.nonNullable.control(0),
    imageAlt: this.formBuilder.nonNullable.control('', [Validators.maxLength(180)]),
  });

  async ngOnInit(): Promise<void> {
    const requestedSection = this.route.snapshot.queryParamMap.get('section');
    if (requestedSection && ['overview', 'orders', 'catalog', 'team'].includes(requestedSection)) {
      this.section.set(requestedSection as AdminSection);
    }
    await this.load();
  }

  protected setSection(section: AdminSection): void {
    this.section.set(section);
    this.notice.set('');
    this.errorMessage.set('');
  }

  protected statusLabel(status: OrderStatus): string {
    return STATUS_LABELS[status];
  }

  protected setSearch(event: Event): void {
    this.orderSearch.set((event.target as HTMLInputElement).value);
  }

  protected setStatusFilter(event: Event): void {
    this.orderStatus.set((event.target as HTMLSelectElement).value as OrderStatus | 'all');
  }

  protected selectOrder(order: AdminOrder): void {
    this.selectedOrderId.set(order.id);
  }

  protected async changeOrderStatus(order: AdminOrder, event: Event): Promise<void> {
    const status = (event.target as HTMLSelectElement).value as OrderStatus;
    if (status === order.status) return;
    this.saving.set(true);
    this.errorMessage.set('');
    try {
      await this.data.updateOrderStatus(order.id, status);
      this.orders.update((orders) =>
        orders.map((candidate) => (candidate.id === order.id ? { ...candidate, status } : candidate)),
      );
      this.notice.set(`${order.orderNumber} ahora está ${STATUS_LABELS[status].toLocaleLowerCase('es')}.`);
    } catch {
      this.errorMessage.set('No pudimos cambiar el estado. Recarga los datos e inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  protected createProduct(): void {
    this.selectedProductId.set('new');
    this.productForm.reset({
      id: '',
      name: '',
      slug: '',
      description: '',
      category: 'arrangement',
      price: null,
      inventory: 0,
      trackInventory: true,
      status: 'draft',
      featured: false,
      sortOrder: this.products().length + 1,
      imageAlt: '',
    });
  }

  protected editProduct(product: AdminProduct): void {
    this.selectedProductId.set(product.id);
    this.productForm.reset({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      price: product.price,
      inventory: product.inventory,
      trackInventory: product.trackInventory,
      status: product.status,
      featured: product.featured,
      sortOrder: product.sortOrder,
      imageAlt: product.images[0]?.altText ?? '',
    });
  }

  protected makeSlug(): void {
    if (this.productForm.controls.slug.dirty) return;
    const slug = this.productForm.controls.name.value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    this.productForm.controls.slug.setValue(slug);
  }

  protected async saveProduct(): Promise<void> {
    this.notice.set('');
    this.errorMessage.set('');
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.errorMessage.set('Revisa el nombre, la dirección, el precio y el inventario antes de guardar.');
      return;
    }

    this.saving.set(true);
    try {
      const values = this.productForm.getRawValue();
      const draft: ProductDraft = {
        ...(values.id ? { id: values.id } : {}),
        slug: values.slug.trim(),
        name: values.name.trim(),
        description: values.description.trim(),
        category: values.category,
        price: values.price,
        inventory: values.inventory,
        trackInventory: values.trackInventory,
        status: values.status,
        featured: values.featured,
        sortOrder: values.sortOrder,
      };
      const productId = await this.data.saveProduct(draft);
      this.selectedProductId.set(productId);
      this.notice.set('Producto guardado. Los cambios ya están disponibles en Supabase.');
      this.products.set(await this.data.loadProducts());
      const saved = this.products().find((product) => product.id === productId);
      if (saved) this.editProduct(saved);
    } catch {
      this.errorMessage.set('No pudimos guardar el producto. Revisa que el slug no esté repetido.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async uploadImage(event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    const productId = this.productForm.controls.id.value;
    if (!file || !productId) {
      this.errorMessage.set('Guarda el producto antes de subir una fotografía.');
      fileInput.value = '';
      return;
    }

    this.uploadProgress.set('Subiendo fotografía…');
    this.errorMessage.set('');
    try {
      await this.data.uploadProductImage(
        productId,
        file,
        this.productForm.controls.imageAlt.value.trim() || this.productForm.controls.name.value,
      );
      this.products.set(await this.data.loadProducts());
      const updated = this.products().find((product) => product.id === productId);
      if (updated) this.editProduct(updated);
      this.uploadProgress.set('Fotografía lista y vinculada al producto.');
    } catch (error) {
      this.uploadProgress.set('');
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No pudimos subir la fotografía.',
      );
    } finally {
      fileInput.value = '';
    }
  }

  protected async changeRole(member: TeamMember, event: Event): Promise<void> {
    const role = (event.target as HTMLSelectElement).value as 'admin' | 'manager';
    this.saving.set(true);
    this.errorMessage.set('');
    try {
      await this.data.updateRole(member.id, role);
      this.team.update((members) =>
        members.map((candidate) => (candidate.id === member.id ? { ...candidate, role } : candidate)),
      );
      this.notice.set(`Permisos actualizados para ${member.fullName || 'la cuenta'}.`);
    } catch {
      this.errorMessage.set('No pudimos actualizar el rol. Solo una cuenta administradora puede hacerlo.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/admin/acceso']);
  }

  protected async retry(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set('');
    try {
      const [orders, products, team] = await Promise.all([
        this.data.loadOrders(),
        this.data.loadProducts(),
        this.auth.isAdmin() || this.data.previewMode ? this.data.loadTeam() : Promise.resolve([]),
      ]);
      this.orders.set(orders);
      this.products.set(products);
      this.team.set(team);
      const showSplitView =
        typeof matchMedia === 'undefined' || matchMedia('(min-width: 56.01rem)').matches;
      this.selectedOrderId.set(showSplitView ? (orders[0]?.id ?? null) : null);
      this.state.set('ready');
    } catch {
      this.state.set('error');
      this.errorMessage.set('No pudimos cargar la mesa de trabajo. Comprueba Supabase y vuelve a intentar.');
    }
  }
}
