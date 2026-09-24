import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';

interface ArrangementSample {
  readonly name: string;
  readonly image: string;
  readonly image640: string;
  readonly alt: string;
}

interface ArrangementChoice {
  readonly id: string;
  readonly name: string;
  readonly actionLabel: string;
  readonly promise: string;
  readonly description: string;
  readonly fit: string;
  readonly whatsappMessage: string;
  readonly samples: readonly ArrangementSample[];
}

const CHOICES: readonly ArrangementChoice[] = [
  {
    id: 'un-detalle',
    name: 'Un detalle',
    actionLabel: 'un detalle',
    promise: 'Pocas flores, toda la intención.',
    description: 'Una composición contenida que deja hablar al color y a la persona que la recibe.',
    fit: 'Ideal para un gesto espontáneo, un agradecimiento o un “pensé en ti”.',
    whatsappMessage:
      'Hola, vi la opción “Un detalle” en la página de arreglos personalizados. Me gustaría crear algo íntimo y sencillo. ¿Me ayudan a elegir colores y flores?',
    samples: [
      {
        name: 'Lirios carmesí',
        image: '/assets/pics/retouched/webp/arreglo_tier1-retouched-full.webp',
        image640: '/assets/pics/retouched/webp/arreglo_tier1-retouched-640.webp',
        alt: 'Tres lirios carmesí hechos con limpiapipas y envueltos en papel blanco',
      },
      {
        name: 'Lirios rosados',
        image: '/assets/pics/retouched/webp/arreglo_tier1_2-retouched-full.webp',
        image640: '/assets/pics/retouched/webp/arreglo_tier1_2-retouched-640.webp',
        alt: 'Arreglo pequeño de lirios rosados hechos con limpiapipas',
      },
      {
        name: 'Gerberas doradas',
        image: '/assets/pics/retouched/webp/arreglo_tier1_3-retouched-full.webp',
        image640: '/assets/pics/retouched/webp/arreglo_tier1_3-retouched-640.webp',
        alt: 'Arreglo pequeño de gerberas amarillas hechas con limpiapipas',
      },
    ],
  },
  {
    id: 'una-ocasion',
    name: 'Una ocasión',
    actionLabel: 'una ocasión',
    promise: 'Más variedad para decir un poco más.',
    description:
      'Combina formas y colores en una pieza con mayor presencia, pensada para acompañar un momento especial.',
    fit: 'Ideal para cumpleaños, graduaciones, aniversarios o una visita que merece celebrarse.',
    whatsappMessage:
      'Hola, vi la opción “Una ocasión” en la página de arreglos personalizados. Busco una composición con más variedad y presencia para una fecha especial. ¿Podemos conversar sobre colores y flores?',
    samples: [
      {
        name: 'Jardín luminoso',
        image: '/assets/pics/retouched/webp/arreglo_tier2-retouched-full.webp',
        image640: '/assets/pics/retouched/webp/arreglo_tier2-retouched-640.webp',
        alt: 'Arreglo de lirios rosados, gerberas amarillas y margaritas blancas hecho con limpiapipas',
      },
      {
        name: 'Lirios y margaritas',
        image: '/assets/pics/retouched/webp/flores1-retouched-full.webp',
        image640: '/assets/pics/retouched/webp/flores1-retouched-640.webp',
        alt: 'Arreglo de lirios amarillos y margaritas blancas hecho con limpiapipas',
      },
    ],
  },
  {
    id: 'una-historia',
    name: 'Una historia',
    actionLabel: 'una historia',
    promise: 'Una pieza abundante para recordar.',
    description:
      'Una composición amplia, con más tipos de flores y libertad para construir una presencia verdaderamente singular.',
    fit: 'Ideal para grandes celebraciones, regalos compartidos o cuando quieres que el arreglo sea parte del recuerdo.',
    whatsappMessage:
      'Hola, vi la opción “Una historia” en la página de arreglos personalizados. Quiero una pieza abundante y muy especial, con varias flores y colores. ¿Me ayudan a darle forma?',
    samples: [
      {
        name: 'Jardín violeta',
        image: '/assets/pics/retouched/webp/arreglo_tier3_3-retouched-full.webp',
        image640: '/assets/pics/retouched/webp/arreglo_tier3_3-retouched-640.webp',
        alt: 'Arreglo abundante de flores azules, violetas, rosadas y blancas hecho con limpiapipas',
      },
      {
        name: 'Jardín silvestre',
        image: '/assets/pics/webp/arreglo_tier3_1-full.webp',
        image640: '/assets/pics/webp/arreglo_tier3_1-640.webp',
        alt: 'Arreglo amplio de lirios, lavanda, margaritas y girasol hecho con limpiapipas',
      },
      {
        name: 'Flores de celebración',
        image: '/assets/pics/webp/arreglo_tier3_2-full.webp',
        image640: '/assets/pics/webp/arreglo_tier3_2-640.webp',
        alt: 'Arreglo amplio y colorido de flores variadas hecho con limpiapipas',
      },
    ],
  },
];

@Component({
  selector: 'app-custom-arrangements',
  imports: [RouterLink, SiteHeaderComponent],
  templateUrl: './custom-arrangements.component.html',
  styleUrl: './custom-arrangements.component.scss',
})
export class CustomArrangementsComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly whatsappNumber = '50250746766';
  private choiceObserver?: IntersectionObserver;
  private actionObserver?: IntersectionObserver;
  private readonly visibleContextualActions = new Set<Element>();

  protected readonly choices = CHOICES;
  protected readonly activeChoice = signal<ArrangementChoice | null>(null);
  protected readonly contextualActionVisible = signal(false);
  protected readonly genericWhatsAppUrl = this.whatsAppUrl(
    'Hola, quiero crear un arreglo personalizado. Tengo una idea y me gustaría que me ayudaran a elegir la mejor opción.',
  );
  protected readonly mobileWhatsAppUrl = computed(() => {
    const choice = this.activeChoice();
    return choice ? this.choiceWhatsAppUrl(choice) : this.genericWhatsAppUrl;
  });
  protected readonly mobileWhatsAppLabel = computed(() => {
    const choice = this.activeChoice();
    return choice ? `Preguntar por ${choice.actionLabel}` : 'WhatsApp';
  });

  ngAfterViewInit(): void {
    if (!('IntersectionObserver' in globalThis)) {
      return;
    }

    this.choiceObserver = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries.find((entry) => entry.isIntersecting);
        if (!activeEntry) {
          return;
        }

        const id = activeEntry.target.id;
        this.activeChoice.set(this.choices.find((choice) => choice.id === id) ?? null);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );

    this.actionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.visibleContextualActions.add(entry.target);
        } else {
          this.visibleContextualActions.delete(entry.target);
        }
      }

      this.contextualActionVisible.set(this.visibleContextualActions.size > 0);
    });

    const host = this.element.nativeElement;
    host.querySelectorAll('.choice').forEach((section) => this.choiceObserver?.observe(section));
    host
      .querySelectorAll('.choice__details .whatsapp-action')
      .forEach((action) => this.actionObserver?.observe(action));
  }

  ngOnDestroy(): void {
    this.choiceObserver?.disconnect();
    this.actionObserver?.disconnect();
  }

  protected choiceWhatsAppUrl(choice: ArrangementChoice): string {
    return this.whatsAppUrl(choice.whatsappMessage);
  }

  protected sampleWhatsAppUrl(choice: ArrangementChoice, sample: ArrangementSample): string {
    const imageUrl = new URL(sample.image, this.document.location.origin).href;
    const message = `${choice.whatsappMessage}\n\nMe gustó la muestra “${sample.name}”: ${imageUrl}\nNo tiene que ser idéntica; quiero usarla como referencia.`;
    return this.whatsAppUrl(message);
  }

  private whatsAppUrl(message: string): string {
    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }
}
