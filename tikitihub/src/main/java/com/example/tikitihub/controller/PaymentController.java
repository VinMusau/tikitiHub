package com.example.tikitihub.controller.payment;

import com.example.tikitihub.model.Transaction;
import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.Booking;
import com.example.tikitihub.model.User;

import com.example.tikitihub.repository.UserRepository;
import com.example.tikitihub.repository.TransactionRepository;
import com.example.tikitihub.repository.TicketRepository;
import com.example.tikitihub.repository.BookingRepository;
import com.example.tikitihub.service.MpesaService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.transaction.Transactional;
import java.util.Map;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final MpesaService mpesaService;
    private final TransactionRepository transactionRepository;
    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PaymentController(TransactionRepository transactionRepository, TicketRepository ticketRepository, BookingRepository bookingRepository, UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.ticketRepository = ticketRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.mpesaService = new MpesaService();
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
        try {
            JsonNode jsonNode = objectMapper.readTree(callbackPayload);
            JsonNode stkCallback = jsonNode.path("Body").path("stkCallback");
            
            String checkoutId = stkCallback.path("CheckoutRequestID").asText();
            int resultCode = stkCallback.path("ResultCode").asInt();

            Transaction transaction = transactionRepository.findByCheckoutRequestID(checkoutId)
                .orElseThrow(() -> new RuntimeException("Transaction trace not found for CheckoutRequestID: " + checkoutId));

            if (resultCode == 0) {
                JsonNode callbackMetadata = stkCallback.path("CallbackMetadata").path("Item");
                String mpesaReceipt = "";
                
                for (JsonNode item : callbackMetadata) {
                    if ("MpesaReceiptNumber".equals(item.path("Name").asText())) {
                        mpesaReceipt = item.path("Value").asText();
                        break;
                    }
                }
                
                transaction.setStatus("COMPLETED");
                transaction.setMpesaReceiptNumber(mpesaReceipt);
                transactionRepository.save(transaction);

                Ticket eventListing = transaction.getTicketListing();
                int inventoryDeficit = eventListing.getRemainingQuantity() - transaction.getQuantity();
                
                if (inventoryDeficit < 0) {
                    System.err.println("CRITICAL: Event stock oversold for transaction " + checkoutId);
                } else {
                    eventListing.setRemainingQuantity(inventoryDeficit);
                    ticketRepository.save(eventListing);

                    Booking booking = new Booking();
                    booking.setBuyer(transaction.getCustomer());
                    booking.setEventTicket(eventListing);
                    booking.setQuantity(transaction.getQuantity());
                    
                    bookingRepository.save(booking);

                    System.out.println("TikitiHub Success: Ticket stock updated. Receipt: " + mpesaReceipt);
                }
                
            } else {
                transaction.setStatus("FAILED");
                transactionRepository.save(transaction);
                System.out.println("Payment failed or aborted for checkout profile reference: " + checkoutId);
            }

        } catch (Exception e) {
            System.err.println("Failed parsing callback structure payload: " + e.getMessage());
        }

        // Always return a clean 200 OK back to Safaricom so they stop retrying the hook
        return ResponseEntity.ok(Map.of("ResultCode", 0, "ResultDesc", "Accept Success"));
    }
}