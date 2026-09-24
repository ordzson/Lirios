export type ProductCategory = 'arrangement' | 'single-flower';
export type CatalogColor = 'rojo' | 'rosado' | 'amarillo' | 'blanco' | 'morado';
export type FlowerType = 'lirio' | 'gerbera' | 'margarita' | 'flor-de-cerezo';

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  colors: CatalogColor[];
  flowerTypes: FlowerType[];
  price: number | null;
  currency: 'GTQ';
  image: string;
  imageSrcset: string;
  imageAlt: string;
  featured?: boolean;
  sortOrder: number;
}

const imageRoot = '/assets/pics/retouched/webp';

// Precios mock (GTQ) para maquetar el catálogo; sustituir por los reales antes de publicar.
export const CATALOG_PRODUCTS: readonly CatalogProduct[] = [
  {
    id: 'arrangement-crimson-lilies',
    slug: 'lirios-carmesi',
    name: 'Lirios carmesí',
    category: 'arrangement',
    colors: ['rojo'],
    flowerTypes: ['lirio'],
    price: 145,
    currency: 'GTQ',
    image: `${imageRoot}/arreglo_tier1-retouched-full.webp`,
    imageSrcset: `${imageRoot}/arreglo_tier1-retouched-640.webp 640w, ${imageRoot}/arreglo_tier1-retouched-full.webp 1086w`,
    imageAlt: 'Arreglo de lirios carmesí de limpiapipas envuelto en papel blanco',
    featured: true,
    sortOrder: 1,
  },
  {
    id: 'arrangement-pink-lilies',
    slug: 'lirios-rosados',
    name: 'Lirios rosados',
    category: 'arrangement',
    colors: ['rosado'],
    flowerTypes: ['lirio'],
    price: 145,
    currency: 'GTQ',
    image: `${imageRoot}/arreglo_tier1_2-retouched-full.webp`,
    imageSrcset: `${imageRoot}/arreglo_tier1_2-retouched-640.webp 640w, ${imageRoot}/arreglo_tier1_2-retouched-full.webp 1086w`,
    imageAlt: 'Arreglo de lirios rosados de limpiapipas envuelto en papel blanco',
    sortOrder: 2,
  },
  {
    id: 'arrangement-golden-gerberas',
    slug: 'gerberas-doradas',
    name: 'Gerberas doradas',
    category: 'arrangement',
    colors: ['amarillo'],
    flowerTypes: ['gerbera'],
    price: 120,
    currency: 'GTQ',
    image: `${imageRoot}/arreglo_tier1_3-retouched-full.webp`,
    imageSrcset: `${imageRoot}/arreglo_tier1_3-retouched-640.webp 640w, ${imageRoot}/arreglo_tier1_3-retouched-full.webp 1086w`,
    imageAlt: 'Tres gerberas amarillas de limpiapipas sostenidas con una mano',
    sortOrder: 3,
  },
  {
    id: 'arrangement-wildflowers',
    slug: 'arreglo-silvestre',
    name: 'Arreglo silvestre',
    category: 'arrangement',
    colors: ['rosado', 'morado', 'blanco'],
    flowerTypes: ['gerbera', 'margarita'],
    price: 260,
    currency: 'GTQ',
    image: `${imageRoot}/arreglo_tier3_3-retouched-full.webp`,
    imageSrcset: `${imageRoot}/arreglo_tier3_3-retouched-640.webp 640w, ${imageRoot}/arreglo_tier3_3-retouched-full.webp 1086w`,
    imageAlt: 'Arreglo multicolor de flores de limpiapipas en tonos rosados, morados y blancos',
    sortOrder: 4,
  },
  {
    id: 'single-cherry-blossom',
    slug: 'flor-de-cerezo',
    name: 'Flor de cerezo',
    category: 'single-flower',
    colors: ['blanco'],
    flowerTypes: ['flor-de-cerezo'],
    price: 45,
    currency: 'GTQ',
    image: `${imageRoot}/flor_individual_1-retouched-full.webp`,
    imageSrcset: `${imageRoot}/flor_individual_1-retouched-640.webp 640w, ${imageRoot}/flor_individual_1-retouched-full.webp 1086w`,
    imageAlt: 'Rama de pequeñas flores blancas de limpiapipas sobre fondo vino',
    sortOrder: 5,
  },
  {
    id: 'arrangement-sunlit',
    slug: 'arreglo-soleado',
    name: 'Arreglo soleado',
    category: 'arrangement',
    colors: ['amarillo', 'blanco'],
    flowerTypes: ['lirio', 'margarita'],
    price: 185,
    currency: 'GTQ',
    image: `${imageRoot}/flores1-retouched-full.webp`,
    imageSrcset: `${imageRoot}/flores1-retouched-640.webp 640w, ${imageRoot}/flores1-retouched-full.webp 1086w`,
    imageAlt: 'Arreglo de lirios amarillos y margaritas blancas de limpiapipas envuelto en papel beige',
    sortOrder: 6,
  },
  {
    id: 'arrangement-lilies-daisies',
    slug: 'lirios-y-margaritas',
    name: 'Lirios y margaritas',
    category: 'arrangement',
    colors: ['amarillo', 'blanco'],
    flowerTypes: ['lirio', 'gerbera', 'margarita'],
    price: 210,
    currency: 'GTQ',
    image: `${imageRoot}/arreglo_tier2-retouched-full.webp`,
    imageSrcset: `${imageRoot}/arreglo_tier2-retouched-640.webp 640w, ${imageRoot}/arreglo_tier2-retouched-full.webp 1086w`,
    imageAlt: 'Arreglo de lirios, margaritas y gerberas de limpiapipas en tonos amarillos y blancos',
    sortOrder: 7,
  },
];
