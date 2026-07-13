package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasStaffRole;
import com.example.medi.saas.enums.SaasStaffStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_staff")
@Data
public class SaasStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tenantId;

    private Long authUserId;

    @Column(nullable = false, length = 120)
    private String staffName;

    @Column(length = 120)
    private String email;

    @Column(length = 20)
    private String mobile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private SaasStaffRole staffRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SaasStaffStatus status = SaasStaffStatus.ACTIVE;

    @Column(length = 120)
    private String department;

    @Column(length = 120)
    private String designation;

    @Column(length = 20)
    private String gender;

    private LocalDate dateOfBirth;

    private LocalDate joiningDate;

    @Column(length = 500)
    private String address;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String state;

    @Column(length = 20)
    private String pincode;

    private BigDecimal salary;

    @Column(length = 120)
    private String emergencyContactName;

    @Column(length = 20)
    private String emergencyContactMobile;

    @Column(length = 100)
    private String staffCode;

    /*
     * Doctor-specific profile fields.
     * These fields are used only when staffRole = DOCTOR.
     */
    @Column(length = 120)
    private String qualification;

    @Column(length = 120)
    private String specialization;

    @Column(length = 120)
    private String registrationNumber;

    private Integer experienceYears;

    private BigDecimal consultationFee;

    private BigDecimal onlineConsultationFee;

    private Boolean onlineConsultationEnabled = false;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}