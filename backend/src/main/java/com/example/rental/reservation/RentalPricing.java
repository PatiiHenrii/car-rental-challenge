package com.example.rental.reservation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;

/** Pricing rule: every started 24h period is charged as a full day (minimum one day). */
final class RentalPricing {

    private static final long MINUTES_PER_DAY = 24 * 60;

    private RentalPricing() {
    }

    static long billableDays(LocalDateTime pickup, LocalDateTime dropoff) {
        long minutes = Duration.between(pickup, dropoff).toMinutes();
        return Math.max(1, (minutes + MINUTES_PER_DAY - 1) / MINUTES_PER_DAY);
    }

    static BigDecimal totalPrice(BigDecimal ratePerDay, LocalDateTime pickup, LocalDateTime dropoff) {
        return ratePerDay.multiply(BigDecimal.valueOf(billableDays(pickup, dropoff)))
                .setScale(2, RoundingMode.HALF_UP);
    }
}
