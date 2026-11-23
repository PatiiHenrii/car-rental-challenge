package com.example.rental.reservation;

import com.example.rental.car.Car;
import com.example.rental.car.CarService;
import com.example.rental.car.CarStatus;
import com.example.rental.common.BusinessRuleException;
import com.example.rental.common.ConflictException;
import com.example.rental.common.NotFoundException;
import com.example.rental.reservation.ReservationDtos.BookingResponse;
import com.example.rental.reservation.ReservationDtos.ReservationRequest;
import com.example.rental.reservation.ReservationDtos.ReservationResponse;
import com.example.rental.user.User;
import com.example.rental.user.UserService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final CarService carService;
    private final UserService userService;
    private final Clock clock;

    public ReservationService(ReservationRepository reservationRepository, CarService carService,
            UserService userService, Clock clock) {
        this.reservationRepository = reservationRepository;
        this.carService = carService;
        this.userService = userService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> findByUser(String userId) {
        userService.getUser(userId); // 404 for unknown users instead of a silent empty list
        return reservationRepository.findByUserIdOrderByPickupTimeAsc(userId).stream()
                .map(ReservationResponse::from)
                .toList();
    }

    @Transactional
    public BookingResponse create(ReservationRequest request) {
        validatePeriod(request);
        Car car = bookableCar(request.carId());
        User user = userService.getUser(request.userId());
        if (reservationRepository.existsByCarIdAndPickupTimeBeforeAndDropoffTimeAfter(
                car.getId(), request.dropoffTime(), request.pickupTime())) {
            throw overlapConflict(car);
        }
        Reservation reservation = new Reservation(car, user, request.pickupTime(), request.dropoffTime(),
                RentalPricing.totalPrice(car.getRatePerDay(), request.pickupTime(), request.dropoffTime()));
        return new BookingResponse(reservationRepository.save(reservation).getId(), true);
    }

    @Transactional
    public ReservationResponse update(String id, ReservationRequest request) {
        Reservation reservation = getReservation(id);
        if (!reservation.getUser().getId().equals(request.userId())) {
            throw new BusinessRuleException("A reservation cannot be transferred to another user");
        }
        validatePeriod(request);
        Car car = bookableCar(request.carId());
        if (reservationRepository.existsByCarIdAndIdNotAndPickupTimeBeforeAndDropoffTimeAfter(
                car.getId(), id, request.dropoffTime(), request.pickupTime())) {
            throw overlapConflict(car);
        }
        reservation.reschedule(car, request.pickupTime(), request.dropoffTime(),
                RentalPricing.totalPrice(car.getRatePerDay(), request.pickupTime(), request.dropoffTime()));
        return ReservationResponse.from(reservation);
    }

    @Transactional
    public void delete(String id) {
        reservationRepository.delete(getReservation(id));
    }

    private Reservation getReservation(String id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Reservation " + id + " not found"));
    }

    private void validatePeriod(ReservationRequest request) {
        if (!request.pickupTime().isBefore(request.dropoffTime())) {
            throw new BusinessRuleException("pickup_time must be before dropoff_time");
        }
        if (request.pickupTime().isBefore(LocalDateTime.now(clock))) {
            throw new BusinessRuleException("pickup_time cannot be in the past");
        }
    }

    private Car bookableCar(String carId) {
        Car car = carService.getCar(carId);
        if (car.getStatus() == CarStatus.MAINTENANCE) {
            throw new ConflictException("Car " + carId + " is under maintenance and cannot be booked");
        }
        return car;
    }

    private static ConflictException overlapConflict(Car car) {
        return new ConflictException(
                "%s %s is already booked for the selected period".formatted(car.getManufacturer(), car.getModel()));
    }
}
