package com.example.medi.saas.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class SaasCustomerRequest {

    private Long tenantId;

    private String customerCode;

    private String customerName;

    private String customerType;

    private String contactPersonName;

    private String mobile;

    private String alternateMobile;

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

    private BigDecimal discountPercentage;
}