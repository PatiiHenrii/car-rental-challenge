package com.example.rental.common;

/** A request that is well-formed but violates a business rule (e.g. invalid rental period). */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
