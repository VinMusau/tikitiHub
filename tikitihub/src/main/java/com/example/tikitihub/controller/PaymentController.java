package com.example.tikitihub.controller;

import java.math.BigDecimal;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.tikitihub.model.Booking;
import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.Transaction;
import com.example.tikitihub.model.User;
import com.example.tikitihub.model.TicketTier;

import com.example.tikitihub.repository.BookingRepository;
import com.example.tikitihub.repository.TicketRepository;
import com.example.tikitihub.repository.TicketTierRepository;
import com.example.tikitihub.repository.TransactionRepository;
import com.example.tikitihub.repository.UserRepository;

import com.example.tikitihub.service.MpesaService;
import com.example.tikitihub.service.EmailService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.example.tikitihub.dto.StkPushRequest;
import com.example.tikitihub.exception.ResourceNotFoundException;
import com.example.tikitihub.exception.UnauthorizedException;
import com.example.tikitihub.exception.BusinessRuleException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.beans.factory.annotation.Value;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final MpesaService mpesaService;
    private final TransactionRepository transactionRepository;
    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final TicketTierRepository ticketTierRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final EmailService emailService;

    public PaymentController(
            MpesaService mpesaService,
            TransactionRepository transactionRepository,
            TicketRepository ticketRepository,
            BookingRepository bookingRepository,
            UserRepository userRepository,
            TicketTierRepository ticketTierRepository,
            EmailService emailService) {
        this.mpesaService = mpesaService;
        this.transactionRepository = transactionRepository;
        this.ticketRepository = ticketRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.ticketTierRepository = ticketTierRepository;
        this.emailService = emailService;
    }

    @Value("${app.platform.fee-percent:5}")
    private double platformFeePercent;

    @PostMapping("/stk-push")
    public ResponseEntity<?> checkout(@Valid @RequestBody StkPushRequest request) {
        String phone = normalizePhone(request.getPhone());
        Long tierId = request.getTierId();
        int quantity = request.getQuantity();

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserEmail = authentication.getName();
        User buyer = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new UnauthorizedException("Buyer account profile not found"));

        TicketTier tier = ticketTierRepository.findById(tierId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket tier " + tierId + " not found"));

        Ticket eventTicket = tier.getTicket();
        if (eventTicket == null) {
            throw new BusinessRuleException("Tier " + tierId + " is not linked to an event");
        }

        // Server-side price calculation — client no longer dictates the amount
        double tierPrice = tier.getPrice() != null ? tier.getPrice() : 0.0;
        double subtotal = tierPrice * quantity;
        long amountKes = Math.round(subtotal * (1 + platformFeePercent / 100.0));

        if (amountKes < 1) {
            throw new BusinessRuleException("Computed amount is too low to process");
        }

        String amount = String.valueOf(amountKes);
        Map<String, String> mpesaResponse = mpesaService.initiateStkPush(phone, amount, "TierRef-" + tierId);

        if (mpesaResponse != null && "0".equals(mpesaResponse.get("ResponseCode"))) {
            Transaction pendingTransaction = new Transaction();
            pendingTransaction.setCheckoutRequestID(mpesaResponse.get("CheckoutRequestID"));
            pendingTransaction.setCustomer(buyer);
            pendingTransaction.setTicketListing(eventTicket);
            pendingTransaction.setTierListing(tier);
            pendingTransaction.setQuantity(quantity);
            pendingTransaction.setTotalAmount(new BigDecimal(amount));
            pendingTransaction.setPhoneNumber(phone);
            pendingTransaction.setStatus("PENDING");
            pendingTransaction.setCreatedAt(java.time.LocalDateTime.now());

            transactionRepository.save(pendingTransaction);
            log.info("Transaction registered as PENDING: {}", mpesaResponse.get("CheckoutRequestID"));
        }

        return ResponseEntity.ok(mpesaResponse);
    }

    private String normalizePhone(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");  // strip +, spaces
        if (digits.startsWith("0")) {
            return "254" + digits.substring(1);
        }
        if (digits.startsWith("254")) {
            return digits;
        }
        return digits;
    }

    @PostMapping("/mpesa-callback")
    @Transactional
    public ResponseEntity<?> handleMpesaCallback(@RequestBody String callbackPayload) {
        String checkoutId = null;

        try {
            JsonNode jsonNode = objectMapper.readTree(callbackPayload);
            JsonNode stkCallback = jsonNode.path("Body").path("stkCallback");

            final String cid = stkCallback.path("CheckoutRequestID").asText();
            checkoutId = cid;
            int resultCode = stkCallback.path("ResultCode").asInt();

            Transaction transaction = transactionRepository.findByCheckoutRequestID(cid)
                    .orElseThrow(() -> new ResourceNotFoundException("Transaction not found for CheckoutRequestID: " + cid));

            // Safaricom retries callbacks. If we've already finalized this transaction, do nothing.
            if ("COMPLETED".equals(transaction.getStatus())
                    || "FAILED".equals(transaction.getStatus())
                    || "OVERSOLD".equals(transaction.getStatus())) {
                log.warn("Duplicate callback ignored for {} (already {})", checkoutId, transaction.getStatus());
                return ResponseEntity.ok(Map.of("ResultCode", 0, "ResultDesc", "Already processed"));
            }

            // ---------- Failed payment ----------
            if (resultCode != 0) {
                transaction.setStatus("FAILED");
                transactionRepository.save(transaction);
                log.info("Payment failed/aborted for {}", checkoutId);
                return ResponseEntity.ok(Map.of("ResultCode", 0, "ResultDesc", "Accept Success"));
            }

            // ---------- Successful payment ----------
            String mpesaReceipt = "";
            for (JsonNode item : stkCallback.path("CallbackMetadata").path("Item")) {
                if ("MpesaReceiptNumber".equals(item.path("Name").asText())) {
                    mpesaReceipt = item.path("Value").asText();
                    break;
                }
            }

            Ticket eventListing = transaction.getTicketListing();
            TicketTier tierListing = transaction.getTierListing();
            int qty = transaction.getQuantity();

            if (tierListing != null) {
                int tierUpdated = ticketTierRepository.decrementIfAvailable(tierListing.getId(), qty);
                if (tierUpdated == 0) {
                    transaction.setStatus("OVERSOLD");
                    transaction.setMpesaReceiptNumber(mpesaReceipt);
                    transactionRepository.save(transaction);
                    log.error("CRITICAL: Oversold tier {} for transaction {} — customer {} paid receipt {} — manual refund required",
                            tierListing.getId(), checkoutId, transaction.getCustomer().getEmail(), mpesaReceipt);
                    return ResponseEntity.ok(Map.of("ResultCode", 0, "ResultDesc", "Accept Success"));
                }
            }

            ticketRepository.decrementIfAvailable(eventListing.getId(), qty);

            transaction.setStatus("COMPLETED");
            transaction.setMpesaReceiptNumber(mpesaReceipt);
            transactionRepository.save(transaction);

            Booking booking = new Booking();
            booking.setBuyer(transaction.getCustomer());
            booking.setEventTicket(eventListing);
            booking.setTicketTier(tierListing);   
            booking.setQuantity(qty);
            bookingRepository.save(booking);

            scheduleTicketEmail(booking, eventListing, tierListing, transaction.getCustomer());

            log.info("TikitiHub success: receipt {} for booking {}", mpesaReceipt, booking.getId());

        } catch (Exception e) {
            // Full trace so the failure is visible in the console
            log.error("M-Pesa callback processing failed for CheckoutRequestID={}", checkoutId, e);

            // Return 500 so Safaricom retries. @Transactional rolls back — the transaction
            // stays PENDING and will be processed on the retry.
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ResultCode", 1, "ResultDesc", "Processing failed — please retry"));
        }

        return ResponseEntity.ok(Map.of("ResultCode", 0, "ResultDesc", "Accept Success"));
    }
    private void scheduleTicketEmail(Booking booking, Ticket ticket, TicketTier tier, User buyer) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            // No transaction — send immediately (shouldn't happen in this path)
            emailService.sendTicketConfirmation(booking, ticket, tier, buyer);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                emailService.sendTicketConfirmation(booking, ticket, tier, buyer);
            }
        });
    }
}