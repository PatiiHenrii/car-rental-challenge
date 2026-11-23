import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Car } from '../core/models';
import { CarStore } from './car-store';

const car = (id: string, status: Car['status'] = 'AVAILABLE'): Car => ({
  id,
  manufacturer: 'Toyota',
  model: 'Corolla',
  license_plate: `P-${id}`,
  year: 2023,
  rate_per_day: 45,
  status,
});

describe('CarStore', () => {
  let store: CarStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(CarStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the fleet once and caches it', () => {
    store.load();
    http.expectOne('/rentals/cars').flush([car('c1'), car('c2', 'MAINTENANCE')]);

    store.load(); // cached: no second request
    expect(store.cars().length).toBe(2);
    expect(store.bookableCars().map((c) => c.id)).toEqual(['c1']);
    expect(store.carsById().get('c2')?.status).toBe('MAINTENANCE');
  });

  it('computes date-based availability without changing car status', () => {
    store.load();
    http.expectOne('/rentals/cars').flush([car('c1'), car('c2')]);
    expect(store.isAvailableInPeriod('c1')).toBeNull();

    store.checkAvailability({ pickupTime: '2030-01-01T10:00:00', dropoffTime: '2030-01-02T10:00:00' });
    http
      .expectOne('/rentals/cars?pickupTime=2030-01-01T10:00:00&dropoffTime=2030-01-02T10:00:00')
      .flush([car('c2')]);

    expect(store.isAvailableInPeriod('c1')).toBe(false);
    expect(store.isAvailableInPeriod('c2')).toBe(true);
    expect(store.cars().every((c) => c.status === 'AVAILABLE')).toBe(true);

    store.clearAvailability();
    expect(store.isAvailableInPeriod('c1')).toBeNull();
  });

  it('exposes an error when the API is unreachable', () => {
    store.load();
    http.expectOne('/rentals/cars').error(new ProgressEvent('error'), { status: 0 });

    expect(store.loading()).toBe(false);
    expect(store.error()).toContain('Cannot reach the server');
  });
});
