import { CurrencyPipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { Observable, filter, switchMap } from 'rxjs';
import { apiToInputValue, billableDays, inputToApiValue, toLocalInputValue } from '../../core/dates';
import { toErrorMessage } from '../../core/errors';
import { ReservationRequest } from '../../core/models';
import { notInPast, rentalPeriodValidator } from '../../core/validators';
import { confirm } from '../../shared/confirm-dialog';
import { ErrorPanel } from '../../shared/error-panel';
import { CarStore } from '../../state/car-store';
import { ReservationStore } from '../../state/reservation-store';
import { UserStore } from '../../state/user-store';

/**
 * Booking form, used for both routes:
 *  - /cars/:carId/book?pickup=..&dropoff=..  (create)
 *  - /reservations/:reservationId/edit       (update)
 */
@Component({
  selector: 'app-reservation-form',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ErrorPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reservation-form.html',
  styleUrl: './reservation-form.scss',
})
export class ReservationForm {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly locale = inject(LOCALE_ID);
  protected readonly carStore = inject(CarStore);
  protected readonly reservationStore = inject(ReservationStore);
  protected readonly userStore = inject(UserStore);

  // Route bindings (withComponentInputBinding)
  readonly carId = input<string>();
  readonly reservationId = input<string>();
  readonly pickup = input<string>();
  readonly dropoff = input<string>();

  protected readonly isEdit = computed(() => !!this.reservationId());
  protected readonly minDate = toLocalInputValue(new Date());
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      carId: ['', Validators.required],
      pickupTime: ['', [Validators.required, notInPast()]],
      dropoffTime: ['', Validators.required],
    },
    { validators: rentalPeriodValidator },
  );

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Reservation being edited, once the current user's reservations are loaded. */
  protected readonly editTarget = computed(() => {
    const id = this.reservationId();
    return id ? (this.reservationStore.reservations().find((r) => r.id === id) ?? null) : null;
  });

  protected readonly editTargetMissing = computed(
    () =>
      this.isEdit() &&
      !this.reservationStore.loading() &&
      !this.reservationStore.error() &&
      this.reservationStore.userId() === this.userStore.currentUserId() &&
      this.editTarget() === null,
  );

  protected readonly selectedCar = computed(() => this.carStore.carsById().get(this.formValue().carId ?? '') ?? null);

  /** Client-side estimate; the backend computes the authoritative price. */
  protected readonly estimate = computed(() => {
    const { pickupTime, dropoffTime } = this.formValue();
    const car = this.selectedCar();
    if (!car || !pickupTime || !dropoffTime || this.form.hasError('periodOrder')) {
      return null;
    }
    const days = billableDays(pickupTime, dropoffTime);
    return { days, total: days * car.rate_per_day };
  });

  private patchedFromReservation = false;

  constructor() {
    this.carStore.load();

    // create mode: pre-fill from the route
    effect(() => {
      const carId = this.carId();
      const pickup = this.pickup();
      const dropoff = this.dropoff();
      if (this.isEdit()) {
        return;
      }
      untracked(() =>
        this.form.patchValue({
          carId: carId ?? '',
          pickupTime: pickup ? apiToInputValue(pickup) : '',
          dropoffTime: dropoff ? apiToInputValue(dropoff) : '',
        }),
      );
    });

    // edit mode: make sure the current user's reservations are loaded, then pre-fill once
    effect(() => {
      const userId = this.userStore.currentUserId();
      if (this.isEdit() && userId && untracked(() => this.reservationStore.userId()) !== userId) {
        untracked(() => this.reservationStore.load(userId));
      }
    });
    effect(() => {
      const reservation = this.editTarget();
      if (reservation && !this.patchedFromReservation) {
        this.patchedFromReservation = true;
        untracked(() =>
          this.form.patchValue({
            carId: reservation.car_id,
            pickupTime: apiToInputValue(reservation.pickup_time),
            dropoffTime: apiToInputValue(reservation.dropoff_time),
          }),
        );
      }
    });
  }

  protected submit(): void {
    this.submitError.set(null);
    const user = this.userStore.currentUser();
    if (this.form.invalid || !user) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: ReservationRequest = {
      car_id: value.carId,
      user_id: user.id,
      pickup_time: inputToApiValue(value.pickupTime),
      dropoff_time: inputToApiValue(value.dropoffTime),
    };
    const car = this.selectedCar();
    const estimate = this.estimate();

    confirm(this.dialog, {
      title: this.isEdit() ? 'Confirm changes' : 'Confirm booking',
      lines: [
        `Car: ${car ? `${car.manufacturer} ${car.model} (${car.license_plate})` : request.car_id}`,
        `Customer: ${user.name}`,
        `Pick-up: ${this.formatDateTime(request.pickup_time)}`,
        `Drop-off: ${this.formatDateTime(request.dropoff_time)}`,
        ...(estimate ? [`Estimated total: ${estimate.days} day(s), $${estimate.total.toFixed(2)}`] : []),
      ],
      confirmText: this.isEdit() ? 'Save changes' : 'Book now',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.submitting.set(true);
          return this.save(request);
        }),
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.snackBar.open(this.isEdit() ? 'Reservation updated' : 'Car booked!', 'OK', { duration: 3000 });
          this.router.navigate(['/reservations']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.submitError.set(toErrorMessage(err));
        },
      });
  }

  private save(request: ReservationRequest): Observable<unknown> {
    const id = this.reservationId();
    return id ? this.reservationStore.update(id, request) : this.reservationStore.book(request);
  }

  private formatDateTime(value: string): string {
    return formatDate(value, 'EEE, MMM d, y, h:mm a', this.locale);
  }
}
