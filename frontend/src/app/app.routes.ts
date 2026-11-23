import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'cars' },
  {
    path: 'cars',
    title: 'Cars · Car Rental',
    loadComponent: () => import('./features/cars/car-list').then((m) => m.CarList),
  },
  {
    path: 'cars/:carId',
    title: 'Car details · Car Rental',
    loadComponent: () => import('./features/cars/car-detail').then((m) => m.CarDetail),
  },
  {
    path: 'cars/:carId/book',
    title: 'Book a car · Car Rental',
    loadComponent: () => import('./features/reservations/reservation-form').then((m) => m.ReservationForm),
  },
  {
    path: 'reservations',
    title: 'My reservations · Car Rental',
    loadComponent: () => import('./features/reservations/reservation-list').then((m) => m.ReservationList),
  },
  {
    path: 'reservations/:reservationId/edit',
    title: 'Edit reservation · Car Rental',
    loadComponent: () => import('./features/reservations/reservation-form').then((m) => m.ReservationForm),
  },
  { path: '**', redirectTo: 'cars' },
];
