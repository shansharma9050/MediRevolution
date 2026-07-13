package com.example.medi.saas.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@NoArgsConstructor
public class SaasDoctorSlotResponse {

    private LocalTime startTime;

    private LocalTime endTime;

    private String label;

    private Boolean available;

    private Boolean booked;
}