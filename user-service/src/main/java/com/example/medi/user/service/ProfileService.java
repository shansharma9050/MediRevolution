package com.example.medi.user.service;

import org.springframework.stereotype.Service;

import com.example.medi.user.entity.DoctorProfile;
import com.example.medi.user.entity.HospitalProfile;
import com.example.medi.user.entity.RetailerProfile;
import com.example.medi.user.entity.WholesalerProfile;
import com.example.medi.user.repository.DoctorProfileRepository;
import com.example.medi.user.repository.HospitalProfileRepository;
import com.example.medi.user.repository.RetailerProfileRepository;
import com.example.medi.user.repository.WholesalerProfileRepository;

@Service
public class ProfileService {

    private final WholesalerProfileRepository wholesalerRepository;
    private final RetailerProfileRepository retailerRepository;
    private final DoctorProfileRepository doctorRepository;
    private final HospitalProfileRepository hospitalRepository;

    public ProfileService(
            WholesalerProfileRepository wholesalerRepository,
            RetailerProfileRepository retailerRepository,
            DoctorProfileRepository doctorRepository,
            HospitalProfileRepository hospitalRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.retailerRepository = retailerRepository;
        this.doctorRepository = doctorRepository;
        this.hospitalRepository = hospitalRepository;
    }

    public WholesalerProfile createWholesalerProfile(WholesalerProfile profile) {

        if (wholesalerRepository.findByAuthUserId(profile.getAuthUserId()).isPresent()) {
            throw new RuntimeException("Wholesaler profile already exists");
        }

        return wholesalerRepository.save(profile);
    }
    
    public RetailerProfile createRetailerProfile(RetailerProfile profile) {

        if (retailerRepository.findByAuthUserId(profile.getAuthUserId()).isPresent()) {
            throw new RuntimeException("Retailer profile already exists");
        }

        return retailerRepository.save(profile);
    }

    public DoctorProfile createDoctorProfile(DoctorProfile profile) {

        if (doctorRepository.findByAuthUserId(profile.getAuthUserId()).isPresent()) {
            throw new RuntimeException("Doctor profile already exists");
        }

        return doctorRepository.save(profile);
    }

    public HospitalProfile createHospitalProfile(HospitalProfile profile) {

        if (hospitalRepository.findByAuthUserId(profile.getAuthUserId()).isPresent()) {
            throw new RuntimeException("Hospital profile already exists");
        }

        return hospitalRepository.save(profile);
    }

    public WholesalerProfile getWholesalerProfile(Long authUserId) {
        return wholesalerRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Wholesaler profile not found"));
    }

    public RetailerProfile getRetailerProfile(Long authUserId) {
        return retailerRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Retailer profile not found"));
    }

    public DoctorProfile getDoctorProfile(Long authUserId) {
        return doctorRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
    }

    public HospitalProfile getHospitalProfile(Long authUserId) {
        return hospitalRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Hospital profile not found"));
    }
}
