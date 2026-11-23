# Car Rental Management System

Full-stack implementation of the *Front End Engineer Assignment*. The mocked API is replaced by a real backend:

| Part | Stack |
|---|---|
| `backend/` | Java 21, Spring Boot 4.2, Spring Data JPA, H2 (in-memory), Bean Validation, Maven |
| `frontend/` | Angular 22 (standalone, zoneless, signals), Angular Material 3, Reactive Forms, Vitest |

## Running locally

Prerequisites: JDK 21 and Node 22.22+ / 24.

```bash
# 1. Backend: http://localhost:8081/rentals  (H2 console: /rentals/h2-console, JDBC URL jdbc:h2:mem:rental)
cd backend
./mvnw spring-boot:run

# 2. Frontend: http://localhost:4300  (proxies /rentals to the backend, so no CORS setup is needed)
cd frontend
npm install
npm start
```

The ports are 8081 and 4300 instead of the defaults to avoid clashes with other local services. Override the backend port with `PORT=9090 ./mvnw spring-boot:run` and update `frontend/proxy.conf.json` to match.

The database is seeded on every start (`backend/src/main/resources/data.sql`) with 6 cars (one in maintenance) and 2 customers. There is no authentication: choose the customer in the toolbar. The selection is kept in `localStorage`.

## Tests

```bash
cd backend && ./mvnw test           # 20 tests: pricing, business rules (Mockito), API integration (MockMvc + H2)
cd frontend && npm test -- --watch=false   # 21 tests: stores (HttpTestingController), validators, booking form
```

## REST API

Base path `/rentals`. JSON is snake_case, as in the assignment. Errors are [RFC 9457 ProblemDetail](https://www.rfc-editor.org/rfc/rfc9457) objects: `{status, title, detail}`, plus `errors` (field → message) for validation failures.

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/cars` | optional `?pickupTime=&dropoffTime=` | `200 Car[]` (with a period: only cars bookable in it) | 400 |
| GET | `/cars/{id}` | | `200 Car` | 404 |
| GET | `/users` | | `200 User[]` | |
| GET | `/users/{id}` | | `200 User` | 404 |
| POST | `/users` | `{name}` | `201 User` | 400, 409 |
| GET | `/reservations?userId={id}` | | `200 Reservation[]` | 400, 404 |
| POST | `/reservations` | `ReservationRequest` | `201 {reservation_id, success}` | 400, 404, 409 |
| PUT | `/reservations/{id}` | `ReservationRequest` | `200 Reservation` | 400, 404, 409 |
| DELETE | `/reservations/{id}` | | `204` | 404 |

```jsonc
// Car
{"id":"c1","manufacturer":"Toyota","model":"Corolla","license_plate":"ABC-1001","year":2023,"rate_per_day":45.00,"status":"AVAILABLE"}
// ReservationRequest
{"car_id":"c1","user_id":"u1","pickup_time":"2030-05-01T10:00:00","dropoff_time":"2030-05-04T10:00:00"}
// Reservation
{"id":"…","car_id":"c1","user_id":"u1","customer_name":"Alice Johnson","pickup_time":"…","dropoff_time":"…","total_price":135.00,"status":"CONFIRMED"}
```

### Business rules (`ReservationService`)

- `pickup_time` must be before `dropoff_time` and not in the past (400).
- The car must exist (404) and not be in `MAINTENANCE` (409).
- A car cannot have overlapping reservations (409). Periods are half-open, so back-to-back bookings are allowed. On update, the reservation's own period is ignored when checking for overlaps.
- A reservation cannot be moved to another user (400).
- Price = `rate_per_day × billable days`, where every started 24h period counts as a full day (minimum 1). It is always computed on the server. The UI shows the same formula only as an estimate.
- Availability is computed from reservations for the requested dates. Booking never changes a car's `status`, which only describes the fleet (`AVAILABLE` / `MAINTENANCE`).
- Cancelling a reservation deletes it (hard delete).

## Design notes

**Backend:** packaged by feature (`car`, `user`, `reservation`, `common`), with a controller → service → repository flow in each. Entities are never exposed; records act as DTOs. A single `@RestControllerAdvice` maps exceptions to ProblemDetail. Snake_case is configured globally (`spring.jackson.property-naming-strategy`), so Java code stays idiomatic. A `Clock` bean makes the "not in the past" rule testable.

**Frontend:**
- `core/` holds the wire models, thin `HttpClient` services returning Observables, error/date helpers and form validators.
- `state/` holds the root signal stores (`CarStore`, `ReservationStore`, `UserStore`). Each exposes read-only signals (`data`, `loading`, `error`) and `computed` views. Mutations return Observables so a component can react, for example by navigating or showing a form error.
- `features/` holds the lazy-loaded routed components:
  - `/cars` (with a date-range availability check)
  - `/cars/:carId`
  - `/cars/:carId/book`
  - `/reservations`
  - `/reservations/:reservationId/edit`
  
  Route params are bound to signal inputs with `withComponentInputBinding()`.
- One reactive form is used for both create and edit. A confirmation dialog (`MatDialog`) appears before the booking or change is saved.
- The availability filter is loaded with `@defer (on idle)`, so the fleet renders first.

## Deviations from the assignment and trade-offs

- **Users:** the assignment's API has `GET /reservations?userId=` but payloads only carry `customer_name`. A `User` entity was added (one user → many reservations). Requests send `user_id`; responses still contain `customer_name` (the user's name), plus `user_id`.
- **Extra endpoints:** `GET /cars/{id}`, the period filter on `GET /cars`, and `/users`.
- **Test runner:** the assignment mentions Jasmine/Karma. Angular 22 deprecates Karma and generates Vitest, so the specs use the same `describe/it/expect` style on Vitest.
- **Persistence across refresh** comes from the backend (H2). `localStorage` only stores the selected customer. H2 is in-memory, so data resets on backend restart; switch the JDBC URL to `jdbc:h2:file:./data/rental` to keep it.
- **Time zones:** the API uses local date-times without an offset. That is fine for a single-site rental office; a multi-region system would need `OffsetDateTime`.
- **Concurrency:** the overlap check and the insert are not protected against two simultaneous requests for the same car. A production version would lock the car row (`PESSIMISTIC_WRITE`) or add a database exclusion constraint.
- **Out of scope:** authentication, pagination, car management screens.
