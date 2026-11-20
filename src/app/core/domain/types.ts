// Tipos del dominio. Copia exacta de PLAN.md §4.2 (Oleada 0).
// Único dueño: el líder/integrador. A1, A3 y el resto de paquetes no lo editan;
// los fixtures dorados (supabase/tests/fixtures/*.json) usan exactamente estas formas.

export type Id = string;                       // uuid; los productos usan su id de texto
export interface LotLayer { lotId: Id; purchasedAt: string; remaining: number; unitCost: number }
                                               // purchasedAt 'YYYY-MM-DD'; orden PEPS = purchasedAt y luego lotId; fifoCost ordena por su cuenta
export interface RecipeItem { materialId: Id | null; slotFamily: string | null; qty: number; wastePct: number }
                                               // exactamente uno: material fijo, o ranura de color por familia ('limpiapipas'); wastePct 0.10 = 10 %
export interface RecipeComponent { recipeId: Id; colorId: Id | null; qty: number }
export interface Recipe {
  id: Id; kind: 'flower' | 'addon' | 'arrangement';
  minutes: number;                             // propios: hacer la flor, poner la envoltura, o armar el arreglo
  items: RecipeItem[]; components: RecipeComponent[];   // components solo en 'arrangement'
}
export interface CostContext {
  colorId: Id | null;                          // color con que se resuelven las ranuras de esta receta
  lots: Record<Id, LotLayer[]>;                // por material
  slotMaterials: Record<string, Record<Id, Id>>;   // familia → color → material
  recipes: Record<Id, Recipe>;                 // para resolver components
  hourlyRate: number; overheadPct: number;
}
export type Category = 'arrangement' | 'single-flower';
export interface PriceLine { kind: 'product' | 'bouquet'; id: Id | null; category: Category | null; groupIds: Id[]; unitPrice: number }
export interface Promotion {
  id: Id; type: 'percent' | 'fixed'; value: number;      // percent: 15 = 15 %
  scope: 'all' | 'category' | 'group' | 'products';
  category: Category | null; groupId: Id | null; productIds: Id[];
  startsAt: string; endsAt: string | null; active: boolean;
  appliesToBuilder: boolean;                   // solo válido con scope 'all'
}
export interface BouquetSpec { flowers: { variantId: Id; qty: number }[]; wrapId: Id | null; extras: { addonId: Id; qty: number }[] }
export interface PriceList {
  variants: Record<Id, { price: number; minutes: number }>;
  addons: Record<Id, { price: number; minutes: number }>;    // envolturas y extras
  assemblyFee: number; assemblyMinutes: number;
}
export type DayState = 'open' | 'full' | 'soon' | 'closed';
