import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BookingResponse, Car, RentalPeriod, Reservation, ReservationRequest, User } from './models';

export const API_BASE_URL = '/rentals';

/** Thin HttpClient wrappers: one method per backend endpoint, no state. */
@Injectable({ providedIn: 'root' })
export class CarApi {
  private readonly http = inject(HttpClient);

  /** Whole fleet, or only the cars bookable in the given period. */
  list(period?: RentalPeriod): Observable<Car[]> {
    let params = new HttpParams();
    if (period) {
      params = params.set('pickupTime', period.pickupTime).set('dropoffTime', period.dropoffTime);
    }
    return this.http.get<Car[]>(`${API_BASE_URL}/cars`, { params });
  }

  get(id: string): Observable<Car> {
    return this.http.get<Car>(`${API_BASE_URL}/cars/${encodeURIComponent(id)}`);
  }
}

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);

  list(): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE_URL}/users`);
  }
}

@Injectable({ providedIn: 'root' })
export class ReservationApi {
  private readonly http = inject(HttpClient);

  listByUser(userId: string): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${API_BASE_URL}/reservations`, { params: { userId } });
  }

  create(request: ReservationRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${API_BASE_URL}/reservations`, request);
  }

  update(id: string, request: ReservationRequest): Observable<Reservation> {
    return this.http.put<Reservation>(`${API_BASE_URL}/reservations/${encodeURIComponent(id)}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/reservations/${encodeURIComponent(id)}`);
  }
}
