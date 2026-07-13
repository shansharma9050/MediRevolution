package com.example.medi.saas.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "saas_patients")
@Data
public class SaasPatient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * SaaS workspace id.
     * Har patient kisi ek tenant/workspace ka hoga.
     */
    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 120)
    private String patientName;

    @Column(length = 20)
    private String mobile;

    @Column(length = 120)
    private String email;

    @Column(length = 20)
    private String gender;

    private LocalDate dateOfBirth;

    private Integer age;

    @Column(length = 20)
    private String bloodGroup;

    @Column(length = 500)
    private String address;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String state;

    @Column(length = 20)
    private String pincode;

    @Column(length = 120)
    private String emergencyContactName;

    @Column(length = 20)
    private String emergencyContactMobile;

    @Column(length = 500)
    private String allergies;

    @Column(length = 500)
    private String existingDiseases;

    @Column(length = 500)
    private String notes;

    /*
     * OPD/IPD/Clinic patient number.
     * Future billing/reporting ke liye useful.
     */
    @Column(length = 60)
    private String patientCode;

    private Boolean active = true;

    private Long createdByAuthUserId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}