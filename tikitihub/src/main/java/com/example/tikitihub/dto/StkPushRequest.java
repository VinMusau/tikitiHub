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
        message = "phone must be a valid Kenyan number (e.g. 0712345678)"
    )
    private String phone;

    @NotNull(message = "tierId is required")
    @Positive(message = "tierId must be a positive number")
    private Long tierId;

    @NotNull(message = "quantity is required")
    @Min(value = 1, message = "quantity must be at least 1")
    @Max(value = 100, message = "quantity cannot exceed 100")
    private Integer quantity;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Long getTierId() { return tierId; }
    public void setTierId(Long tierId) { this.tierId = tierId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}