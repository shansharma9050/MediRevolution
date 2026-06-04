package com.example.medi.hospital.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "hospital_staff")
@Data
@NoArgsConstructor
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long hospitalAuthUserId;

    private String staffName;

    private String designation;

    private String department;

    private String mobile;

    private String email;

    private Double salary;

}
