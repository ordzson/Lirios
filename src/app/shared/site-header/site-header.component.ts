import { Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../cart/cart.service';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  host: {
    '(document:keydown.escape)': 'closeMenu(true)',
  },
})
export class SiteHeaderComponent {
  readonly catalogMode = input(false);
  protected readonly menuOpen = signal(false);
  protected readonly menuToggle = viewChild.required<ElementRef<HTMLButtonElement>>('menuToggle');

  constructor(protected readonly cart: CartService) {}

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(returnFocus = false): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);

    if (returnFocus) {
      this.menuToggle().nativeElement.focus();
    }
  }
}
