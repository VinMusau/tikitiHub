package com.example.tikitihub.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.tikitihub.model.Booking;
import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.TicketTier;

public record BookingResponse(
        Long id,
        Long eventId,
        String eventName,
        String venue,
        LocalDateTime eventDate,
        String imageUrl,
        Long tierId,
        String tierName,
        BigDecimal tierPrice,
        Integer quantity,
        String qrRedemptionToken,
        String status,
        LocalDateTime createdAt,
        LocalDateTime scannedAt
) {
    public static BookingResponse from(Booking b) {
        Ticket t = b.getEventTicket();
        TicketTier tier = b.getTicketTier();

        BigDecimal price = null;
        if (tier != null && tier.getPrice() != null) {
            price = BigDecimal.valueOf(tier.getPrice());
        } else if (t != null && t.getPrice() != null) {
            price = t.getPrice();
        }

        return new BookingResponse(
                b.getId(),
                t != null ? t.getId() : null,
                t != null ? t.getEventName() : null,
                t != null ? t.getVenue() : null,
                t != null ? t.getEventDate() : null,
                t != null ? t.getImageUrl() : null,
                tier != null ? tier.getId() : null,
                tier != null ? tier.getName() : null,
                price,
                b.getQuantity(),
                b.getQrRedemptionToken(),
                b.getStatus(),
                b.getCreatedAt(),
                b.getScannedAt()
        );
    }
}