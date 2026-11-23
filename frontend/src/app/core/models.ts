/** Wire types: they mirror the backend's snake_case JSON contract exactly. */

export type CarStatus = 'AVAILABLE' | 'MAINTENANCE';

export interface Car {
  id: string;
  manufacturer: string;
  model: string;
  license_plate: string;
  year: number;
  rate_per_day: number;
  status: CarStatus;
}

export interface User {
  id: string;
  name: string;
}

export interface Reservation {
  id: string;
  car_id: string;
  user_id: string;
  customer_name: string;
  /** ISO local date-time, e.g. 2030-01-31T10:00:00 */
  pickup_time: string;
  dropoff_time: string;
  total_price: number;
  status: 'CONFIRMED';
}

export interface ReservationRequest {
  car_id: string;
  user_id: string;
  pickup_time: string;
  dropoff_time: string;
}

export interface BookingResponse {
  reservation_id: string;
  success: boolean;
}

export interface RentalPeriod {
  pickupTime: string;
  dropoffTime: string;
}
