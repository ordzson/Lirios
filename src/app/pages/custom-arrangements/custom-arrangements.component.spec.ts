import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CustomArrangementsComponent } from './custom-arrangements.component';

describe('CustomArrangementsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomArrangementsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('presents three approachable choices without ranking language', () => {
    const fixture = TestBed.createComponent(CustomArrangementsComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const choiceTitles = Array.from(element.querySelectorAll('.choice h2')).map((title) =>
      title.textContent?.trim(),
    );
    const visibleText = element.textContent ?? '';

    expect(choiceTitles).toEqual(['Un detalle', 'Una ocasión', 'Una historia']);
    expect(visibleText.toLocaleLowerCase()).not.toMatch(/\b(tier|nivel)\b/);
  });

  it('creates distinct WhatsApp messages and includes the selected sample image', () => {
    const fixture = TestBed.createComponent(CustomArrangementsComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const choiceLinks = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.choice__details .whatsapp-action'),
    );
    const sampleLinks = Array.from(element.querySelectorAll<HTMLAnchorElement>('.sample__meta a'));

    expect(choiceLinks).toHaveLength(3);
    expect(new Set(choiceLinks.map((link) => link.href)).size).toBe(3);
    expect(choiceLinks.every((link) => link.href.startsWith('https://wa.me/50250746766'))).toBe(
      true,
    );
    expect(sampleLinks).toHaveLength(8);
    expect(decodeURIComponent(sampleLinks[0].href)).toContain('Lirios carmesí');
    expect(decodeURIComponent(sampleLinks[0].href)).toContain(
      '/assets/pics/retouched/webp/arreglo_tier1-retouched-full.webp',
    );
  });
});
