import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** A category's icon on a tinted circle of its colour. */
@Component({
  selector: 'app-category-icon',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<mat-icon aria-hidden="true">{{ icon() || 'label' }}</mat-icon>`,
  host: {
    '[style.--c]': 'tint()',
    '[style.--s]': "size() + 'px'",
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  styles: [
    `
      :host {
        flex: 0 0 auto;
        display: inline-grid;
        place-items: center;
        border-radius: 50%;
        color: var(--c);
        background: color-mix(in srgb, var(--c) 14%, white);
      }
      mat-icon {
        width: 60%;
        height: 60%;
        font-size: calc(var(--s) * 0.55);
        line-height: 1;
        display: grid;
        place-items: center;
      }
    `,
  ],
})
export class CategoryIconComponent {
  readonly icon = input<string | null>(null);
  readonly color = input<string | null>(null);
  readonly size = input(36);
  readonly tint = computed(() => this.color() || '#78909c');
}
