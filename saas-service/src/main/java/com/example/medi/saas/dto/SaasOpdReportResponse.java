package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasOpdReportResponse {

    private Long opdId;

    private String opdNumber;

    private LocalDateTime visitDateTime;

    private String patientName;

    private String doctorName;

    private String diagnosis;

    private BigDecimal consultationFee;

    private String status;
}