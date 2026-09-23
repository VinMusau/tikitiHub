package com.example.tikitihub.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.tikitihub.model.Booking;
import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.TicketTier;
import com.example.tikitihub.model.User;
import com.example.tikitihub.repository.BookingRepository;
import com.example.tikitihub.repository.TicketRepository;
import com.example.tikitihub.repository.TicketTierRepository;
import com.example.tikitihub.repository.UserRepository;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final TicketTierRepository ticketTierRepository;

    public BookingController(
            BookingRepository bookingRepository, 
            TicketRepository ticketRepository, 
            UserRepository userRepository, 
            TicketTierRepository ticketTierRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.ticketTierRepository = ticketTierRepository;
    }

    public static class GateScanRequest {
        private String qrRedemptionToken;
        private Long eventId;

        public String getQrRedemptionToken() { return qrRedemptionToken; }
        public void setQrRedemptionToken(String qrRedemptionToken) { this.qrRedemptionToken = qrRedemptionToken; }

        public Long getEventId() { return eventId; }
        public void setEventId(Long eventId) { this.eventId = eventId; }
    }

    // PURCHASE a ticket 
    @PostMapping
    public ResponseEntity<?> purchaseTicket(@RequestBody Booking booking) {
        if (booking.getTicketTier() == null || booking.getTicketTier().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ticket tier ID is required"));
        }

        TicketTier tier = ticketTierRepository.findById(booking.getTicketTier().getId())
                .orElseThrow(() -> new RuntimeException("Ticket tier not found"));

        if (tier.getRemainingQuantity() < booking.getQuantity()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Not enough " + tier.getName() + " tickets left!"));
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalEmail = authentication.getName();

        User dbUser = userRepository.findByEmail(currentPrincipalEmail)
                .orElseThrow(() -> new RuntimeException("Buyer account profile not found"));

        // Deduct quantity from the specific tier
        tier.setRemainingQuantity(tier.getRemainingQuantity() - booking.getQuantity());
        ticketTierRepository.save(tier);

        // Deduct from the parent ticket so dashboard metrics stay in sync
        Ticket ticket = tier.getTicket();
        if (ticket != null && ticket.getRemainingQuantity() != null) {
            ticket.setRemainingQuantity(Math.max(0, ticket.getRemainingQuantity() - booking.getQuantity()));
            ticketRepository.save(ticket);
        }

        booking.setBuyer(dbUser);
        booking.setEventTicket(tier.getTicket()); // Set event reference
        booking.setTicketTier(tier);              // Set tier reference

        Booking savedBooking = bookingRepository.save(booking);
        return new ResponseEntity<>(savedBooking, HttpStatus.CREATED);
    }

    // REDEEM a ticket (Scoped to Event)
    @PostMapping("/redeem")
    public ResponseEntity<?> redeemTicket(@RequestBody GateScanRequest request) {
        if (request.getQrRedemptionToken() == null || request.getEventId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Both qrRedemptionToken and eventId are required"));
        }

        String token = request.getQrRedemptionToken();
        Long eventId = request.getEventId();

        Booking booking = bookingRepository.findByQrRedemptionToken(token).orElse(null);

        if (booking == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "INVALID QR CODE"));
        }

        if (booking.getEventTicket() == null || !booking.getEventTicket().getId().equals(eventId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "WRONG EVENT GATE! This ticket is registered for a different event."));
        }

        if ("REDEEMED".equals(booking.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "ALREADY USED! Scanned at " + booking.getScannedAt()));
        }

        booking.setStatus("REDEEMED");
        booking.setScannedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        return ResponseEntity.ok(Map.of("message", "ACCESS GRANTED! Enjoy the show."));
    }

    @GetMapping("/my-bookings")
    public ResponseEntity<List<Booking>> getMyBookings() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalEmail = authentication.getName();

        List<Booking> userBookings = bookingRepository.findByBuyerEmail(currentPrincipalEmail);
        return ResponseEntity.ok(userBookings);
    }

    /**
     * Returns per-event and per-tier booking sales data for the authenticated organizer.
     * This is the source of truth for the organizer dashboard performance metrics.
     */
    @GetMapping("/organizer-sales")
    public ResponseEntity<List<Map<String, Object>>> getOrganizerSales(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User organizer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Organizer not found"));

        List<Booking> allBookings = bookingRepository.findByEventTicketOrganizer(organizer);

        // Group by event
        Map<Long, Map<String, Object>> eventMap = new HashMap<>();

        for (Booking b : allBookings) {
            if (b.getEventTicket() == null) continue;

            Long eventId = b.getEventTicket().getId();
            Map<String, Object> eventEntry = eventMap.computeIfAbsent(eventId, k -> {
                Map<String, Object> entry = new HashMap<>();
                entry.put("eventId", eventId);
                entry.put("eventName", b.getEventTicket().getEventName());
                entry.put("totalSold", 0);
                entry.put("totalRevenue", 0.0);
                entry.put("tiers", new ArrayList<Map<String, Object>>());
                return entry;
            });

            int qty = b.getQuantity() != null ? b.getQuantity() : 1;
            double tierPrice = 0.0;
            String tierName = "General";
            Long tierId = null;

            if (b.getTicketTier() != null) {
                Double price = b.getTicketTier().getPrice();
                tierPrice = price != null ? price : 0.0;
                tierName = b.getTicketTier().getName();
                tierId = b.getTicketTier().getId();
            } else if (b.getEventTicket() != null) {
                java.math.BigDecimal price = b.getEventTicket().getPrice();
                tierPrice = price != null ? price.doubleValue() : 0.0;
            }

            eventEntry.put("totalSold", (int) eventEntry.get("totalSold") + qty);
            eventEntry.put("totalRevenue", (double) eventEntry.get("totalRevenue") + (qty * tierPrice));

            // Tier breakdown
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tiers = (List<Map<String, Object>>) eventEntry.get("tiers");
            final Long finalTierId = tierId;
            Map<String, Object> tierEntry = tiers.stream()
                    .filter(t -> {
                        Object id = t.get("tierId");
                        return finalTierId != null ? finalTierId.equals(id) : id == null;
                    })
                    .findFirst()
                    .orElse(null);

            if (tierEntry == null) {
                tierEntry = new HashMap<>();
                tierEntry.put("tierId", tierId);
                tierEntry.put("tierName", tierName);
                tierEntry.put("sold", 0);
                tierEntry.put("revenue", 0.0);
                tiers.add(tierEntry);
            }

            tierEntry.put("sold", (int) tierEntry.get("sold") + qty);
            tierEntry.put("revenue", (double) tierEntry.get("revenue") + (qty * tierPrice));
        }

        return ResponseEntity.ok(new ArrayList<>(eventMap.values()));
    }
}