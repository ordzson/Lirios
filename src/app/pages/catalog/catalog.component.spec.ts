import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CATALOG_PRODUCTS } from './catalog-products';
import { CatalogComponent } from './catalog.component';
import { CatalogDataService } from './catalog-data.service';

describe('CatalogComponent', () => {
  it('derives category counts and renders prices from loaded products', async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const categoryLabels = Array.from(element.querySelectorAll('.category-switch button')).map(
      (button) => button.textContent?.replace(/\s/g, ''),
    );
    const text = element.textContent ?? '';
    expect(categoryLabels).toEqual([
      `Todos${CATALOG_PRODUCTS.length}`,
      'Arreglos6',
      'FloresindividualesFlores1',
    ]);
    expect(text).toMatch(/Q\s?145/);
    expect(text).not.toContain('Precio por confirmar');
  });

  it('sorts by price in both directions, keeping missing prices last', async () => {
    const products = [
      { ...CATALOG_PRODUCTS[0], id: 'a', name: 'A', price: 200, sortOrder: 1 },
      { ...CATALOG_PRODUCTS[1], id: 'b', name: 'B', price: null, sortOrder: 2 },
      { ...CATALOG_PRODUCTS[2], id: 'c', name: 'C', price: 50, sortOrder: 3 },
      { ...CATALOG_PRODUCTS[3], id: 'd', name: 'D', price: 120, sortOrder: 4 },
    ];

    await TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [
        provideRouter([]),
        { provide: CatalogDataService, useValue: { loadProducts: () => Promise.resolve(products) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const names = () => {
      fixture.detectChanges();
      return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.product-card__name')).map(
        (name) => name.textContent?.trim(),
      );
    };
    const pick = (value: string) => {
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
        `input[name="desktop-sort"][value="${value}"]`,
      );
      input!.click();
    };

    pick('price-asc');
    expect(names()).toEqual(['C', 'D', 'A', 'B']);

    pick('price-desc');
    expect(names()).toEqual(['A', 'D', 'C', 'B']);
  });

  it('renders the recoverable error state when loading fails', async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [
        provideRouter([]),
        {
          provide: CatalogDataService,
          useValue: { loadProducts: () => Promise.reject(new Error('offline')) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No pudimos cargar la colección.');
    expect(text).toContain('Intentar de nuevo');
  });
});
