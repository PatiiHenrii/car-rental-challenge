import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CarApi } from '../../core/api';
import { toErrorMessage } from '../../core/errors';
import { Car } from '../../core/models';
import { ErrorPanel } from '../../shared/error-panel';
import { CarStore } from '../../state/car-store';
import { CarStatusChip } from './car-status-chip';

@Component({
  selector: 'app-car-detail',
  imports: [CurrencyPipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    CarStatusChip, ErrorPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a mat-button routerLink="/cars"><mat-icon>arrow_back</mat-icon> All cars</a>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="48" /></div>
    } @else if (error(); as error) {
      <app-error-panel [message]="error" [retryable]="!notFound()" (retry)="fetch(carId())" />
    } @else if (car(); as car) {
      <mat-card appearance="outlined" class="detail">
        <mat-card-header>
          <mat-card-title>{{ car.manufacturer }} {{ car.model }}</mat-card-title>
          <mat-card-subtitle>{{ car.year }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <dl>
            <dt>Manufacturer</dt><dd>{{ car.manufacturer }}</dd>
            <dt>Model</dt><dd>{{ car.model }}</dd>
            <dt>Year</dt><dd>{{ car.year }}</dd>
            <dt>License plate</dt><dd>{{ car.license_plate }}</dd>
            <dt>Daily rate</dt><dd>{{ car.rate_per_day | currency }}</dd>
            <dt>Status</dt>
            <dd><app-car-status-chip [status]="car.status" [availableInPeriod]="availableInPeriod()" /></dd>
          </dl>
        </mat-card-content>
        <mat-card-actions align="end">
          @if (car.status === 'AVAILABLE') {
            <a mat-flat-button [routerLink]="['/cars', car.id, 'book']" [queryParams]="bookingParams()">
              Book this car
            </a>
          } @else {
            <span class="muted">This car is in maintenance and cannot be booked.</span>
          }
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: `
    .detail { margin-top: 16px; max-width: 560px; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 24px; margin: 16px 0 0; align-items: center; }
    dt { color: var(--mat-sys-on-surface-variant); }
    dd { margin: 0; }
    app-error-panel { display: block; margin-top: 16px; }
  `,
})
export class CarDetail {
  private readonly api = inject(CarApi);
  private readonly carStore = inject(CarStore);
  private sub?: Subscription;

  /** Bound from the `:carId` route parameter. */
  readonly carId = input.required<string>();

  protected readonly car = signal<Car | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notFound = signal(false);
  protected readonly availableInPeriod = computed(() => this.carStore.isAvailableInPeriod(this.carId()));
  protected readonly bookingParams = computed(() => {
    const period = this.carStore.period();
    return period ? { pickup: period.pickupTime, dropoff: period.dropoffTime } : {};
  });

  constructor() {
    // re-fetch whenever the route parameter changes
    effect(() => {
      const id = this.carId();
      untracked(() => this.fetch(id));
    });
  }

  protected fetch(id: string): void {
    this.sub?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    this.sub = this.api.get(id).subscribe({
      next: (car) => {
        this.car.set(car);
        this.loading.set(false);
      },
      error: (err) => {
        this.notFound.set(err?.status === 404);
        this.error.set(toErrorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
