package com.example.tikitihub.exception;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.security.core.AuthenticationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), "ResourceNotFoundException");
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessRule(BusinessRuleException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), "BusinessRuleException");
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(UnauthorizedException ex) {
        return build(HttpStatus.UNAUTHORIZED, ex.getMessage(), "UnauthorizedException");
    }
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthException(AuthenticationException ex) {
        return build(HttpStatus.UNAUTHORIZED, "Invalid email or password", "AuthenticationException");
    }

    /**
     * Catch-all for unexpected server-side failures.
     * Logs the full stack trace so we can diagnose, but doesn't leak it to the client.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        ex.printStackTrace();
        String msg = ex.getMessage();
        if (msg == null) msg = ex.getClass().getSimpleName();
        return build(HttpStatus.INTERNAL_SERVER_ERROR, msg, ex.getClass().getSimpleName());
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message, String type) {
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", status.value(),
                "error", message != null ? message : type,
                "type", type
        ));
    }
}