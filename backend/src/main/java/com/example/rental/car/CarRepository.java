package com.example.rental.car;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CarRepository extends JpaRepository<Car, String> {

    /** Cars in service that have no reservation overlapping [pickup, dropoff). */
    @Query("""
            select c from Car c
            where c.status = com.example.rental.car.CarStatus.AVAILABLE
              and not exists (
                select r from Reservation r
                where r.car = c and r.pickupTime < :dropoff and r.dropoffTime > :pickup)
            order by c.manufacturer, c.model
            """)
    List<Car> findAvailableBetween(@Param("pickup") LocalDateTime pickup, @Param("dropoff") LocalDateTime dropoff);
}
