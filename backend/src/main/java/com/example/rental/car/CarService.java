package com.example.rental.car;

import com.example.rental.common.BusinessRuleException;
import com.example.rental.common.NotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CarService {

    private final CarRepository carRepository;

    public CarService(CarRepository carRepository) {
        this.carRepository = carRepository;
    }

    @Transactional(readOnly = true)
    public List<CarResponse> findAll() {
        return carRepository.findAll(Sort.by("manufacturer", "model")).stream().map(CarResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CarResponse> findAvailable(LocalDateTime pickup, LocalDateTime dropoff) {
        if (!pickup.isBefore(dropoff)) {
            throw new BusinessRuleException("pickup_time must be before dropoff_time");
        }
        return carRepository.findAvailableBetween(pickup, dropoff).stream().map(CarResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CarResponse findById(String id) {
        return CarResponse.from(getCar(id));
    }

    /** Entity lookup shared with other services. */
    @Transactional(readOnly = true)
    public Car getCar(String id) {
        return carRepository.findById(id).orElseThrow(() -> new NotFoundException("Car " + id + " not found"));
    }
}
