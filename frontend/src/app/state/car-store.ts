import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CarApi } from '../core/api';
import { toErrorMessage } from '../core/errors';
import { Car, RentalPeriod } from '../core/models';

/**
 * The fleet, plus an optional availability check for a rental period.
 * Availability is date-based and computed by the backend; it never changes a car's status.
 */
@Injectable({ providedIn: 'root' })
export class CarStore {
  private readonly api = inject(CarApi);

  private readonly _cars = signal<Car[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _period = signal<RentalPeriod | null>(null);
  private readonly _availableIds = signal<ReadonlySet<string> | null>(null);
  private readonly _checkingAvailability = signal(false);
  private availabilitySub?: Subscription;

  readonly cars = this._cars.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly period = this._period.asReadonly();
  readonly checkingAvailability = this._checkingAvailability.asReadonly();
  readonly carsById = computed(() => new Map(this._cars().map((c) => [c.id, c])));
  readonly bookableCars = computed(() => this._cars().filter((c) => c.status === 'AVAILABLE'));

  /** Loads the fleet once; pass `force` to refresh. */
  load(force = false): void {
    if (this._loading() || (this._cars().length > 0 && !force)) {
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    this.api.list().subscribe({
      next: (cars) => {
        this._cars.set(cars);
        this._loading.set(false);
      },
      error: (err) => {
        this._error.set(toErrorMessage(err));
        this._loading.set(false);
      },
    });
  }

  /** null = no period selected; otherwise whether the car can be booked in the selected period. */
  isAvailableInPeriod(carId: string): boolean | null {
    const ids = this._availableIds();
    return ids ? ids.has(carId) : null;
  }

  checkAvailability(period: RentalPeriod): void {
    this.availabilitySub?.unsubscribe(); // latest request wins
    this._period.set(period);
    this._checkingAvailability.set(true);
    this._error.set(null);
    this.availabilitySub = this.api.list(period).subscribe({
      next: (available) => {
        this._availableIds.set(new Set(available.map((c) => c.id)));
        this._checkingAvailability.set(false);
      },
      error: (err) => {
        this._error.set(toErrorMessage(err));
        this._availableIds.set(null);
        this._checkingAvailability.set(false);
      },
    });
  }

  clearAvailability(): void {
    this.availabilitySub?.unsubscribe();
    this._period.set(null);
    this._availableIds.set(null);
    this._checkingAvailability.set(false);
  }
}
