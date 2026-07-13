package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalTime;

@Data
@AllArgsConstructor
public class SaasSlotResponse {

    private LocalTime time;

    private Boolean available;
}