import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  WritableSignal,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartService } from '../../shared/cart/cart.service';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import {
  CatalogColor,
  CatalogProduct,
  FlowerType,
  ProductCategory,
} from './catalog-products';
import { CatalogDataService } from './catalog-data.service';

type CategoryFilter = 'todos' | 'arreglos' | 'flores';
type SortMode = 'recommended' | 'name' | 'price-asc' | 'price-desc';

const SORT_PARAMS: Readonly<Record<Exclude<SortMode, 'recommended'>, string>> = {
  name: 'nombre',
  'price-asc': 'precio-asc',
  'price-desc': 'precio-desc',
};
type LoadState = 'loading' | 'ready' | 'error';

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

const COLOR_LABELS: Readonly<Record<CatalogColor, string>> = {
  rojo: 'Rojo',
  rosado: 'Rosado',
  amarillo: 'Amarillo',
  blanco: 'Blanco',
  morado: 'Morado',
};

const FLOWER_LABELS: Readonly<Record<FlowerType, string>> = {
  lirio: 'Lirio',
  gerbera: 'Gerbera',
  margarita: 'Margarita',
  'flor-de-cerezo': 'Flor de cerezo',
};

@Component({
  selector: 'app-catalog',
  imports: [RouterLink, SiteHeaderComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
})
export class CatalogComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalogData = inject(CatalogDataService);
  protected readonly cart = inject(CartService);

  protected readonly products = signal<readonly CatalogProduct[]>([]);
  protected readonly loadState = signal<LoadState>('loading');
  protected readonly category = signal<CategoryFilter>('todos');
  protected readonly selectedColors = signal<CatalogColor[]>([]);
  protected readonly selectedFlowers = signal<FlowerType[]>([]);
  protected readonly sortMode = signal<SortMode>('recommended');
  protected readonly filtersOpen = signal(false);
  protected readonly sortOpen = signal(false);
  protected readonly draftColors = signal<CatalogColor[]>([]);
  protected readonly draftFlowers = signal<FlowerType[]>([]);
  protected readonly failedImages = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedSlug = signal<string | null>(null);
  protected readonly quantity = signal(1);
  protected readonly cartMessage = signal('');

  protected readonly filterTrigger = viewChild<ElementRef<HTMLButtonElement>>('filterTrigger');
  protected readonly filterSheet = viewChild<ElementRef<HTMLElement>>('filterSheet');
  protected readonly filterClose = viewChild<ElementRef<HTMLButtonElement>>('filterClose');
  protected readonly productDialog = viewChild<ElementRef<HTMLElement>>('productDialog');
  protected readonly productClose = viewChild<ElementRef<HTMLButtonElement>>('productClose');

  private previousBodyOverflow = '';

  protected readonly colorOptions = computed<readonly FilterOption<CatalogColor>[]>(() =>
    (Object.entries(COLOR_LABELS) as [CatalogColor, string][])
      .filter(([value]) => this.products().some((product) => product.colors.includes(value)))
      .map(([value, label]) => ({ value, label })),
  );

  protected readonly flowerOptions = computed<readonly FilterOption<FlowerType>[]>(() =>
    (Object.entries(FLOWER_LABELS) as [FlowerType, string][])
      .filter(([value]) => this.products().some((product) => product.flowerTypes.includes(value)))
      .map(([value, label]) => ({ value, label })),
  );

  protected readonly categoryCounts = computed(() => ({
    todos: this.products().length,
    arreglos: this.products().filter((product) => product.category === 'arrangement').length,
    flores: this.products().filter((product) => product.category === 'single-flower').length,
  }));

  protected readonly hasPrices = computed(() =>
    this.products().some((product) => product.price !== null),
  );

  protected readonly activeFilterCount = computed(
    () => this.selectedColors().length + this.selectedFlowers().length,
  );

  protected readonly filteredProducts = computed(() =>
    this.filterProducts(this.selectedColors(), this.selectedFlowers()),
  );

  protected readonly draftResultCount = computed(() =>
    this.filterProducts(this.draftColors(), this.draftFlowers()).length,
  );

  protected readonly selectedProduct = computed(() => {
    const slug = this.selectedSlug();
    return slug ? this.products().find((product) => product.slug === slug) ?? null : null;
  });

  protected readonly currentQueryParams = computed(() => ({
    ...(this.category() === 'todos' ? {} : { categoria: this.category() }),
    ...(this.selectedColors().length ? { colores: this.selectedColors().join(',') } : {}),
    ...(this.selectedFlowers().length ? { flores: this.selectedFlowers().join(',') } : {}),
    ...(this.sortMode() === 'recommended' ? {} : { orden: SORT_PARAMS[this.sortMode() as keyof typeof SORT_PARAMS] }),
  }));

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const rawCategory = params.get('categoria');
        this.category.set(
          rawCategory === 'arreglos' || rawCategory === 'flores' ? rawCategory : 'todos',
        );
        this.selectedColors.set(
          this.parseList(params.get('colores'), Object.keys(COLOR_LABELS) as CatalogColor[]),
        );
        this.selectedFlowers.set(
          this.parseList(params.get('flores'), Object.keys(FLOWER_LABELS) as FlowerType[]),
        );
        const rawSort = params.get('orden');
        const sortEntry = (Object.entries(SORT_PARAMS) as [SortMode, string][]).find(
          ([, param]) => param === rawSort,
        );
        this.sortMode.set(sortEntry?.[0] ?? 'recommended');
      });

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const slug = params.get('slug');
        this.selectedSlug.set(slug);
        this.quantity.set(1);
        this.cartMessage.set('');
        this.syncScrollLock();

        if (slug) {
          setTimeout(() => this.productClose()?.nativeElement.focus());
        }
      });

    void this.loadCatalog();

    this.destroyRef.onDestroy(() => {
      this.document.body.style.overflow = this.previousBodyOverflow;
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.filtersOpen()) {
        event.preventDefault();
        this.closeFilters(true);
      } else if (this.selectedProduct()) {
        event.preventDefault();
        this.closeProduct();
      }
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const activeDialog = this.filtersOpen()
      ? this.filterSheet()?.nativeElement
      : this.selectedProduct()
        ? this.productDialog()?.nativeElement
        : null;

    if (activeDialog) {
      this.trapFocus(event, activeDialog);
    }
  }

  protected setCategory(category: CategoryFilter): void {
    this.category.set(category);
    this.updateQueryParams();
    this.returnGridToView();
  }

  protected toggleColor(color: CatalogColor): void {
    this.toggleValue(this.selectedColors, color);
    this.updateQueryParams();
    this.returnGridToView();
  }

  protected toggleFlower(flower: FlowerType): void {
    this.toggleValue(this.selectedFlowers, flower);
    this.updateQueryParams();
    this.returnGridToView();
  }

  protected setSort(mode: SortMode): void {
    this.sortMode.set(mode);
    this.sortOpen.set(false);
    this.updateQueryParams();
  }

  protected toggleSortMenu(): void {
    this.sortOpen.update((open) => !open);
  }

  protected openFilters(): void {
    this.draftColors.set([...this.selectedColors()]);
    this.draftFlowers.set([...this.selectedFlowers()]);
    this.filtersOpen.set(true);
    this.syncScrollLock();
    setTimeout(() => this.filterClose()?.nativeElement.focus());
  }

  protected closeFilters(returnFocus = false): void {
    this.filtersOpen.set(false);
    this.syncScrollLock();

    if (returnFocus) {
      setTimeout(() => this.filterTrigger()?.nativeElement.focus());
    }
  }

  protected toggleDraftColor(color: CatalogColor): void {
    this.toggleValue(this.draftColors, color);
  }

  protected toggleDraftFlower(flower: FlowerType): void {
    this.toggleValue(this.draftFlowers, flower);
  }

  protected clearDraftFilters(): void {
    this.draftColors.set([]);
    this.draftFlowers.set([]);
  }

  protected applyDraftFilters(): void {
    this.selectedColors.set([...this.draftColors()]);
    this.selectedFlowers.set([...this.draftFlowers()]);
    this.updateQueryParams();
    this.closeFilters(true);
    this.returnGridToView();
  }

  protected clearFilters(): void {
    this.selectedColors.set([]);
    this.selectedFlowers.set([]);
    this.updateQueryParams();
    this.returnGridToView();
  }

  protected retry(): void {
    void this.loadCatalog();
  }

  protected markImageFailed(productId: string): void {
    this.failedImages.update((ids) => new Set([...ids, productId]));
  }

  protected closeProduct(): void {
    const slug = this.selectedProduct()?.slug;
    void this.router.navigate(['/catalogo'], {
      queryParams: this.currentQueryParams(),
    }).then(() => {
      this.syncScrollLock();
      if (!slug) {
        return;
      }

      setTimeout(() => {
        this.document
          .querySelector<HTMLElement>(`a[href^="/catalogo/${slug}"]`)
          ?.focus();
      });
    });
  }

  protected decreaseQuantity(): void {
    this.quantity.update((quantity) => Math.max(1, quantity - 1));
  }

  protected increaseQuantity(): void {
    this.quantity.update((quantity) => quantity + 1);
  }

  protected addToCart(product: CatalogProduct): void {
    const quantity = this.quantity();
    this.cart.add(product.id, quantity);
    this.cartMessage.set(
      quantity === 1 ? '1 pieza agregada al carrito.' : `${quantity} piezas agregadas al carrito.`,
    );
  }

  protected categoryLabel(category: ProductCategory): string {
    return category === 'arrangement' ? 'Arreglo' : 'Flor individual';
  }

  protected priceLabel(product: CatalogProduct): string {
    if (product.price === null) {
      return 'Precio por confirmar';
    }

    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: product.currency,
      maximumFractionDigits: 2,
    }).format(product.price);
  }

  private filterProducts(colors: readonly CatalogColor[], flowers: readonly FlowerType[]): CatalogProduct[] {
    const filtered = this.products().filter((product) => {
      const categoryMatches =
        this.category() === 'todos' ||
        (this.category() === 'arreglos' && product.category === 'arrangement') ||
        (this.category() === 'flores' && product.category === 'single-flower');
      const colorMatches = !colors.length || colors.some((color) => product.colors.includes(color));
      const flowerMatches =
        !flowers.length || flowers.some((flower) => product.flowerTypes.includes(flower));

      return categoryMatches && colorMatches && flowerMatches;
    });

    return [...filtered].sort((left, right) => this.compareProducts(left, right));
  }

  private compareProducts(left: CatalogProduct, right: CatalogProduct): number {
    const mode = this.sortMode();

    if (mode === 'name') {
      return left.name.localeCompare(right.name, 'es');
    }

    if ((mode === 'price-asc' || mode === 'price-desc') && this.hasPrices()) {
      // Sin precio siempre al final, sin importar la dirección.
      if (left.price === null || right.price === null) {
        if (left.price !== right.price) {
          return left.price === null ? 1 : -1;
        }
        return left.sortOrder - right.sortOrder;
      }

      const difference = mode === 'price-asc' ? left.price - right.price : right.price - left.price;
      return difference || left.sortOrder - right.sortOrder;
    }

    return left.sortOrder - right.sortOrder;
  }

  private parseList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
    if (!raw) {
      return [];
    }

    return [...new Set(raw.split(',').filter((value): value is T => allowed.includes(value as T)))];
  }

  private async loadCatalog(): Promise<void> {
    this.loadState.set('loading');

    try {
      const products = await this.catalogData.loadProducts();
      this.products.set(products);
      this.loadState.set('ready');

      const slug = this.selectedSlug();
      if (slug && !products.some((product) => product.slug === slug)) {
        await this.router.navigate(['/catalogo'], {
          queryParams: this.currentQueryParams(),
          replaceUrl: true,
        });
      }
    } catch {
      this.products.set([]);
      this.loadState.set('error');
    }
  }

  private toggleValue<T extends string>(target: WritableSignal<T[]>, value: T): void {
    target.update((values) =>
      values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value],
    );
  }

  private updateQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.currentQueryParams(),
      replaceUrl: true,
    });
  }

  private returnGridToView(): void {
    const grid = this.document.querySelector<HTMLElement>('#catalog-grid');
    if (!grid) {
      return;
    }

    const bounds = grid.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > this.document.documentElement.clientHeight) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private syncScrollLock(): void {
    const shouldLock = this.filtersOpen() || Boolean(this.selectedProduct());

    if (shouldLock && this.document.body.style.overflow !== 'hidden') {
      this.previousBodyOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
    } else if (!shouldLock) {
      this.document.body.style.overflow = this.previousBodyOverflow;
    }
  }

  private trapFocus(event: KeyboardEvent, container: HTMLElement): void {
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);

    if (!focusable.length) {
      event.preventDefault();
      container.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
