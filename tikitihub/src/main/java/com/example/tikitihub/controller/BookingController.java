package com.example.tikitihub.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.tikitihub.model.Booking;
import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.User;
import com.example.tikitihub.repository.BookingRepository;
import com.example.tikitihub.repository.TicketRepository;
import com.example.tikitihub.repository.UserRepository;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    public BookingController(BookingRepository bookingRepository, TicketRepository ticketRepository, UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
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
        Ticket event = ticketRepository.findById(booking.getEventTicket().getId())
                .orElseThrow(() -> new RuntimeException("Event not found"));

        // Ensure enough tickets remain
        if (event.getRemainingQuantity() < booking.getQuantity()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Not enough tickets left!"));
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalEmail = authentication.getName();

        User dbUser = userRepository.findByEmail(currentPrincipalEmail)
            .orElseThrow(() -> new RuntimeException("Buyer account profile not found"));
        booking.setBuyer(dbUser);

        // Deduct ticket count from inventory
        event.setRemainingQuantity(event.getRemainingQuantity() - booking.getQuantity());
        ticketRepository.save(event);

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
}