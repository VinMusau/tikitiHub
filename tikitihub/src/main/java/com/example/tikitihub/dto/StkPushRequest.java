package com.example.tikitihub.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public class StkPushRequest {

    @NotBlank(message = "phone is required")
    @Pattern(
        regexp = "^(\\+?254|0)[17]\\d{8}$",
        message = "phone must be a valid Kenyan number (e.g. 0712345678, 254712345678, or +254712345678)"
    )
    private String phone;

    @NotBlank(message = "amount is required")
    @Pattern(
        regexp = "^[0-9]+(\\.[0-9]{1,2})?$",
        message = "amount must be a positive number with up to 2 decimal places"
    )
    private String amount;

    @NotNull(message = "ticketId is required")
    @Positive(message = "ticketId must be a positive number")
    private Long ticketId;

    @NotNull(message = "quantity is required")
    @Min(value = 1, message = "quantity must be at least 1")
    @Max(value = 100, message = "quantity cannot exceed 100")
    private Integer quantity;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAmount() { return amount; }
    public void setAmount(String amount) { this.amount = amount; }

    public Long getTicketId() { return ticketId; }
    public void setTicketId(Long ticketId) { this.ticketId = ticketId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}