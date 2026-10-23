---
version: 1
slug: 'admin'
primary_target: 'src/app/pages/admin/dashboard/admin-dashboard.component.html'
related_targets:
  - 'src/app/pages/admin/dashboard/admin-dashboard.component.scss'
  - 'src/app/pages/admin/dashboard/admin-dashboard.component.ts'
  - 'src/app/pages/admin/login/admin-login.component.html'
  - 'src/app/pages/admin/login/admin-login.component.scss'
  - 'src/app/pages/admin/login/admin-login.component.ts'
  - 'src/app/pages/admin/shared/admin-data.service.ts'
  - 'src/app/core/auth/admin.guard.ts'
  - 'src/app/core/auth/auth.service.ts'
  - 'src/app/app.routes.ts'
mode: 'Operate'
seed_key: 'a99dbb4d'
decision: 'assigned-direction-user-authorized-continuation'
---

# Administración

## THESIS

**Mesa de taller.** La operación se presenta como una superficie continua donde lo urgente aparece primero: pedidos en movimiento al centro, inventario que necesita atención a un lado y detalle progresivo sin abandonar la cola. Rehúsa tanto el dashboard de tarjetas métricas como el backoffice genérico desconectado de la floristería.

## OWN-WORLD

Hereda `DESIGN.md`: crema mate, vino, noche y reglas finas; esquinas rectas y ausencia de elevación decorativa. Manrope opera toda la interfaz. Bodoni aparece solamente en la marca y en el acceso, donde la voz de Dumish Blooms recibe a la persona antes de entrar a trabajar. Los colores adicionales se limitan a estados semánticos de pedido, foco y selección.

## STORY

La persona inicia sesión, reconoce en segundos qué pedidos requieren atención y abre una fila sin perder el contexto. Puede confirmar, preparar y entregar; después corrige precio, inventario, publicación y fotografías del catálogo. Una cuenta administradora también asigna roles. Los estados vacíos enseñan el siguiente paso y los errores preservan lo escrito.

## FIRST VIEWPORT

En escritorio, una navegación noche fija sostiene una mesa crema. El encabezado, una franja de cuatro métricas operativas y la cola real de pedidos ocupan el centro; un rail estrecho reserva inventario bajo. Pedidos y catálogo se convierten en listas con panel de detalle lateral. En móvil, la navegación pasa arriba, las métricas forman una matriz 2×2 y lista/detalle se muestran como estados consecutivos para conservar legibilidad a 390 px.

## FORM

- Modo **Operate**, code-led por continuidad explícita del usuario.
- Seed corroborable `a99dbb4d`; se adoptó la estructura asignada del roll.
- Navegación estándar, tablas semánticas, búsqueda, filtros y edición inline.
- Movimiento limitado a cambios de estado de 160–180 ms; no hay secuencia de entrada.
- Momento distintivo: la mesa vacía o activa se lee como el estado real del taller, no como una colección de widgets.
- Riesgo honesto: demasiadas columnas degradan rápido en móvil; se priorizan pedido, cliente y estado, y el detalle conserva el resto.
