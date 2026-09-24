---
version: 1
slug: 'personalizados'
primary_target: 'src/app/pages/custom-arrangements/custom-arrangements.component.html'
related_targets:
  - 'src/app/pages/custom-arrangements/custom-arrangements.component.scss'
  - 'src/app/pages/custom-arrangements/custom-arrangements.component.ts'
  - 'src/app/app.routes.ts'
mode: 'Persuade'
seed_key: 'direct-brief-user-pinned-2026-09-24'
decision: 'user-brief-pinned'
---

# Arreglos personalizados

## Scope and mode

Ruta pública independiente `/personalizados`, modo **Persuade**. El brief del usuario fijó la estructura, el canal principal y el tono con suficiente precisión para una extensión directa del mundo visual; no se realizó una ronda de conceptos. La página ayuda a reconocer una forma de comenzar y abrir una conversación por WhatsApp.

## THESIS

**Elige por el gesto.** La decisión se presenta como intención —“Un detalle”, “Una ocasión”, “Una historia”— y no como una jerarquía obligatoria. La progresión de escala y abundancia invita a considerar una pieza más elaborada sin usar lenguaje de presión, precio o rango.

## OWN-WORLD

Hereda `DESIGN.md`: crema mate, blush y vino, Bodoni Moda para la voz, Manrope para la operación, esquinas rectas, reglas finas y fotografías reales como prueba. El material artesanal domina; la interfaz no presume de las flores ni exige conocimientos florales.

## STORY

Orden de superficie: header compartido → arreglo elaborado y CTA directo → guía “empieza por el gesto” → tres opciones con muestras reales y CTA propio → proceso de tres pasos → cierre con WhatsApp. La densidad crece desde una composición contenida hasta una abundante y vuelve a una explicación breve del proceso.

## FIRST VIEWPORT

En escritorio, copy y acción ocupan la mitad izquierda y una fotografía real abundante llena la derecha. En móvil, el titular, la promesa y WhatsApp aparecen antes de la imagen. La persona entiende en segundos qué puede pedir, que recibirá ayuda y cómo empezar.

## FORM

- Tres opciones distinguibles sin mostrar las palabras “tier” ni “nivel”.
- Ocho muestras reales; cada una enlaza a WhatsApp con nombre y URL pública de la imagen.
- El CTA genérico escribe al `+50250746766`; cada opción prellena un mensaje diferente.
- En móvil, un CTA fijo permanece accesible, adopta el mensaje de la opción activa y se oculta cuando el CTA contextual ya está visible.
- Las galerías móviles usan desplazamiento horizontal con `scroll-snap`; no se oculta ninguna muestra.
- Una sola animación de apertura enfoca la fotografía principal y respeta reducción de movimiento.

## Outcome and proof

Éxito: una persona sin conocimientos florales reconoce una intención, ve ejemplos reales y abre WhatsApp con suficiente contexto para continuar sin formulario. La prueba son las fotografías existentes y el mensaje prellenado; no se inventan precios, tiempos de respuesta, testimonios ni condiciones de entrega.

## Honest risk

La abundancia fotográfica puede alargar la página en móvil. El carrusel horizontal, los CTA contextuales y el botón fijo reducen el recorrido necesario sin esconder la progresión completa.
