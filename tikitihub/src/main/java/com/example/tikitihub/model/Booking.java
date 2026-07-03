package com.example.tikitihub.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

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
}