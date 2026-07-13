package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class SaasIpdReportResponse {

    private Long admissionId;

    private String ipdNumber;

    private String patientName;

    private String doctorName;

    private String wardName;

    private String bedNumber;

    private LocalDateTime admissionDateTime;

    private LocalDateTime dischargeDateTime;

    private BigDecimal advanceAmount;

    private BigDecimal totalCharges;

    private String status;
}