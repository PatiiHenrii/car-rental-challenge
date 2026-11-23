import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { apiToInputValue, inputToApiValue, toLocalInputValue } from '../../core/dates';
import { notInPast, rentalPeriodValidator } from '../../core/validators';
import { CarStore } from '../../state/car-store';

/** Rental period picker that asks the backend which cars are free in that period. */
@Component({
  selector: 'app-availability-filter',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="filter" [formGroup]="form" (ngSubmit)="check()">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Pick-up</mat-label>
        <input matInput type="datetime-local" formControlName="pickupTime" [min]="minDate" />
        @if (form.controls.pickupTime.hasError('pastDate')) {
          <mat-error>Must be in the future</mat-error>
        }
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Drop-off</mat-label>
        <input matInput type="datetime-local" formControlName="dropoffTime" [min]="minDate" />
      </mat-form-field>
      <button mat-flat-button type="submit" [disabled]="form.invalid || store.checkingAvailability()">
        Check availability
      </button>
      @if (store.period()) {
        <button mat-button type="button" (click)="clear()">Clear</button>
      }
    </form>
    @if (form.hasError('periodOrder')) {
      <p class="form-error">Drop-off must be after pick-up.</p>
    }
  `,
  styles: `
    .filter { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .form-error { color: var(--mat-sys-error); margin: 8px 0 0; }
  `,
})
export class AvailabilityFilter {
  protected readonly store = inject(CarStore);
  protected readonly minDate = toLocalInputValue(new Date());

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      pickupTime: [this.initial('pickupTime'), [Validators.required, notInPast()]],
      dropoffTime: [this.initial('dropoffTime'), Validators.required],
    },
    { validators: rentalPeriodValidator },
  );

  protected check(): void {
    if (this.form.invalid) {
      return;
    }
    const { pickupTime, dropoffTime } = this.form.getRawValue();
    this.store.checkAvailability({
      pickupTime: inputToApiValue(pickupTime),
      dropoffTime: inputToApiValue(dropoffTime),
    });
  }

  protected clear(): void {
    this.form.reset({ pickupTime: '', dropoffTime: '' });
    this.store.clearAvailability();
  }

  /** Keep the previously checked period when navigating back to the list. */
  private initial(key: 'pickupTime' | 'dropoffTime'): string {
    const period = this.store.period();
    return period ? apiToInputValue(period[key]) : '';
  }
}
