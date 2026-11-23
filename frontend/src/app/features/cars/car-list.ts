import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Car } from '../../core/models';
import { ErrorPanel } from '../../shared/error-panel';
import { CarStore } from '../../state/car-store';
import { AvailabilityFilter } from './availability-filter';
import { CarStatusChip } from './car-status-chip';

@Component({
  selector: 'app-car-list',
  imports: [
    CurrencyPipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    AvailabilityFilter,
    CarStatusChip,
    ErrorPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './car-list.html',
  styleUrl: './car-list.scss',
})
export class CarList {
  protected readonly store = inject(CarStore);

  /** Query params that pre-fill the booking form with the checked period. */
  protected readonly bookingParams = computed(() => {
    const period = this.store.period();
    return period ? { pickup: period.pickupTime, dropoff: period.dropoffTime } : {};
  });

  constructor() {
    this.store.load();
  }

  protected canBook(car: Car): boolean {
    return car.status === 'AVAILABLE' && this.store.isAvailableInPeriod(car.id) !== false;
  }
}
