package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaasSupplierResponse {

    private Long id;

    private Long tenantId;

    private String supplierCode;

    private String supplierName;

    private String contactPersonName;

    private String mobile;

    private String email;

    private String gstin;

    private String drugLicenseNumber;

    private String address;

    private String city;

    private String district;

    private String state;

    private String pincode;

    private BigDecimal openingBalance;

    private BigDecimal creditLimit;

    private Integer paymentTermsDays;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}