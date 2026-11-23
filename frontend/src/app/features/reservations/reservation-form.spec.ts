import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Car } from '../../core/models';
import { UserStore } from '../../state/user-store';
import { ReservationForm } from './reservation-form';

const cars: Car[] = [
  { id: 'c1', manufacturer: 'Toyota', model: 'Corolla', license_plate: 'A-1', year: 2023, rate_per_day: 45, status: 'AVAILABLE' },
];

describe('ReservationForm (create mode)', () => {
  let fixture: ComponentFixture<ReservationForm>;
  let http: HttpTestingController;
  let dialogOpen: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    dialogOpen = vi.fn(() => ({ afterClosed: () => of(true) }));
    TestBed.configureTestingModule({
      imports: [ReservationForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open: dialogOpen } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    // a customer is selected
    const users = TestBed.inject(UserStore);
    users.load();
    http.expectOne('/rentals/users').flush([{ id: 'u1', name: 'Alice' }]);
    users.selectUser('u1');

    fixture = TestBed.createComponent(ReservationForm);
    fixture.componentRef.setInput('carId', 'c1');
    await fixture.whenStable();
    http.expectOne('/rentals/cars').flush(cars);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function setPeriod(pickup: string, dropoff: string): void {
    const [pickupInput, dropoffInput] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[type="datetime-local"]'),
    );
    pickupInput.value = pickup;
    pickupInput.dispatchEvent(new Event('input'));
    dropoffInput.value = dropoff;
    dropoffInput.dispatchEvent(new Event('input'));
    dropoffInput.dispatchEvent(new Event('blur'));
  }

  async function submit(): Promise<void> {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  it('blocks submission when drop-off is before pick-up', async () => {
    setPeriod('2099-01-05T10:00', '2099-01-03T10:00');
    await fixture.whenStable();

    await submit();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Drop-off must be after pick-up');
    expect(dialogOpen).not.toHaveBeenCalled();
  });

  it('shows the estimated price, confirms, books and navigates', async () => {
    setPeriod('2099-01-01T10:00', '2099-01-03T10:00');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('$90.00');

    await submit();

    expect(dialogOpen).toHaveBeenCalledTimes(1);
    const post = http.expectOne({ method: 'POST', url: '/rentals/reservations' });
    expect(post.request.body).toEqual({
      car_id: 'c1',
      user_id: 'u1',
      pickup_time: '2099-01-01T10:00:00',
      dropoff_time: '2099-01-03T10:00:00',
    });
    post.flush({ reservation_id: 'r1', success: true });
    http.expectOne('/rentals/reservations?userId=u1').flush([]);

    expect(navigate).toHaveBeenCalledWith(['/reservations']);
  });

  it('shows the backend message when the car is already booked', async () => {
    setPeriod('2099-01-01T10:00', '2099-01-03T10:00');
    await submit();

    http
      .expectOne({ method: 'POST', url: '/rentals/reservations' })
      .flush({ detail: 'Toyota Corolla is already booked for the selected period' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('already booked for the selected period');
    expect(navigate).not.toHaveBeenCalled();
  });
});
