package com.example.tikitihub.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Data
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticketListing; 

    private Integer quantity;
    private BigDecimal totalAmount;
    
    private String mpesaReceiptNumber; 
    private String checkoutRequestID;   
    private String phoneNumber;

    @Column(nullable = false)
    private String status = "PENDING"; 

    private LocalDateTime createdAt = LocalDateTime.now();
}