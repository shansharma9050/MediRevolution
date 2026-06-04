package com.example.medi.hospital.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.example.medi.hospital.enums.BillingStatus;

@Entity
@Table(name = "hospital_bills")
@Data
@NoArgsConstructor
public class HospitalBill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long hospitalAuthUserId;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private HospitalPatient patient;

    private Double consultationFee;

    private Double medicineCharge;

    private Double roomCharge;

    private Double otherCharge;

    private Double totalAmount;

    @Enumerated(EnumType.STRING)
    private BillingStatus status = BillingStatus.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();

}