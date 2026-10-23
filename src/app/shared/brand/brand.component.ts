import { Component, input } from '@angular/core';

@Component({
  selector: 'app-brand',
  host: { '[class.brand--on-dark]': 'onDark()' },
  template: `
    @if (onDark()) {
      <img
        class="brand__vector"
        src="assets/brand/dumish-white.svg"
        width="940"
        height="550"
        alt="Dumish Blooms · Flores de limpiapipas"
      />
    } @else {
      <img
        class="brand__original"
        src="assets/brand/dumish.jpeg"
        width="1085"
        height="1027"
        alt="Dumish Blooms · Flores de limpiapipas"
      />
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 940 / 550;
      overflow: hidden;
      background: #faf2eb;
      isolation: isolate;
    }

    :host(.brand--on-dark) {
      background: transparent;
    }

    .brand__vector {
      display: block;
      width: 100%;
      height: 100%;
    }

    .brand__original {
      position: absolute;
      top: -42.7273%;
      left: -7.4468%;
      width: 115.4256%;
      max-width: none;
      height: auto;
      mix-blend-mode: multiply;
    }
  `,
})
export class BrandComponent {
  readonly onDark = input(false);
}
