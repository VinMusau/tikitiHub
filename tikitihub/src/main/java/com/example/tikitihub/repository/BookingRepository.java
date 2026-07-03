package com.example.tikitihub.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.tikitihub.model.Booking;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    // Crucial lookup function for when we scan a QR code string
    Optional<Booking> findByQrRedemptionToken(String qrRedemptionToken);

    List<Booking> findByBuyerEmail(String email);
}