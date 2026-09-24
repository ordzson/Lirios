import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, SiteHeaderComponent],
  templateUrl: '../../app.component.html',
  styleUrl: '../../app.component.scss',
})
export class HomeComponent {
  protected readonly trackingState = signal<'idle' | 'success' | 'error'>('idle');
  protected readonly trackingMessage = signal('');

  protected trackOrder(event: SubmitEvent, rawOrderNumber: string): void {
    event.preventDefault();
    const orderNumber = rawOrderNumber.trim().toUpperCase();

    if (!orderNumber) {
      this.trackingState.set('error');
      this.trackingMessage.set('Escribe el número que recibiste al confirmar tu pedido.');
      return;
    }

    if (orderNumber === 'LIR-2048') {
      this.trackingState.set('success');
      this.trackingMessage.set('Pedido de muestra: confirmado y en preparación.');
      return;
    }

    this.trackingState.set('error');
    this.trackingMessage.set('Esta demostración solo reconoce LIR-2048.');
  }
}
