import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Control validator: a datetime-local value must not be in the past. */
export function notInPast(now: () => Date = () => new Date()): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) {
      return null; // `required` reports empty values
    }
    return new Date(value).getTime() < now().getTime() ? { pastDate: true } : null;
  };
}

/** Group validator: `dropoffTime` must be strictly after `pickupTime`. */
export const rentalPeriodValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const pickup = group.get('pickupTime')?.value as string | null;
  const dropoff = group.get('dropoffTime')?.value as string | null;
  if (!pickup || !dropoff) {
    return null;
  }
  return new Date(dropoff).getTime() <= new Date(pickup).getTime() ? { periodOrder: true } : null;
};
