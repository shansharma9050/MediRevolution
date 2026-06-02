package com.example.medi.billing.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceResponse {
    private Long id;
    private String invoiceNumber;
    private Long orderId;
    private String orderNumber;
    private Long retailerAuthUserId;
    private Long wholesalerAuthUserId;
    private BigDecimal taxableAmount;
    private BigDecimal gstAmount;
    private BigDecimal totalAmount;
    private LocalDateTime invoiceDate;
    private String status;
    private List<InvoiceItemResponse> items;
}
