package com.example.rental.reservation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.rental.car.Car;
import com.example.rental.car.CarService;
import com.example.rental.car.CarStatus;
import com.example.rental.common.BusinessRuleException;
import com.example.rental.common.ConflictException;
import com.example.rental.common.NotFoundException;
import com.example.rental.reservation.ReservationDtos.ReservationRequest;
import com.example.rental.user.User;
import com.example.rental.user.UserService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class ReservationServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2030, 1, 1, 12, 0);
    private static final LocalDateTime PICKUP = NOW.plusDays(1);
    private static final LocalDateTime DROPOFF = PICKUP.plusDays(2);

    private final ReservationRepository repository = mock(ReservationRepository.class);
    private final CarService carService = mock(CarService.class);
    private final UserService userService = mock(UserService.class);
    private final Clock clock = Clock.fixed(NOW.toInstant(ZoneOffset.UTC), ZoneId.of("UTC"));
    private final ReservationService service = new ReservationService(repository, carService, userService, clock);

    private final Car car = withId(new Car("Toyota", "Corolla", "ABC-1", 2023, new BigDecimal("45.00"),
            CarStatus.AVAILABLE), "c1");
    private final User user = withId(new User("Alice"), "u1");

    @BeforeEach
    void setUp() {
        when(carService.getCar("c1")).thenReturn(car);
        when(userService.getUser("u1")).thenReturn(user);
        when(repository.save(any())).thenAnswer(inv -> withId(inv.getArgument(0), "r1"));
    }

    @Test
    void createsReservationWithServerSidePrice() {
        var response = service.create(new ReservationRequest("c1", "u1", PICKUP, DROPOFF));

        assertThat(response.reservationId()).isEqualTo("r1");
        assertThat(response.success()).isTrue();
        ArgumentCaptor<Reservation> saved = ArgumentCaptor.forClass(Reservation.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getTotalPrice()).isEqualByComparingTo("90.00");
        assertThat(saved.getValue().getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
    }

    @Test
    void rejectsPickupAfterDropoff() {
        assertThatThrownBy(() -> service.create(new ReservationRequest("c1", "u1", DROPOFF, PICKUP)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("before");
    }

    @Test
    void rejectsPickupInThePast() {
        assertThatThrownBy(() -> service.create(new ReservationRequest("c1", "u1", NOW.minusHours(1), DROPOFF)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("past");
    }

    @Test
    void rejectsCarUnderMaintenance() {
        Car broken = withId(new Car("VW", "Golf", "X", 2020, BigDecimal.TEN, CarStatus.MAINTENANCE), "c5");
        when(carService.getCar("c5")).thenReturn(broken);

        assertThatThrownBy(() -> service.create(new ReservationRequest("c5", "u1", PICKUP, DROPOFF)))
                .isInstanceOf(ConflictException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsOverlappingReservation() {
        when(repository.existsByCarIdAndPickupTimeBeforeAndDropoffTimeAfter("c1", DROPOFF, PICKUP))
                .thenReturn(true);

        assertThatThrownBy(() -> service.create(new ReservationRequest("c1", "u1", PICKUP, DROPOFF)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already booked");
        verify(repository, never()).save(any());
    }

    @Test
    void updateExcludesItselfFromOverlapCheckAndRecalculatesPrice() {
        Reservation existing = withId(new Reservation(car, user, PICKUP, DROPOFF, new BigDecimal("90.00")), "r1");
        when(repository.findById("r1")).thenReturn(Optional.of(existing));

        var response = service.update("r1", new ReservationRequest("c1", "u1", PICKUP, DROPOFF.plusDays(1)));

        verify(repository).existsByCarIdAndIdNotAndPickupTimeBeforeAndDropoffTimeAfter(
                "c1", "r1", DROPOFF.plusDays(1), PICKUP);
        assertThat(response.totalPrice()).isEqualByComparingTo("135.00");
        assertThat(response.customerName()).isEqualTo("Alice");
    }

    @Test
    void updateRejectsChangingOwner() {
        Reservation existing = withId(new Reservation(car, user, PICKUP, DROPOFF, new BigDecimal("90.00")), "r1");
        when(repository.findById("r1")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.update("r1", new ReservationRequest("c1", "u2", PICKUP, DROPOFF)))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void deleteUnknownReservationIsNotFound() {
        when(repository.findById(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete("missing")).isInstanceOf(NotFoundException.class);
    }

    private static <T> T withId(T entity, String id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
