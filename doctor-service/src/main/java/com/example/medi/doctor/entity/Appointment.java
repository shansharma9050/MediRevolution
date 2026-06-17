package com.example.medi.doctor.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.example.medi.doctor.enums.AppointmentStatus;
import com.example.medi.doctor.enums.ConsultationType;
import com.example.medi.doctor.enums.PaymentStatus;

@Entity
@Table(name = "appointments",

uniqueConstraints = {
        @UniqueConstraint(
                columnNames = {
                        "doctorAuthUserId",
                        "appointmentDate",
                        "appointmentTime"
                }
        )
})
@Data
@NoArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long patientAuthUserId;

    private Long doctorAuthUserId;

    private String patientName;

    private String patientMobile;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;
    
    @Column(name = "patient_email")
    private String patientEmail;

    @Column(length = 2000)
    private String symptoms;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus status;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "consultation_type")
    private ConsultationType consultationType;

    @Column(name = "consultation_fee")
    private Long consultationFee;

    @Column(name = "payment_order_id")
    private String paymentOrderId;

    @Column(name = "payment_transaction_id")
    private String paymentTransactionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus;

    @Column(name = "meeting_url")
    private String meetingUrl;

    private LocalDateTime createdAt = LocalDateTime.now();
    
}