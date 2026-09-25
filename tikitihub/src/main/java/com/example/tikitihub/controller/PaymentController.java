package com.example.tikitihub.controller;

import java.math.BigDecimal;
import java.util.Map;

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
import com.example.tikitihub.repository.BookingRepository;
import com.example.tikitihub.repository.TicketRepository;
import com.example.tikitihub.repository.TransactionRepository;
import com.example.tikitihub.repository.UserRepository;
import com.example.tikitihub.service.MpesaService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final MpesaService mpesaService;
    private final TransactionRepository transactionRepository;
    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PaymentController(
            MpesaService mpesaService,
            TransactionRepository transactionRepository,
            TicketRepository ticketRepository,
            BookingRepository bookingRepository,
            UserRepository userRepository) {
        this.mpesaService = mpesaService;
        this.transactionRepository = transactionRepository;
        this.ticketRepository = ticketRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/stk-push")
    public ResponseEntity<?> checkout(@RequestBody Map<String, String> request) {
        String phone = request.get("phone");
        String amount = request.get("amount");
        String ticketId = request.get("ticketId");
        String quantityStr = request.get("quantity");
        int quantity = (quantityStr != null) ? Integer.parseInt(quantityStr) : 1;

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserEmail = authentication.getName();
        User buyer = userRepository.findByEmail(currentUserEmail)
            .orElseThrow(() -> new RuntimeException("Buyer account profile not found"));

        Ticket ticketListing = ticketRepository.findById(Long.parseLong(ticketId))
            .orElseThrow(() -> new RuntimeException("Target event ticket package listing not found"));

        Map<String, String> mpesaResponse = mpesaService.initiateStkPush(phone, amount, "TicketRef-" + ticketId);

        if (mpesaResponse != null && "0".equals(mpesaResponse.get("ResponseCode"))){
            Transaction pendingTransaction = new Transaction();
            pendingTransaction.setCheckoutRequestID(mpesaResponse.get("CheckoutRequestID"));
            pendingTransaction.setCustomer(buyer);
            pendingTransaction.setTicketListing(ticketListing);
            pendingTransaction.setQuantity(quantity);
            pendingTransaction.setTotalAmount(new BigDecimal(amount));
            pendingTransaction.setPhoneNumber(phone);
            pendingTransaction.setStatus("PENDING");
            pendingTransaction.setCreatedAt(java.time.LocalDateTime.now());

            transactionRepository.save(pendingTransaction);
            System.out.println("Transaction trace registered as PENDING for ID: " + mpesaResponse.get("CheckoutRequestID"));
        }
        return ResponseEntity.ok(mpesaResponse);
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
                    .orElseThrow(() -> new RuntimeException("Transaction not found for CheckoutRequestID: " + cid));

            // Safaricom retries callbacks. If we've already finalized this transaction, do nothing.
            if ("COMPLETED".equals(transaction.getStatus())
                    || "FAILED".equals(transaction.getStatus())
                    || "OVERSOLD".equals(transaction.getStatus())) {
                System.out.println("Duplicate callback ignored for " + checkoutId
                        + " (already " + transaction.getStatus() + ")");
                return ResponseEntity.ok(Map.of("ResultCode", 0, "ResultDesc", "Already processed"));
            }

            // ---------- Failed payment ----------
            if (resultCode != 0) {
                transaction.setStatus("FAILED");
                transactionRepository.save(transaction);
                System.out.println("Payment failed/aborted for " + checkoutId);
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
            int qty = transaction.getQuantity();

            int updated = ticketRepository.decrementIfAvailable(eventListing.getId(), qty);

            if (updated == 0) {
                // Oversold: customer paid but stock ran out. Requires manual refund.
                transaction.setStatus("OVERSOLD");
                transaction.setMpesaReceiptNumber(mpesaReceipt);
                transactionRepository.save(transaction);

                System.err.println("CRITICAL: Oversold for transaction " + checkoutId
                        + " — customer " + transaction.getCustomer().getEmail()
                        + " paid receipt " + mpesaReceipt + ". Manual refund required.");

                // Return 200 so Safaricom stops retrying — refund is handled out-of-band.
                return ResponseEntity.ok(Map.of("ResultCode", 0, "ResultDesc", "Accept Success"));
            }

            transaction.setStatus("COMPLETED");
            transaction.setMpesaReceiptNumber(mpesaReceipt);
            transactionRepository.save(transaction);

            Booking booking = new Booking();
            booking.setBuyer(transaction.getCustomer());
            booking.setEventTicket(eventListing);
            booking.setQuantity(qty);
            bookingRepository.save(booking);

            System.out.println("TikitiHub success: receipt " + mpesaReceipt + " for booking " + booking.getId());

        } catch (Exception e) {
            // Full trace so the failure is visible in the console
            System.err.println("M-Pesa callback processing failed for CheckoutRequestID=" + checkoutId);
            e.printStackTrace();

            // Return 500 so Safaricom retries. @Transactional rolls back — the transaction
            // stays PENDING and will be processed on the retry.
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ResultCode", 1, "ResultDesc", "Processing failed — please retry"));
        }

        return ResponseEntity.ok(Map.of("ResultCode", 0, "ResultDesc", "Accept Success"));
    }
}