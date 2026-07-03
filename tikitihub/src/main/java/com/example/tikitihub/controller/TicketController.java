package com.example.tikitihub.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.User;
import com.example.tikitihub.repository.TicketRepository;
import com.example.tikitihub.repository.UserRepository;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketRepository ticketRepository;

    // CREATE an event ticket listing 
    @PostMapping
    public ResponseEntity<?> createTicket(
            @RequestBody Ticket ticket, 
            @AuthenticationPrincipal UserDetails userDetails) {
        
        String email = userDetails.getUsername();
        User organizer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated organizer not found"));

        ticket.setOrganizer(organizer);

        Ticket savedTicket = ticketRepository.save(ticket);
        return new ResponseEntity<>(savedTicket, HttpStatus.CREATED);
    }

    // GET ALL available event tickets
    @GetMapping
    public ResponseEntity<List<Ticket>> getAllTickets() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        List<Ticket> upcomingTickets = ticketRepository.findByEventDateAfterOrderByEventDateAsc(now);
        return ResponseEntity.ok(upcomingTickets);
    }

    // GET a single event ticket by ID
    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getTicketById(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Get only the tickets managed by the authenticated agent via /my-listings
    @GetMapping("/my-listings")
    public ResponseEntity<List<Ticket>> getMyListings(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User organizer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Organizer not found"));
                
        return ResponseEntity.ok(ticketRepository.findByOrganizer(organizer));
    }

    // UPDATE event ticket details
    @PutMapping("/{id}")
    public ResponseEntity<Ticket> updateTicket(@PathVariable Long id, @RequestBody Ticket updatedTicket) {
        return ticketRepository.findById(id)
                .map(ticket -> {
                    ticket.setEventName(updatedTicket.getEventName());
                    ticket.setDescription(updatedTicket.getDescription());
                    ticket.setVenue(updatedTicket.getVenue());
                    ticket.setEventDate(updatedTicket.getEventDate());
                    ticket.setPrice(updatedTicket.getPrice());
                    ticket.setTotalQuantity(updatedTicket.getTotalQuantity());
                    ticket.setRemainingQuantity(updatedTicket.getRemainingQuantity());
                    ticket.setImageUrl(updatedTicket.getImageUrl());
                    return ResponseEntity.ok(ticketRepository.save(ticket));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Get only the tickets managed by the authenticated agent via /my-events
    @GetMapping("/my-events")
    public ResponseEntity<?> getMyEvents(@AuthenticationPrincipal UserDetails userDetails) { // 🔄 Renamed to getMyEvents
        String currentPrincipalEmail = userDetails.getUsername();
        
        User organizer = userRepository.findByEmail(currentPrincipalEmail)
                .orElseThrow(() -> new RuntimeException("Organizer not found"));

        List<Ticket> organizerEvents = ticketRepository.findByOrganizer(organizer);
        return ResponseEntity.ok(organizerEvents);
    }

    // DELETE an event ticket listing
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id) {
        if (ticketRepository.existsById(id)) {
            ticketRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}