import { HttpErrorResponse } from '@angular/common/http';
import { toErrorMessage } from './errors';

describe('toErrorMessage', () => {
  it('uses the ProblemDetail detail', () => {
    const error = new HttpErrorResponse({ status: 409, error: { detail: 'Tesla Model 3 is already booked' } });
    expect(toErrorMessage(error)).toBe('Tesla Model 3 is already booked');
  });

  it('lists field validation errors', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { detail: 'Validation failed', errors: { car_id: 'must not be blank' } },
    });
    expect(toErrorMessage(error)).toBe('car_id: must not be blank');
  });

  it('explains network failures', () => {
    expect(toErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Cannot reach the server');
  });

  it('falls back for unknown errors', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('Unexpected error. Please try again.');
  });
});
