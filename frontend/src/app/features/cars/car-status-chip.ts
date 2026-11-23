import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { CarStatus } from '../../core/models';

/** Fleet status, refined by the date-based availability when a period was checked. */
@Component({
  selector: 'app-car-status-chip',
  imports: [MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-chip-set>
      <mat-chip [class]="view().css" disableRipple>{{ view().label }}</mat-chip>
    </mat-chip-set>
  `,
  styles: `
    .ok { --mat-chip-elevated-container-color: #d7f5dd; --mat-chip-label-text-color: #0d5d22; }
    .warn { --mat-chip-elevated-container-color: #ffe0b2; --mat-chip-label-text-color: #7a3e00; }
    .bad { --mat-chip-elevated-container-color: var(--mat-sys-error-container); --mat-chip-label-text-color: var(--mat-sys-on-error-container); }
  `,
})
export class CarStatusChip {
  readonly status = input.required<CarStatus>();
  /** null when no rental period has been checked. */
  readonly availableInPeriod = input<boolean | null>(null);

  protected readonly view = computed(() => {
    if (this.status() === 'MAINTENANCE') {
      return { label: 'In maintenance', css: 'bad' };
    }
    const available = this.availableInPeriod();
    if (available === null) {
      return { label: 'Available', css: 'ok' };
    }
    return available ? { label: 'Free for your dates', css: 'ok' } : { label: 'Booked for your dates', css: 'warn' };
  });
}
