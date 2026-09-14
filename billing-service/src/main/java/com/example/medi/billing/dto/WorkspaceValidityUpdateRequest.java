package com.example.medi.billing.dto;

import java.time.LocalDate;

public class WorkspaceValidityUpdateRequest {

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