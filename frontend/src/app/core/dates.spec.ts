import { apiToInputValue, billableDays, inputToApiValue, toLocalInputValue } from './dates';

describe('dates', () => {
  it('converts between API and datetime-local formats', () => {
    expect(apiToInputValue('2030-01-31T10:15:00')).toBe('2030-01-31T10:15');
    expect(inputToApiValue('2030-01-31T10:15')).toBe('2030-01-31T10:15:00');
    expect(toLocalInputValue(new Date(2030, 0, 5, 9, 7))).toBe('2030-01-05T09:07');
  });

  it('bills every started day, with a minimum of one (same rule as the backend)', () => {
    expect(billableDays('2030-01-01T10:00', '2030-01-04T10:00')).toBe(3);
    expect(billableDays('2030-01-01T10:00', '2030-01-03T10:01')).toBe(3);
    expect(billableDays('2030-01-01T10:00', '2030-01-01T12:00')).toBe(1);
  });
});
