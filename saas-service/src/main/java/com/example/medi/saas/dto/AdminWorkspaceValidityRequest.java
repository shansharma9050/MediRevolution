package com.example.medi.saas.dto;

import java.time.LocalDate;

public class AdminWorkspaceValidityRequest {

    private LocalDate validFrom;
    private LocalDate validUntil;

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(LocalDate validFrom) {
        this.validFrom = validFrom;
    }

    public LocalDate getValidUntil() {
        return validUntil;
    }

    public void setValidUntil(LocalDate validUntil) {
        this.validUntil = validUntil;
    }
}