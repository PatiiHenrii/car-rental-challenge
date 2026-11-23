package com.example.rental.reservation;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class RentalPricingTest {

    private static final LocalDateTime PICKUP = LocalDateTime.of(2030, 1, 10, 10, 0);

    @Test
    void chargesExactDays() {
        assertThat(RentalPricing.billableDays(PICKUP, PICKUP.plusDays(3))).isEqualTo(3);
    }

    @Test
    void roundsStartedDayUp() {
        assertThat(RentalPricing.billableDays(PICKUP, PICKUP.plusDays(2).plusMinutes(1))).isEqualTo(3);
    }

    @Test
    void chargesAtLeastOneDay() {
        assertThat(RentalPricing.billableDays(PICKUP, PICKUP.plusHours(2))).isEqualTo(1);
    }

    @Test
    void multipliesRateByDays() {
        assertThat(RentalPricing.totalPrice(new BigDecimal("48.50"), PICKUP, PICKUP.plusDays(3)))
                .isEqualByComparingTo("145.50");
    }
}
