package com.example.tikitihub.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.TicketTier;
import com.example.tikitihub.model.User;

public record TicketResponse(
        Long id,
        String eventName,
        String description,
        String venue,
        LocalDateTime eventDate,
        BigDecimal price,
        Integer totalQuantity,
        Integer remainingQuantity,
        String imageUrl,
        String status,
        OrganizerSummary organizer,
        List<TierSummary> tiers,
        LocalDateTime createdAt
) {
    public static TicketResponse from(Ticket t) {
        OrganizerSummary org = null;
        if (t.getOrganizer() != null) {
            User u = t.getOrganizer();
            org = new OrganizerSummary(
                    u.getId(),
                    u.getEmail(),
                    u.getFullName(),
                    u.getRole() != null ? u.getRole().name() : null
            );
        }

        List<TierSummary> tierSummaries = t.getTiers() == null
                ? List.of()
                : t.getTiers().stream().map(TierSummary::from).toList();

        return new TicketResponse(
                t.getId(),
                t.getEventName(),
                t.getDescription(),
                t.getVenue(),
                t.getEventDate(),
                t.getPrice(),
                t.getTotalQuantity(),
                t.getRemainingQuantity(),
                t.getImageUrl(),
                t.getStatus() != null ? t.getStatus().name() : null,
                org,
                tierSummaries,
                t.getCreatedAt()
        );
    }

    /** Public-safe organizer view. No password, no verificationToken. */
    public record OrganizerSummary(
            Long id,
            String email,
            String fullName,
            String role
    ) {}

    public record TierSummary(
            Long id,
            String name,
            Double price,
            Integer remainingQuantity,
            Integer totalQuantity
    ) {
        public static TierSummary from(TicketTier tier) {
            return new TierSummary(
                    tier.getId(),
                    tier.getName(),
                    tier.getPrice(),
                    tier.getRemainingQuantity(),
                    tier.getTotalQuantity()
            );
        }
    }
}