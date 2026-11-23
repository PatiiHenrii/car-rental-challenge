import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subscription, map, tap } from 'rxjs';
import { ReservationApi } from '../core/api';
import { toErrorMessage } from '../core/errors';
import { Reservation, ReservationRequest } from '../core/models';

/**
 * Reservations of one user. Reads update state directly; mutations return Observables so the
 * calling component can react (navigate, show a snackbar, display a form error).
 */
@Injectable({ providedIn: 'root' })
export class ReservationStore {
  private readonly api = inject(ReservationApi);

  private readonly _reservations = signal<Reservation[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _userId = signal<string | null>(null);
  private loadSub?: Subscription;

  readonly reservations = this._reservations.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  /** The user whose reservations are currently held. */
  readonly userId = this._userId.asReadonly();

  load(userId: string): void {
    this.loadSub?.unsubscribe(); // switching users quickly: latest request wins
    if (this._userId() !== userId) {
      this._reservations.set([]);
    }
    this._userId.set(userId);
    this._loading.set(true);
    this._error.set(null);
    this.loadSub = this.api.listByUser(userId).subscribe({
      next: (reservations) => {
        this._reservations.set(reservations);
        this._loading.set(false);
      },
      error: (err) => {
        this._error.set(toErrorMessage(err));
        this._loading.set(false);
      },
    });
  }

  clear(): void {
    this.loadSub?.unsubscribe();
    this._reservations.set([]);
    this._userId.set(null);
    this._loading.set(false);
    this._error.set(null);
  }

  findById(id: string): Reservation | undefined {
    return this._reservations().find((r) => r.id === id);
  }

  /** Emits the new reservation id. The list is reloaded, since POST only returns the id. */
  book(request: ReservationRequest): Observable<string> {
    return this.api.create(request).pipe(
      map((response) => response.reservation_id),
      tap(() => this.load(request.user_id)),
    );
  }

  update(id: string, request: ReservationRequest): Observable<Reservation> {
    return this.api.update(id, request).pipe(
      tap((updated) => this._reservations.update((list) => list.map((r) => (r.id === id ? updated : r)))),
    );
  }

  cancel(id: string): Observable<void> {
    return this.api.delete(id).pipe(
      tap(() => this._reservations.update((list) => list.filter((r) => r.id !== id))),
    );
  }
}
