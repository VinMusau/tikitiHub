package com.example.tikitihub.exception;

/**
 * Thrown when the caller is authenticated but lacks rights to the resource
 * (e.g., a buyer whose account was deleted between token issue and request).
 * Maps to HTTP 401.
 */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}