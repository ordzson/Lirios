import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderRecord, OrderService } from '../../shared/orders/order.service';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';

@Component({
  selector: 'app-order-confirmation',
  imports: [RouterLink, SiteHeaderComponent],
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.scss',
})
export class OrderConfirmationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly document = inject(DOCUMENT);

  protected readonly orderNumber = this.route.snapshot.paramMap.get('orderNumber')?.trim() ?? '';
  protected readonly order: OrderRecord | null = this.orders.find(this.orderNumber);
  protected readonly copyMessage = signal('');

  protected formatPrice(value: number | null): string {
    if (value === null) {
      return 'Por confirmar';
    }

    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      maximumFractionDigits: 2,
    }).format(value);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-GT', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Guatemala',
    }).format(new Date(value));
  }

  protected async copyOrderNumber(): Promise<void> {
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;

      if (clipboard) {
        await clipboard.writeText(this.orderNumber);
      } else {
        const field = this.document.createElement('textarea');
        field.value = this.orderNumber;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        this.document.body.appendChild(field);
        field.select();
        const copied = this.document.execCommand('copy');
        field.remove();

        if (!copied) {
          throw new Error('Copy command unavailable');
        }
      }

      this.copyMessage.set('Número copiado. Guárdalo para consultar tu pedido.');
    } catch {
      this.copyMessage.set('No pudimos copiarlo. Selecciona el número y cópialo manualmente.');
    }
  }
}
