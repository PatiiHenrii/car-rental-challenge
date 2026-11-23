# CLAUDE.md

Car rental management system: a Spring Boot backend (`backend/`) and an Angular frontend (`frontend/`) in one repo.
The functional reference is `claude/Front End Engineer Assignment.pdf`. The API contract, business rules and deviations from the PDF are in `README.md`; keep it in sync when they change.

Guiding principle: simple, maintainable, incremental. No new libraries or layers unless there is a concrete need.

## Environment and commands

This machine's defaults are JDK 17 and Node 20. Neither works with this project, so always select the right versions:

```bash
# Backend (Java 21 lives outside the system path)
cd backend
JAVA_HOME=~/.jdks/jdk-21.0.13.1+2 ./mvnw test
JAVA_HOME=~/.jdks/jdk-21.0.13.1+2 ./mvnw spring-boot:run      # http://localhost:8081/rentals

# Frontend (Angular 22 needs Node >= 22.22)
cd frontend
source ~/.nvm/nvm.sh && nvm use 24
npx ng test --watch=false
npx ng build
npm start                                                      # http://localhost:4300, proxies /rentals -> :8081
```

- **Ports:** 8080 and 4200 are taken by other local services, so do not switch back to them. The backend port can be overridden with `PORT`; if it changes, update `frontend/proxy.conf.json` too.
- **Stopping servers:** stop background servers by PID. `pkill -f <pattern>` can match the calling shell and kill it.
- **UI checks:** headless `google-chrome` is available. A Chrome DevTools (CDP) script can set `localStorage` before taking screenshots.

## Versions

Java 21, Spring Boot 4.2 (Jackson 3, Spring Framework 7), Maven wrapper, H2 in memory. Angular 22.3 (standalone, zoneless), Angular Material 3, TypeScript strict mode with `strictTemplates`, Vitest.

## Established decisions (do not change without asking)

- **Users:** a `User` entity has many `Reservation`s (one-to-many). There is no authentication. The current user is picked in the toolbar and its id is kept in `localStorage` (`car-rental.current-user-id`).
- **Reservation payload:** requests carry `user_id`, not `customer_name`. Responses carry both `user_id` and `customer_name`, which is the user's name.
- **Availability:** always calculated from reservations for the requested dates. Booking never changes `Car.status`. That status describes the fleet only: `AVAILABLE` or `MAINTENANCE`.
- **Cancellation:** a hard delete (`DELETE` returns 204). `ReservationStatus` has only `CONFIRMED`.
- **Price:** computed on the server only. Every started 24h period is a full day, minimum 1, using `BigDecimal`. The frontend's `billableDays` repeats this formula only to show an estimate. If the rule changes, change both and their tests.
- **Overlap rule:** periods are half-open, so `existing.pickup < new.dropoff AND existing.dropoff > new.pickup` is an overlap. An update excludes the reservation's own id from the check.
- **Dates:** ISO local date-times without time zone (`2030-01-31T10:00:00`). The frontend uses `<input type="datetime-local">` and the helpers in `core/dates.ts`.
- **State:** Angular signals for state, RxJS Observables for HTTP. No NgRx.
- **Tests:** use Vitest. Karma is deprecated in Angular 22.

## Backend conventions

- **Packages:** grouped by feature, `com.example.rental.{car,user,reservation,common}`. Each feature has an entity, a `JpaRepository`, a service and a controller.
- **DTOs:** Java records, never entities. Each has a static `from(entity)` mapper. Group a feature's DTOs in `XxxDtos` when there are several.
- **JSON naming:** the global `spring.jackson.property-naming-strategy=SNAKE_CASE`. Do not add per-field `@JsonProperty`.
- **Errors:** throw `NotFoundException` (404), `ConflictException` (409) or `BusinessRuleException` (400). `GlobalExceptionHandler` turns them into a `ProblemDetail`. Bean Validation failures return a `ProblemDetail` plus an `errors` map keyed by snake_case field name.
- **Validation:** Bean Validation (`@NotBlank`, `@NotNull`) checks request shape. Rules that span several fields or need the database live in the service.
- **Transactions and time:** services are `@Transactional`, with `readOnly` for queries. `open-in-view` is off, so map entities to DTOs inside the service. Inject the `Clock` bean wherever "now" matters.
- **Entities:** ids are UUID strings (seed data uses short ids like `c1` and `u1`). Constructors are protected and exist only for JPA. Expose behaviour methods (such as `reschedule(...)`) instead of setters.
- **Seed data:** `src/main/resources/data.sql`. Tables are `users`, `cars` and `reservations`; the car's year column is `manufacture_year`.

## Frontend conventions

- **Layout:**
  - `core/` holds models, HTTP services, helpers and validators.
  - `state/` holds root signal stores.
  - `shared/` holds reusable UI.
  - `features/<area>/` holds the routed components.
- **File naming:** the 2025 style guide (`car-list.ts`, class `CarList`, no `.component` suffix).
- **Models:** `core/models.ts` mirrors the snake_case contract exactly. Do not map it to camelCase.
- **HTTP services:** `core/api.ts` holds thin, stateless services (`CarApi`, `UserApi`, `ReservationApi`), each returning Observables. The base URL is `API_BASE_URL = '/rentals'`.
- **Stores:**
  - `@Injectable({ providedIn: 'root' })`, with private writable signals exposed through `asReadonly()`, plus `computed` views.
  - Each store has `loading` and `error` signals, and error text always comes from `toErrorMessage()`.
  - Reads update state themselves. Mutations return Observables that update state in `tap`, so the component decides what happens next (navigate, snackbar, show a form error).
  - When a newer request replaces an older one, unsubscribe the older subscription.
- **Components:**
  - Standalone, with `ChangeDetectionStrategy.OnPush`. Use `inject()`, `input()` and `output()`, and `@if`/`@for`/`@defer` control flow.
  - Route params arrive as signal inputs through `withComponentInputBinding()`. Routes are lazy with `loadComponent`.
  - In an `effect`, wrap side effects (store calls, `patchValue`) in `untracked()`.
- **Forms:** typed reactive forms built with `NonNullableFormBuilder`. Shared validators live in `core/validators.ts`. Book and edit share one form, `ReservationForm`.
- **UX states:** every data view handles loading (spinner), error (`<app-error-panel>` with retry) and empty (`.empty-state`). Saving or deleting asks first through `confirm()` in `shared/confirm-dialog.ts`.
- **Styling:** Material components and `--mat-sys-*` tokens. Global helper classes (`.page-header`, `.center`, `.empty-state`, `.muted`) are in `styles.scss`. Form fields default to the outline appearance.

## Testing expectations

Add or adjust tests with every behaviour change, and run both suites before calling something done.

- **Backend business rules:** plain unit tests with Mockito and a fixed `Clock`, in `ReservationServiceTest`.
- **Backend API behaviour:** `@SpringBootTest` with `@AutoConfigureMockMvc` (package `org.springframework.boot.webmvc.test.autoconfigure`) and `@Transactional`, against the seed data, in `ReservationApiIntegrationTest`. Use dates far in the future.
- **Frontend stores:** `provideHttpClient()` with `provideHttpClientTesting()` and `HttpTestingController`, plus `http.verify()` in `afterEach`.
- **Frontend components:** drive them through the DOM. Stub `MatDialog` and spy on `Router.navigate`.
