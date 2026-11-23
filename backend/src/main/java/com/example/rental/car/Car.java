package com.example.rental.car;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "cars")
public class Car {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String manufacturer;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false, unique = true)
    private String licensePlate;

    @Column(name = "manufacture_year", nullable = false)
    private int year;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal ratePerDay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CarStatus status;

    protected Car() {
        // for JPA
    }

    public Car(String manufacturer, String model, String licensePlate, int year, BigDecimal ratePerDay,
            CarStatus status) {
        this.manufacturer = manufacturer;
        this.model = model;
        this.licensePlate = licensePlate;
        this.year = year;
        this.ratePerDay = ratePerDay;
        this.status = status;
    }

    public String getId() {
        return id;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public String getModel() {
        return model;
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public int getYear() {
        return year;
    }

    public BigDecimal getRatePerDay() {
        return ratePerDay;
    }

    public CarStatus getStatus() {
        return status;
    }
}
