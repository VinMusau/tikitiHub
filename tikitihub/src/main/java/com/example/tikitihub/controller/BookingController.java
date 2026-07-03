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

    // REDEEM a ticket 
    @PostMapping("/redeem")
    public ResponseEntity<?> redeemTicket(@RequestBody Map<String, String> request) {
        String token = request.get("qrRedemptionToken");
        
        Booking booking = bookingRepository.findByQrRedemptionToken(token)
                .orElse(null);

        if (booking == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "INVALID QR CODE"));
        }

        if ("REDEEMED".equals(booking.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "ALREADY USED! Scanned at " + booking.getScannedAt()));
        }

        // Successfully redeem
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