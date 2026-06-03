package com.example.medi.doctor.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.doctor.entity.Prescription;
import com.example.medi.doctor.entity.PrescriptionMedicine;
import com.example.medi.doctor.repository.PrescriptionRepository;
import com.example.medi.doctor.security.CurrentUserUtil;

import java.util.List;

@Service
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;

    public PrescriptionService(PrescriptionRepository prescriptionRepository) {
        this.prescriptionRepository = prescriptionRepository;
    }

    public Prescription createPrescription(Prescription prescription) {
        if (!CurrentUserUtil.getRole().equals("DOCTOR")) {
            throw new AccessDeniedException("Only DOCTOR can create prescription");
        }

        prescription.setDoctorAuthUserId(CurrentUserUtil.getUserId());

        for (PrescriptionMedicine medicine : prescription.getMedicines()) {
            medicine.setPrescription(prescription);
        }

        return prescriptionRepository.save(prescription);
    }

    public List<Prescription> getMyPrescriptions() {
        if (!CurrentUserUtil.getRole().equals("DOCTOR")) {
            throw new AccessDeniedException("Only DOCTOR can view prescriptions");
        }

        return prescriptionRepository.findByDoctorAuthUserIdOrderByPrescriptionDateDesc(
                CurrentUserUtil.getUserId()
        );
    }

    public Prescription getPrescription(Long id) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));

        if (!prescription.getDoctorAuthUserId().equals(CurrentUserUtil.getUserId())) {
            throw new AccessDeniedException("You can view only your own prescription");
        }

        return prescription;
    }
}