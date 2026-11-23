import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { filter, switchMap, tap } from 'rxjs';
import { toErrorMessage } from '../../core/errors';
import { Reservation } from '../../core/models';
import { confirm } from '../../shared/confirm-dialog';
import { ErrorPanel } from '../../shared/error-panel';
import { CarStore } from '../../state/car-store';
import { ReservationStore } from '../../state/reservation-store';
import { UserStore } from '../../state/user-store';

@Component({
  selector: 'app-reservation-list',
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, ErrorPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reservation-list.html',
  styleUrl: './reservation-list.scss',
})
export class ReservationList {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly store = inject(ReservationStore);
  protected readonly carStore = inject(CarStore);
  protected readonly userStore = inject(UserStore);

  /** Id of the reservation whose cancellation is in flight. */
  protected readonly cancelling = signal<string | null>(null);

  constructor() {
    this.carStore.load();
    // (re)load whenever the selected customer changes
    effect(() => {
      const userId = this.userStore.currentUserId();
      untracked(() => (userId ? this.store.load(userId) : this.store.clear()));
    });
  }

  protected carLabel(reservation: Reservation): string {
    const car = this.carStore.carsById().get(reservation.car_id);
    return car ? `${car.manufacturer} ${car.model}` : 'Car';
  }

  protected plate(reservation: Reservation): string {
    return this.carStore.carsById().get(reservation.car_id)?.license_plate ?? '';
  }

  protected reload(): void {
    const userId = this.userStore.currentUserId();
    if (userId) {
      this.store.load(userId);
    }
  }

  protected cancel(reservation: Reservation): void {
    confirm(this.dialog, {
      title: 'Cancel reservation?',
      lines: [`${this.carLabel(reservation)} will be released. This cannot be undone.`],
      confirmText: 'Cancel reservation',
      cancelText: 'Keep it',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        tap(() => this.cancelling.set(reservation.id)),
        switchMap(() => this.store.cancel(reservation.id)),
      )
      .subscribe({
        next: () => {
          this.cancelling.set(null);
          this.snackBar.open('Reservation cancelled', 'OK', { duration: 3000 });
        },
        error: (err) => {
          this.cancelling.set(null);
          this.snackBar.open(toErrorMessage(err), 'Dismiss', { duration: 5000 });
        },
      });
  }
}
