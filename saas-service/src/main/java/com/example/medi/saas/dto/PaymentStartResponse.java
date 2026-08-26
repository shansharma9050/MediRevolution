package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PaymentStartResponse {

    private Long appointmentId;

    private String merchantOrderId;

    private String redirectUrl;
}