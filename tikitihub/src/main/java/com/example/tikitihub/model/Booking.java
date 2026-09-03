package com.example.tikitihub.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket eventTicket;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, unique = true)
    private String qrRedemptionToken;

    @Column(nullable = false)
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime scannedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.status = "PURCHASED";

        this.qrRedemptionToken = "tk_" + UUID.randomUUID().toString();
    }

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ticket_tier_id")
    private TicketTier ticketTier;
    
}