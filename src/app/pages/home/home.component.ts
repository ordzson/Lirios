import { BrandComponent } from '../../shared/brand/brand.component';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { OrderService, TrackedOrderStatus } from '../../shared/orders/order.service';

const STATUS_MESSAGES: Readonly<Record<TrackedOrderStatus, string>> = {
  received: 'Recibimos tu solicitud y la revisaremos pronto.',
  confirmed: 'Tu pedido está confirmado.',
  in_production: 'Tu pedido está en preparación.',
  ready: 'Tu pedido está listo.',
  out_for_delivery: 'Tu pedido va en camino.',
  delivered: 'Tu pedido fue entregado.',
  cancelled: 'Este pedido fue cancelado. Escríbenos si necesitas ayuda.',
};

@Component({
  selector: 'app-home',
  imports: [BrandComponent, RouterLink, SiteHeaderComponent],
  templateUrl: '../../app.component.html',
  styleUrl: '../../app.component.scss',
})
export class HomeComponent {
  private readonly orders = inject(OrderService);
  protected readonly trackingState = signal<'idle' | 'success' | 'error'>('idle');
  protected readonly trackingMessage = signal('');

  protected async trackOrder(event: SubmitEvent, rawOrderNumber: string): Promise<void> {
    event.preventDefault();
    const orderNumber = rawOrderNumber.trim().toUpperCase();

    if (!orderNumber) {
      this.trackingState.set('error');
      this.trackingMessage.set('Escribe el número que recibiste al confirmar tu pedido.');
      return;
    }

    this.trackingState.set('idle');
    this.trackingMessage.set('Consultando el estado…');

    try {
      const order = await this.orders.track(orderNumber);
      if (!order) {
        this.trackingState.set('error');
        this.trackingMessage.set('No encontramos ese número. Revisa que esté escrito completo.');
        return;
      }

      this.trackingState.set('success');
      this.trackingMessage.set(STATUS_MESSAGES[order.status]);
    } catch {
      this.trackingState.set('error');
      this.trackingMessage.set('No pudimos consultar el pedido. Inténtalo de nuevo en un momento.');
    }
  }
}
