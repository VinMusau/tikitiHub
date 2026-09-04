package com.example.tikitihub.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;

@Entity
@Table(name = "ticket_tiers")
@Data
@AllArgsConstructor
public class TicketTier {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; 

    @Column(nullable = false)
    private Double price;

    @Column(nullable = false)
    private Integer totalQuantity;

    @Column(nullable = false)
    private Integer remainingQuantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    @JsonIgnoreProperties({"tiers", "hibernateLazyInitializer", "handler"})
    private Ticket ticket; 

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        if (this.remainingQuantity == null) {
            this.remainingQuantity = this.totalQuantity;
        }
    }

    public TicketTier() {}

    public TicketTier(String name, Double price, Integer totalQuantity, Ticket ticket) {
        this.name = name;
        this.price = price;
        this.totalQuantity = totalQuantity;
        this.remainingQuantity = totalQuantity;
        this.ticket = ticket;
    }
}
