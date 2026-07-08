package com.example.tikitihub.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.tikitihub.model.Transaction;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByCheckoutRequestID(String checkoutRequestID);
}