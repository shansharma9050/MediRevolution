package com.example.medi.hospital.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "hospital_inventory")
@Data
public class HospitalInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long hospitalAuthUserId;

    private String itemName;

    private String category;

    private Integer quantity;

    private Integer minimumQuantity;

    private Double unitPrice;

}