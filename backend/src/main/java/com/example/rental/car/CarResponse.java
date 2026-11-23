package com.example.rental.car;

import java.math.BigDecimal;

public record CarResponse(
        String id,
        String manufacturer,
        String model,
        String licensePlate,
        int year,
        BigDecimal ratePerDay,
        CarStatus status) {

    static CarResponse from(Car car) {
        return new CarResponse(car.getId(), car.getManufacturer(), car.getModel(), car.getLicensePlate(),
                car.getYear(), car.getRatePerDay(), car.getStatus());
    }
}
