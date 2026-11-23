import { FormControl, FormGroup } from '@angular/forms';
import { notInPast, rentalPeriodValidator } from './validators';

describe('validators', () => {
  const now = () => new Date(2030, 0, 10, 12, 0);

  it('notInPast rejects past dates and ignores empty values', () => {
    const validator = notInPast(now);
    expect(validator(new FormControl('2030-01-10T11:59'))).toEqual({ pastDate: true });
    expect(validator(new FormControl('2030-01-10T12:30'))).toBeNull();
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('rentalPeriodValidator requires drop-off strictly after pick-up', () => {
    const group = (pickupTime: string, dropoffTime: string) =>
      new FormGroup({ pickupTime: new FormControl(pickupTime), dropoffTime: new FormControl(dropoffTime) });

    expect(rentalPeriodValidator(group('2030-01-02T10:00', '2030-01-01T10:00'))).toEqual({ periodOrder: true });
    expect(rentalPeriodValidator(group('2030-01-02T10:00', '2030-01-02T10:00'))).toEqual({ periodOrder: true });
    expect(rentalPeriodValidator(group('2030-01-01T10:00', '2030-01-02T10:00'))).toBeNull();
    expect(rentalPeriodValidator(group('', '2030-01-02T10:00'))).toBeNull();
  });
});
