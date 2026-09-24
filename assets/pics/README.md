# Catálogo fotográfico

Fotografías aportadas por la propietaria del proyecto el 24 de septiembre de 2026. Los archivos JPEG de esta carpeta son los originales y no deben sobrescribirse.

`webp/` contiene dos derivados listos para la web de cada original:

- `*-640.webp`: variante ligera para móviles y miniaturas.
- `*-full.webp`: variante optimizada a resolución original para composiciones grandes.

`retouched/` contiene una colección editorial no destructiva creada a partir de las
fotografías originales. Los PNG conservan la versión retocada de máxima calidad y
`retouched/webp/` contiene los derivados que usa el sitio:

- `*-retouched-640.webp`: variante de 640 × 853 px para móviles y miniaturas.
- `*-retouched-full.webp`: variante de 1086 × 1448 px para composiciones grandes.

Los originales y sus primeros derivados en `webp/` se conservan sin cambios para
que siempre sea posible comparar o revertir la dirección fotográfica.

## Familias y uso recomendado

| Familia | Archivos | Uso |
| --- | --- | --- |
| Tier 1 | `arreglo_tier1*` | Principal: portada, catálogo y composiciones editoriales. |
| Tier 2 | `arreglo_tier2` | Principal: personalización y vistas de proceso. |
| Tier 3 | `arreglo_tier3*` | Secundario: usar con moderación; la portada actual utiliza solo `arreglo_tier3_3`. |
| Flor individual | `flor_individual_1` | Flores individuales, detalle y textura. |
| Arreglo complementario | `flores1` | Hero y campañas estacionales. |

Para nuevas vistas, mantener el `srcset` de 640 px + resolución completa, declarar `width` y `height`, usar `loading="lazy"` salvo en el hero y conservar encuadres que hagan visible la textura de los limpiapipas.
