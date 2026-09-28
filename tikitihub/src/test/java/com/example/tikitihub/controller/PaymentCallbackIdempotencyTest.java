package com.example.tikitihub.controller;

import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.TicketStatus;
import com.example.tikitihub.model.TicketTier;
import com.example.tikitihub.model.Transaction;
import com.example.tikitihub.model.User;
import com.example.tikitihub.model.UserRole;
import com.example.tikitihub.repository.BookingRepository;
import com.example.tikitihub.repository.TicketRepository;
import com.example.tikitihub.repository.TicketTierRepository;
import com.example.tikitihub.repository.TransactionRepository;
import com.example.tikitihub.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PaymentCallbackIdempotencyTest {

    @Autowired private PaymentController controller;
    @Autowired private TransactionRepository txRepo;
    @Autowired private BookingRepository bookingRepo;
    @Autowired private TicketRepository ticketRepo;
    @Autowired private TicketTierRepository tierRepo;
    @Autowired private UserRepository userRepo;

    private Ticket savedTicket;
    private TicketTier savedTier;
    private User savedBuyer;

    @BeforeEach
    void setUp() {
        
        User organizer = new User();
        organizer.setEmail("organizer-" + System.nanoTime() + "@example.com"); // unique per test
        organizer.setFullName("Test Organizer");
        organizer.setPassword("$2a$10$dummyHashedPasswordForTestsOnly");
        organizer.setRole(UserRole.ROLE_AGENT);
        organizer.setEnabled(true);
        organizer = userRepo.save(organizer);

        savedBuyer = new User();
        savedBuyer.setEmail("callback-buyer@example.com");
        savedBuyer.setFullName("Callback Buyer");
        savedBuyer.setPassword("$2a$10$dummyHashedPasswordForTestsOnly");
        savedBuyer.setRole(UserRole.ROLE_CUSTOMER);
        savedBuyer.setEnabled(true);
        savedBuyer = userRepo.save(savedBuyer);

        savedTicket = new Ticket();
        savedTicket.setEventName("Callback Test Event");
        savedTicket.setDescription("Test");
        savedTicket.setVenue("Test");
        savedTicket.setEventDate(LocalDateTime.now().plusDays(1));
        savedTicket.setPrice(BigDecimal.valueOf(100));
        savedTicket.setTotalQuantity(10);
        savedTicket.setRemainingQuantity(10);
        savedTicket.setStatus(TicketStatus.UPCOMING);
        savedTicket.setOrganizer(organizer); 
        savedTicket = ticketRepo.save(savedTicket);

        savedTier = new TicketTier();
        savedTier.setTicket(savedTicket);
        savedTier.setName("General");
        savedTier.setPrice(100.0);
        savedTier.setTotalQuantity(10);
        savedTier.setRemainingQuantity(10);
        savedTier = tierRepo.save(savedTier);
    }

    @AfterEach
    void cleanup() {
        bookingRepo.deleteAll();
        txRepo.deleteAll();
        tierRepo.deleteAll();
        ticketRepo.deleteAll();
        userRepo.deleteAll();
    }

    private Transaction seedPendingTransaction(String checkoutId) {
        Transaction tx = new Transaction();
        tx.setCheckoutRequestID(checkoutId);
        tx.setCustomer(savedBuyer);
        tx.setTicketListing(savedTicket);
        tx.setTierListing(savedTier);
        tx.setQuantity(2);
        tx.setTotalAmount(BigDecimal.valueOf(210));
        tx.setPhoneNumber("254712345678");
        tx.setStatus("PENDING");
        tx.setCreatedAt(LocalDateTime.now());
        return txRepo.save(tx);
    }

    private String buildCallbackPayload(String checkoutId, int resultCode) {
        return """
            {
              "Body": {
                "stkCallback": {
                  "CheckoutRequestID": "%s",
                  "ResultCode": %d,
                  "CallbackMetadata": {
                    "Item": [
                      {"Name": "MpesaReceiptNumber", "Value": "TESTRECEIPT123"}
                    ]
                  }
                }
              }
            }
            """.formatted(checkoutId, resultCode);
    }

    private ResponseEntity<?> fireCallback(String checkoutId, int resultCode) {
        String payload = buildCallbackPayload(checkoutId, resultCode);
        return controller.handleMpesaCallback(payload);
    }

    @Test
    void successfulCallbackCreatesBookingAndDecrementsStock() {
        String checkoutId = "ws_CO_TEST_001";
        seedPendingTransaction(checkoutId);

        ResponseEntity<?> response = fireCallback(checkoutId, 0);

        assertThat(response.getStatusCode().value()).isEqualTo(200);

        Transaction tx = txRepo.findByCheckoutRequestID(checkoutId).orElseThrow();
        assertThat(tx.getStatus()).isEqualTo("COMPLETED");
        assertThat(tx.getMpesaReceiptNumber()).isEqualTo("TESTRECEIPT123");

        assertThat(bookingRepo.count()).isEqualTo(1);

        TicketTier refreshedTier = tierRepo.findById(savedTier.getId()).orElseThrow();
        assertThat(refreshedTier.getRemainingQuantity()).isEqualTo(8);  // 10 - 2
    }

    @Test
    void repeatedCallbackIsIgnored() {
        String checkoutId = "ws_CO_TEST_002";
        seedPendingTransaction(checkoutId);

        // First call
        fireCallback(checkoutId, 0);
        assertThat(bookingRepo.count()).isEqualTo(1);

        // Second call — same checkoutRequestID
        ResponseEntity<?> second = fireCallback(checkoutId, 0);
        assertThat(second.getStatusCode().value()).isEqualTo(200);
        assertThat(second.getBody().toString()).contains("Already processed");

        // Critical assertions: no duplicate booking, no second decrement
        assertThat(bookingRepo.count()).as("no duplicate booking").isEqualTo(1);

        TicketTier refreshedTier = tierRepo.findById(savedTier.getId()).orElseThrow();
        assertThat(refreshedTier.getRemainingQuantity())
                .as("stock must not be decremented twice")
                .isEqualTo(8);
    }

    @Test
    void failedPaymentMarksTransactionFailedWithoutBooking() {
        String checkoutId = "ws_CO_TEST_003";
        seedPendingTransaction(checkoutId);

        ResponseEntity<?> response = fireCallback(checkoutId, 1032); // user cancelled

        assertThat(response.getStatusCode().value()).isEqualTo(200);

        Transaction tx = txRepo.findByCheckoutRequestID(checkoutId).orElseThrow();
        assertThat(tx.getStatus()).isEqualTo("FAILED");

        assertThat(bookingRepo.count()).isZero();

        TicketTier refreshedTier = tierRepo.findById(savedTier.getId()).orElseThrow();
        assertThat(refreshedTier.getRemainingQuantity()).isEqualTo(10); // unchanged
    }

    @Test
    void unknownCheckoutIdReturns500SoSafaricomRetries() {
        ResponseEntity<?> response = fireCallback("ws_CO_DOES_NOT_EXIST", 0);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(bookingRepo.count()).isZero();
    }
}