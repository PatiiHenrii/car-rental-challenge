import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { UserApi } from '../core/api';
import { toErrorMessage } from '../core/errors';
import { User } from '../core/models';

const STORAGE_KEY = 'car-rental.current-user-id';

/** Users and the "current user" (no authentication: picked in the toolbar, persisted locally). */
@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly api = inject(UserApi);

  private readonly _users = signal<User[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentUserId = signal<string | null>(readStoredUserId());

  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentUserId = this._currentUserId.asReadonly();
  readonly currentUser = computed(() => this._users().find((u) => u.id === this._currentUserId()) ?? null);

  constructor() {
    effect(() => writeStoredUserId(this._currentUserId()));
  }

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.list().subscribe({
      next: (users) => {
        this._users.set(users);
        this._loading.set(false);
        // drop a stale selection (e.g. the in-memory DB was reset)
        if (this._currentUserId() && !users.some((u) => u.id === this._currentUserId())) {
          this._currentUserId.set(null);
        }
      },
      error: (err) => {
        this._error.set(toErrorMessage(err));
        this._loading.set(false);
      },
    });
  }

  selectUser(id: string | null): void {
    this._currentUserId.set(id);
  }
}

function readStoredUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredUserId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // storage unavailable (private mode): selection simply won't survive a refresh
  }
}
