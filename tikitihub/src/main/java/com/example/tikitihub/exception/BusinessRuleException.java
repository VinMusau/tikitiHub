package com.example.tikitihub.exception;

/**
 * Thrown when a request is valid but violates a business rule
 * (e.g., not enough tickets, wrong event gate, quantity too high).
 * Maps to HTTP 400.
 */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}