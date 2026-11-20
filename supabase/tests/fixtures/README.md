# Casos dorados (`supabase/tests/fixtures/`)

Contrato de la Oleada 0 (PLAN.md §9.1). Lo fija el líder; los JSON los escribe el agente de pruebas (T) en el paso 0 de A3 (D-22) y nadie más los edita. Los mismos casos los pasan TypeScript (Vitest, D-22) y SQL (pgTAP, DB-14 y DB-40): TS da la vista previa, **SQL es la autoridad**.

## Archivos

| Archivo | Función TS (`src/app/core/domain/`) | Función SQL | Pruebas |
| --- | --- | --- | --- |
| `costing.json` | `recipeCost(recipe, ctx)` (+ `suggestPrice` si el caso trae `pricing`) | `recipe_cost(p_recipe, p_color)` | D-22, DB-14 |
| `promotions.json` | `applyPromotions(line, promos, now)` | `effective_price(p_kind, p_id, p_base, p_now)` | D-22, DB-40 |
| `bouquet.json` | `bouquetQuote(spec, prices, promos, now)` | `bouquet_quote(p_spec, p_now)` | D-22 |

Cada archivo es un arreglo JSON de casos. `supabase/tests/generated/golden_<archivo>.sql` lo genera `pnpm run db:golden` (`scripts/gen-golden-sql.mjs`, de T); no se edita a mano y CI falla si no coincide con lo que está en el repo.

## Forma de un caso

```jsonc
{
  "id": "costing-lirio-rojo",          // kebab-case, único en todo el directorio; se usa como nombre de la prueba
  "description": "Lirio rojo, PEPS",   // opcional; en español, cita la fila de §9.1 de donde sale
  "input": { /* ver tabla siguiente */ },
  "expected": { /* ver tabla siguiente */ }
}
```

Los tipos son los de `src/app/core/domain/types.ts` (copia de PLAN.md §4.2), sin campos extra ni omitidos:

| Archivo | `input` | `expected` |
| --- | --- | --- |
| `costing.json` | `{ recipe: Recipe; ctx: CostContext; pricing?: { marginTarget: number; roundTo: number } }` | `{ materials: number; labor: number; total: number; materialsReplacement: number; totalReplacement: number; piecesAtCurrentCost: number \| null; suggestedPrice?: number }` |
| `promotions.json` | `{ line: PriceLine; promos: Promotion[]; now: string }` | `{ price: number; promoId: Id \| null }` |
| `bouquet.json` | `{ spec: BouquetSpec; prices: PriceList; promos: Promotion[]; now: string }` | `{ subtotal: number; discount: number; total: number; minutes: number }` |

`suggestedPrice` solo aparece si el caso trae `pricing`; se compara con `suggestPrice(expected.total, pricing.marginTarget, pricing.roundTo)`.

## Reglas

1. **Autocontenido.** El caso trae todos sus lotes, recetas (incluidas las de `components`), materiales de ranura, ajustes y promociones. No depende de `supabase/seed.sql` ni de otro caso.
2. **Ids.** Todo `Id` es un uuid en minúsculas, salvo los productos, que usan su id de texto (`arrangement-crimson-lilies`). El generador inserta los ids **tal cual**, así un error de SQL apunta al mismo id que el de TS.
3. **Números.** Siempre números JSON, nunca cadenas. Dinero con 2 decimales (`14.9`, `130`); costos unitarios hasta 4 (`0.8`, `0.0125`). Porcentajes de `wastePct`, `overheadPct`, `marginTarget` como fracción (`0.10` = 10 %); `Promotion.value` con `type: 'percent'` como entero (`15` = 15 %).
4. **Fechas.** `LotLayer.purchasedAt` como `'YYYY-MM-DD'`. `now`, `startsAt`, `endsAt` en ISO 8601 con desfase de Guatemala: `'2026-11-16T08:00:00-06:00'` (el «ahora» de referencia de §9.1).
5. **Lotes.** `remaining` es el saldo con que se costea (PEPS por `purchasedAt` y luego `lotId`). El **último lote** (para el costo de reposición) es el de `purchasedAt` más reciente, tenga saldo o no. El generador inserta cada lote con cantidad comprada = `remaining` y costo total = `remaining × unitCost` (solo el saldo y el costo unitario afectan el resultado).
6. **Ranuras de color.** `ctx.slotMaterials[familia][colorId]` es el material que resuelve una ranura; `ctx.colorId` es el color con que se costea (el `p_color` de `recipe_cost`). El generador inserta esos materiales con su `family` y `color_id`.
7. **Ajustes.** `ctx.hourlyRate` y `ctx.overheadPct` (costeo) y `prices.assemblyFee`/`assemblyMinutes` (ramo) se escriben en `business_settings` dentro de la transacción del caso.
8. **Comparación.** Dinero y costos se comparan exactos tras redondear a 2 decimales; minutos y piezas, exactos; `null` solo es igual a `null`.
9. **SQL generado.** Por caso: `begin;` → vacía las tablas que toca → inserta el `input` como filas → llama a la función SQL → compara con `expected` usando pgTAP → `rollback;`.

## Ejemplo (ilustrativo; los casos reales los escribe T con §9.1)

```json
{
  "id": "costing-lirio-rojo",
  "description": "§9.1 Lirio rojo: materiales PEPS Q4.90, mano de obra Q10.00, costo Q14.90, reposición Q16.70, sugerido Q25, piezas al costo actual 1",
  "input": {
    "recipe": {
      "id": "00000000-0000-4000-8000-000000000101",
      "kind": "flower",
      "minutes": 20,
      "items": [
        { "materialId": null, "slotFamily": "limpiapipas", "qty": 6, "wastePct": 0 },
        { "materialId": "00000000-0000-4000-8000-000000000003", "slotFamily": null, "qty": 2, "wastePct": 0 },
        { "materialId": "00000000-0000-4000-8000-000000000004", "slotFamily": null, "qty": 30, "wastePct": 0 },
        { "materialId": "00000000-0000-4000-8000-000000000005", "slotFamily": null, "qty": 10, "wastePct": 0 }
      ],
      "components": []
    },
    "ctx": {
      "colorId": "00000000-0000-4000-8000-0000000000c1",
      "lots": {
        "00000000-0000-4000-8000-000000000001": [
          { "lotId": "00000000-0000-4000-8000-0000000001a1", "purchasedAt": "2026-10-01", "remaining": 10, "unitCost": 0.5 },
          { "lotId": "00000000-0000-4000-8000-0000000001a2", "purchasedAt": "2026-11-01", "remaining": 100, "unitCost": 0.8 }
        ],
        "00000000-0000-4000-8000-000000000003": [
          { "lotId": "00000000-0000-4000-8000-0000000001a4", "purchasedAt": "2026-10-01", "remaining": 200, "unitCost": 0.4 }
        ],
        "00000000-0000-4000-8000-000000000004": [
          { "lotId": "00000000-0000-4000-8000-0000000001a5", "purchasedAt": "2026-10-01", "remaining": 1000, "unitCost": 0.02 }
        ],
        "00000000-0000-4000-8000-000000000005": [
          { "lotId": "00000000-0000-4000-8000-0000000001a6", "purchasedAt": "2026-10-01", "remaining": 500, "unitCost": 0.05 }
        ]
      },
      "slotMaterials": {
        "limpiapipas": { "00000000-0000-4000-8000-0000000000c1": "00000000-0000-4000-8000-000000000001" }
      },
      "recipes": {},
      "hourlyRate": 30,
      "overheadPct": 0
    },
    "pricing": { "marginTarget": 0.3, "roundTo": 5 }
  },
  "expected": {
    "materials": 4.9,
    "labor": 10,
    "total": 14.9,
    "materialsReplacement": 6.7,
    "totalReplacement": 16.7,
    "piecesAtCurrentCost": 1,
    "suggestedPrice": 25
  }
}
```

Cambiar esta forma (campos, unidades, reglas) pasa por el líder y se refleja aquí y en `types.ts` antes de tocar los JSON.
