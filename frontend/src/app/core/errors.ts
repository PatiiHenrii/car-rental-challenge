import { HttpErrorResponse } from '@angular/common/http';

/** Turns any failure into a user-facing message, preferring the backend's ProblemDetail. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Cannot reach the server. Please check that the backend is running.';
    }
    const body = error.error as { detail?: string; errors?: Record<string, string> } | null;
    if (body?.errors && Object.keys(body.errors).length > 0) {
      return Object.entries(body.errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join('; ');
    }
    if (body?.detail) {
      return body.detail;
    }
    return `Request failed (${error.status})`;
  }
  return 'Unexpected error. Please try again.';
}
