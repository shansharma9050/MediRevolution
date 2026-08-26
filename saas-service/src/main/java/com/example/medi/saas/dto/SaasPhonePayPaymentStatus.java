package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SaasPhonePayPaymentStatus {

    private String state;

    private String transactionId;

    private String rawResponse;
}