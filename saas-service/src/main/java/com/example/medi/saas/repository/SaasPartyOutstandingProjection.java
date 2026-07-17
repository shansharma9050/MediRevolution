package com.example.medi.saas.repository;

import java.math.BigDecimal;

public interface SaasPartyOutstandingProjection {

    Long getPartyId();

    String getPartyCode();

    String getPartyName();

    BigDecimal getOutstandingAmount();
}