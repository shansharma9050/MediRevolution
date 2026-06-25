package com.example.medi.hospital.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.example.medi.hospital.enums.HospitalAppointmentStatus;
import com.example.medi.hospital.enums.HospitalConsultationType;
import com.example.medi.hospital.enums.HospitalPaymentStatus;

@Entity
@Table(name = "hospital_appointments")
@Data
@NoArgsConstructor
public class HospitalAppointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long patientAuthUserId;

    private Long hospitalAuthUserId;
    
    private Long hospitalDoctorId;

    private String patientName;
    
    private String patientEmail;

    private String patientMobile;

    private String doctorName;

    private String department;

    private LocalDate appointmentDate;

    private LocalTime appointmentTime;

    @Column(length = 2000)
    private String symptoms;

    @Enumerated(EnumType.STRING)
    private HospitalAppointmentStatus status;

    @Enumerated(EnumType.STRING)
    private HospitalConsultationType consultationType; 

    private String meetingUrl;

    private Long consultationFee;

    @Enumerated(EnumType.STRING)
    private HospitalPaymentStatus paymentStatus;

    private String paymentOrderId;

    private String paymentTransactionId;

    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();

        if (this.status == null) {
            this.status = HospitalAppointmentStatus.PENDING;
        }

        if (this.consultationType == null) {
            this.consultationType = HospitalConsultationType.OFFLINE;
        }
    }

}