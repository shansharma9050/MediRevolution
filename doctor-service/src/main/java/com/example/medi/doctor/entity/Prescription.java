package com.example.medi.doctor.entity;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
public class Prescription {

	   @Id
	    @GeneratedValue(strategy = GenerationType.IDENTITY)
	    private Long id;

	    private Long doctorAuthUserId;
	    
	    @Column(name = "doctor_name")
	    private String doctorName;

	    @ManyToOne
	    @JoinColumn(name = "patient_id")
	    private Patient patient;

	    @Column(length = 3000)
	    private String symptoms;

	    @Column(length = 3000)
	    private String diagnosis;

	    @Column(length = 5000)
	    private String medicines;

	    @Column(length = 3000)
	    private String advice;

	    private LocalDateTime prescriptionDate = LocalDateTime.now();

   
}