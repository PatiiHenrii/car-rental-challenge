package com.example.rental.reservation;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, String> {

    @EntityGraph(attributePaths = {"car", "user"})
    List<Reservation> findByUserIdOrderByPickupTimeAsc(String userId);

    /** Overlap test for half-open intervals: existing.pickup < dropoff AND existing.dropoff > pickup. */
    boolean existsByCarIdAndPickupTimeBeforeAndDropoffTimeAfter(
            String carId, LocalDateTime dropoff, LocalDateTime pickup);

    /** Same as above, ignoring the reservation being updated. */
    boolean existsByCarIdAndIdNotAndPickupTimeBeforeAndDropoffTimeAfter(
            String carId, String excludedId, LocalDateTime dropoff, LocalDateTime pickup);
}
