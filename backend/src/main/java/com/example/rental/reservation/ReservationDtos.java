package com.example.rental.reservation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class ReservationDtos {

    private ReservationDtos() {
    }

    /** Payload for both create (POST) and update (PUT). */
    public record ReservationRequest(
            @NotBlank String carId,
            @NotBlank String userId,
            @NotNull LocalDateTime pickupTime,
            @NotNull LocalDateTime dropoffTime) {
    }

    public record ReservationResponse(
            String id,
            String carId,
            String userId,
            String customerName,
            LocalDateTime pickupTime,
            LocalDateTime dropoffTime,
            BigDecimal totalPrice,
            ReservationStatus status) {

        static ReservationResponse from(Reservation r) {
            return new ReservationResponse(r.getId(), r.getCar().getId(), r.getUser().getId(),
                    r.getUser().getName(), r.getPickupTime(), r.getDropoffTime(), r.getTotalPrice(), r.getStatus());
        }
    }

    /** Response shape for POST /reservations, as defined in the assignment. */
    public record BookingResponse(String reservationId, boolean success) {
    }
}
