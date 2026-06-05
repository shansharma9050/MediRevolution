package com.example.medi.user.service;

import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.user.entity.DoctorProfile;
import com.example.medi.user.entity.HospitalProfile;
import com.example.medi.user.entity.PatientProfile;
import com.example.medi.user.entity.RetailerProfile;
import com.example.medi.user.entity.WholesalerProfile;
import com.example.medi.user.repository.DoctorProfileRepository;
import com.example.medi.user.repository.HospitalProfileRepository;
import com.example.medi.user.repository.PatientProfileRepository;
import com.example.medi.user.repository.RetailerProfileRepository;
import com.example.medi.user.repository.WholesalerProfileRepository;
import com.example.medi.user.security.CurrentUserUtil;

import jakarta.transaction.Transactional;

@Service
public class ProfileService {

    private final WholesalerProfileRepository wholesalerRepository;
    private final RetailerProfileRepository retailerRepository;
    private final DoctorProfileRepository doctorRepository;
    private final HospitalProfileRepository hospitalRepository;
    private final PatientProfileRepository patientProfileRepository;

    public ProfileService(
            WholesalerProfileRepository wholesalerRepository,
            RetailerProfileRepository retailerRepository,
            DoctorProfileRepository doctorRepository,
            HospitalProfileRepository hospitalRepository,
            PatientProfileRepository patientProfileRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.retailerRepository = retailerRepository;
        this.doctorRepository = doctorRepository;
        this.hospitalRepository = hospitalRepository;
        this.patientProfileRepository = patientProfileRepository;
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

    public HospitalProfile createHospitalProfile(HospitalProfile request) {

        if (!"HOSPITAL".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only HOSPITAL can create hospital profile");
        }

        Long authUserId = CurrentUserUtil.getUserId();

        if (hospitalRepository.existsByAuthUserId(authUserId)) {
            throw new RuntimeException("Hospital profile already exists");
        }

        request.setAuthUserId(authUserId);

        return hospitalRepository.save(request);
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
    
    @Transactional
    public PatientProfile updatePatientProfile(PatientProfile profile) {

        Long authUserId = CurrentUserUtil.getUserId();

        PatientProfile existing = patientProfileRepository
                .findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Patient profile not found"));

        existing.setPatientName(profile.getPatientName());
        existing.setEmail(profile.getEmail());
        existing.setMobile(profile.getMobile());
        existing.setGender(profile.getGender());
        existing.setDateOfBirth(profile.getDateOfBirth());
        existing.setBloodGroup(profile.getBloodGroup());
        existing.setAddress(profile.getAddress());
        existing.setState(profile.getState());
        existing.setDistrict(profile.getDistrict());
        existing.setPincode(profile.getPincode());
        existing.setMedicalHistory(profile.getMedicalHistory());
        existing.setEmergencyContactName(profile.getEmergencyContactName());
        existing.setEmergencyContactMobile(profile.getEmergencyContactMobile());

        return patientProfileRepository.save(existing);
    }
    
    @Transactional
    public WholesalerProfile updateWholesalerProfile(WholesalerProfile profile) {

        Long authUserId = CurrentUserUtil.getUserId();

        WholesalerProfile existing = wholesalerRepository
                .findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Wholesaler profile not found"));

        existing.setBusinessName(profile.getBusinessName());
        existing.setOwnerName(profile.getOwnerName());
        existing.setDrugLicenseNumber(profile.getDrugLicenseNumber());
        existing.setGstNumber(profile.getGstNumber());

        existing.setEmail(profile.getEmail());
        existing.setMobile(profile.getMobile());
        existing.setAddress(profile.getAddress());
        existing.setState(profile.getState());
        existing.setDistrict(profile.getDistrict());
        existing.setPincode(profile.getPincode());

        existing.setContactPersonName(profile.getContactPersonName());
        existing.setContactPersonMobile(profile.getContactPersonMobile());

        existing.setBankName(profile.getBankName());
        existing.setAccountHolderName(profile.getAccountHolderName());
        existing.setAccountNumber(profile.getAccountNumber());
        existing.setIfscCode(profile.getIfscCode());
        existing.setBranchName(profile.getBranchName());

        existing.setProfileLogoUrl(profile.getProfileLogoUrl());
        existing.setDocumentUrl(profile.getDocumentUrl());

        return wholesalerRepository.save(existing);
    }
    
    @Transactional
    public RetailerProfile updateRetailerProfile(RetailerProfile profile) {

        Long authUserId = CurrentUserUtil.getUserId();

        RetailerProfile existing = retailerRepository
                .findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Retailer profile not found"));

        existing.setStoreName(profile.getStoreName());
        existing.setOwnerName(profile.getOwnerName());
        existing.setDrugLicenseNumber(profile.getDrugLicenseNumber());
        existing.setGstNumber(profile.getGstNumber());

        existing.setEmail(profile.getEmail());
        existing.setMobile(profile.getMobile());
        existing.setAddress(profile.getAddress());
        existing.setState(profile.getState());
        existing.setDistrict(profile.getDistrict());
        existing.setPincode(profile.getPincode());

        existing.setContactPersonName(profile.getContactPersonName());
        existing.setContactPersonMobile(profile.getContactPersonMobile());

        existing.setBankName(profile.getBankName());
        existing.setAccountHolderName(profile.getAccountHolderName());
        existing.setAccountNumber(profile.getAccountNumber());
        existing.setIfscCode(profile.getIfscCode());
        existing.setBranchName(profile.getBranchName());

        existing.setProfileLogoUrl(profile.getProfileLogoUrl());
        existing.setDocumentUrl(profile.getDocumentUrl());

        return retailerRepository.save(existing);
    }
    
    @Transactional
    public DoctorProfile updateDoctorProfile(DoctorProfile profile) {

        Long authUserId = CurrentUserUtil.getUserId();

        DoctorProfile existing = doctorRepository
                .findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));

        existing.setDoctorName(profile.getDoctorName());
        existing.setClinicName(profile.getClinicName());
        existing.setRegistrationNumber(profile.getRegistrationNumber());
        existing.setSpecialization(profile.getSpecialization());

        existing.setEmail(profile.getEmail());
        existing.setMobile(profile.getMobile());
        existing.setAddress(profile.getAddress());
        existing.setState(profile.getState());
        existing.setDistrict(profile.getDistrict());
        existing.setPincode(profile.getPincode());

        existing.setContactPersonName(profile.getContactPersonName());
        existing.setContactPersonMobile(profile.getContactPersonMobile());

        existing.setBankName(profile.getBankName());
        existing.setAccountHolderName(profile.getAccountHolderName());
        existing.setAccountNumber(profile.getAccountNumber());
        existing.setIfscCode(profile.getIfscCode());
        existing.setBranchName(profile.getBranchName());

        existing.setProfileLogoUrl(profile.getProfileLogoUrl());
        existing.setDocumentUrl(profile.getDocumentUrl());

        return doctorRepository.save(existing);
    }
    
    @Transactional
    public HospitalProfile updateHospitalProfile(HospitalProfile profile) {

        Long authUserId = CurrentUserUtil.getUserId();

        HospitalProfile existing = hospitalRepository
                .findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Hospital profile not found"));

        existing.setHospitalName(profile.getHospitalName());
        existing.setRegistrationNumber(profile.getRegistrationNumber());
        existing.setHospitalType(profile.getHospitalType());

        existing.setEmail(profile.getEmail());
        existing.setMobile(profile.getMobile());
        existing.setAddress(profile.getAddress());
        existing.setState(profile.getState());
        existing.setDistrict(profile.getDistrict());
        existing.setPincode(profile.getPincode());

        existing.setContactPersonName(profile.getContactPersonName());
        existing.setContactPersonMobile(profile.getContactPersonMobile());

        existing.setBankName(profile.getBankName());
        existing.setAccountHolderName(profile.getAccountHolderName());
        existing.setAccountNumber(profile.getAccountNumber());
        existing.setIfscCode(profile.getIfscCode());
        existing.setBranchName(profile.getBranchName());

        existing.setProfileLogoUrl(profile.getProfileLogoUrl());
        existing.setDocumentUrl(profile.getDocumentUrl());

        return hospitalRepository.save(existing);
    }
    public PatientProfile createPatientProfile(PatientProfile request) {

        if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only PATIENT can create patient profile");
        }

        Long authUserId = CurrentUserUtil.getUserId();

        if (patientProfileRepository.existsByAuthUserId(authUserId)) {
            throw new RuntimeException("Patient profile already exists");
        }

        request.setAuthUserId(authUserId);

        return patientProfileRepository.save(request);
    }
    
    public PatientProfile getMyPatientProfile() {

        if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only PATIENT can view patient profile");
        }

        return patientProfileRepository.findByAuthUserId(CurrentUserUtil.getUserId())
                .orElseThrow(() -> new RuntimeException("Patient profile not found"));
    }
    
    public List<DoctorProfile> getAllDoctors() {
        return doctorRepository.findAll();
    }

    public List<HospitalProfile> getAllHospitals() {
        return hospitalRepository.findAllByOrderByHospitalNameAsc();
    }
    
    
}
