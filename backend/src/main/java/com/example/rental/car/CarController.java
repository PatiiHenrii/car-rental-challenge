package com.example.rental.car;

import com.example.rental.common.BusinessRuleException;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cars")
public class CarController {

    private final CarService carService;

    public CarController(CarService carService) {
        this.carService = carService;
    }

    /**
     * Without parameters: the whole fleet. With a rental period: only cars bookable in that period.
     */
    @GetMapping
    public List<CarResponse> findCars(
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE_TIME) LocalDateTime pickupTime,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE_TIME) LocalDateTime dropoffTime) {
        if (pickupTime == null && dropoffTime == null) {
            return carService.findAll();
        }
        if (pickupTime == null || dropoffTime == null) {
            throw new BusinessRuleException("pickupTime and dropoffTime must be provided together");
        }
        return carService.findAvailable(pickupTime, dropoffTime);
    }

    @GetMapping("/{id}")
    public CarResponse findById(@PathVariable String id) {
        return carService.findById(id);
    }
}
