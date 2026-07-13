package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SaasTenantSettingResponse {

    private Long id;

    private Long tenantId;

    private String businessName;

    private String businessType;

    private String logoUrl;

    private String address;

    private String city;

    private String state;

    private String pincode;

    private String country;

    private String contactEmail;

    private String contactMobile;

    private String website;

    private String gstNumber;

    private String registrationNumber;

    private String themeColor;

    private String invoiceHeader;

    private String invoiceFooter;

    private String prescriptionHeader;

    private String prescriptionFooter;

    private String reportHeader;

    private String reportFooter;

    private String workingDays;

    private String openingTime;

    private String closingTime;

    private Boolean active;
}