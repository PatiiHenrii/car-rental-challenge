import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Reservation, ReservationRequest } from '../core/models';
import { ReservationStore } from './reservation-store';

const reservation = (id: string, overrides: Partial<Reservation> = {}): Reservation => ({
  id,
  car_id: 'c1',
  user_id: 'u1',
  customer_name: 'Alice',
  pickup_time: '2030-01-01T10:00:00',
  dropoff_time: '2030-01-03T10:00:00',
  total_price: 90,
  status: 'CONFIRMED',
  ...overrides,
});

describe('ReservationStore', () => {
  let store: ReservationStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(ReservationStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function loadWith(reservations: Reservation[]): void {
    store.load('u1');
    http.expectOne('/rentals/reservations?userId=u1').flush(reservations);
  }

  it('loads reservations and toggles the loading flag', () => {
    store.load('u1');
    expect(store.loading()).toBe(true);

    http.expectOne('/rentals/reservations?userId=u1').flush([reservation('r1')]);

    expect(store.loading()).toBe(false);
    expect(store.reservations().map((r) => r.id)).toEqual(['r1']);
    expect(store.userId()).toBe('u1');
  });

  it('exposes a readable error when loading fails', () => {
    store.load('u1');
    http
      .expectOne('/rentals/reservations?userId=u1')
      .flush({ detail: 'User u1 not found' }, { status: 404, statusText: 'Not Found' });

    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('User u1 not found');
    expect(store.reservations()).toEqual([]);
  });

  it('reloads the list after booking, since POST only returns the id', () => {
    const request: ReservationRequest = {
      car_id: 'c1',
      user_id: 'u1',
      pickup_time: '2030-01-01T10:00:00',
      dropoff_time: '2030-01-03T10:00:00',
    };
    let createdId: string | undefined;
    store.book(request).subscribe((id) => (createdId = id));

    const post = http.expectOne({ method: 'POST', url: '/rentals/reservations' });
    expect(post.request.body).toEqual(request);
    post.flush({ reservation_id: 'r9', success: true });
    http.expectOne('/rentals/reservations?userId=u1').flush([reservation('r9')]);

    expect(createdId).toBe('r9');
    expect(store.reservations().map((r) => r.id)).toEqual(['r9']);
  });

  it('replaces the reservation in place after an update', () => {
    loadWith([reservation('r1'), reservation('r2')]);

    store.update('r1', { car_id: 'c2', user_id: 'u1', pickup_time: 'x', dropoff_time: 'y' }).subscribe();
    http.expectOne({ method: 'PUT', url: '/rentals/reservations/r1' }).flush(reservation('r1', { car_id: 'c2' }));

    expect(store.reservations().map((r) => r.car_id)).toEqual(['c2', 'c1']);
  });

  it('removes the reservation after a successful cancel', () => {
    loadWith([reservation('r1'), reservation('r2')]);

    store.cancel('r1').subscribe();
    http.expectOne({ method: 'DELETE', url: '/rentals/reservations/r1' }).flush(null, { status: 204, statusText: 'No Content' });

    expect(store.reservations().map((r) => r.id)).toEqual(['r2']);
  });

  it('keeps the reservation when cancel fails', () => {
    loadWith([reservation('r1')]);
    let failed = false;

    store.cancel('r1').subscribe({ error: () => (failed = true) });
    http.expectOne('/rentals/reservations/r1').flush(null, { status: 500, statusText: 'Server Error' });

    expect(failed).toBe(true);
    expect(store.reservations().length).toBe(1);
  });
});
