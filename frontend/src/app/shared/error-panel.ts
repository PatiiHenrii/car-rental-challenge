import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-error-panel',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error" role="alert">
      <mat-icon>error</mat-icon>
      <span>{{ message() }}</span>
      @if (retryable()) {
        <button mat-button (click)="retry.emit()">Retry</button>
      }
    </div>
  `,
  styles: `
    .error {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px;
      background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container);
    }
    span { flex: 1; }
  `,
})
export class ErrorPanel {
  readonly message = input.required<string>();
  readonly retryable = input(true);
  readonly retry = output<void>();
}
