package com.example.medi.user.service;

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
    
    public WholesalerProfile updateWholesalerProfile(WholesalerProfile request) {
        WholesalerProfile profile = wholesalerRepository.findByAuthUserId(request.getAuthUserId())
                .orElseThrow(() -> new RuntimeException("Wholesaler profile not found"));

        profile.setBusinessName(request.getBusinessName());
        profile.setOwnerName(request.getOwnerName());
        profile.setDrugLicenseNumber(request.getDrugLicenseNumber());
        profile.setGstNumber(request.getGstNumber());
        profile.setEmail(request.getEmail());
        profile.setMobile(request.getMobile());
        profile.setAddress(request.getAddress());
        profile.setState(request.getState());
        profile.setDistrict(request.getDistrict());
        profile.setPincode(request.getPincode());
        profile.setContactPersonName(request.getContactPersonName());
        profile.setContactPersonMobile(request.getContactPersonMobile());
        profile.setBankName(request.getBankName());
        profile.setAccountHolderName(request.getAccountHolderName());
        profile.setAccountNumber(request.getAccountNumber());
        profile.setIfscCode(request.getIfscCode());
        profile.setBranchName(request.getBranchName());
        profile.setProfileLogoUrl(request.getProfileLogoUrl());
        profile.setDocumentUrl(request.getDocumentUrl());

        return wholesalerRepository.save(profile);
    }
    
    public RetailerProfile updateRetailerProfile(RetailerProfile request) {
        RetailerProfile profile = retailerRepository.findByAuthUserId(request.getAuthUserId())
                .orElseThrow(() -> new RuntimeException("Retailer profile not found"));

        profile.setStoreName(request.getStoreName());
        profile.setOwnerName(request.getOwnerName());
        profile.setDrugLicenseNumber(request.getDrugLicenseNumber());
        profile.setGstNumber(request.getGstNumber());
        profile.setEmail(request.getEmail());
        profile.setMobile(request.getMobile());
        profile.setAddress(request.getAddress());
        profile.setState(request.getState());
        profile.setDistrict(request.getDistrict());
        profile.setPincode(request.getPincode());
        profile.setContactPersonName(request.getContactPersonName());
        profile.setContactPersonMobile(request.getContactPersonMobile());
        profile.setBankName(request.getBankName());
        profile.setAccountHolderName(request.getAccountHolderName());
        profile.setAccountNumber(request.getAccountNumber());
        profile.setIfscCode(request.getIfscCode());
        profile.setBranchName(request.getBranchName());
        profile.setProfileLogoUrl(request.getProfileLogoUrl());
        profile.setDocumentUrl(request.getDocumentUrl());

        return retailerRepository.save(profile);
    }
    
    public DoctorProfile updateDoctorProfile(DoctorProfile request) {
        DoctorProfile profile = doctorRepository.findByAuthUserId(request.getAuthUserId())
                .orElseThrow(() -> new RuntimeException("Retailer profile not found"));

        profile.setDoctorName(request.getDoctorName());
        profile.setHospitalName(request.getHospitalName());
        profile.setSpecialization(request.getSpecialization());
        profile.setExperienceYears(request.getExperienceYears());
        profile.setRegistrationNumber(request.getRegistrationNumber());
        profile.setEmail(request.getEmail());
        profile.setMobile(request.getMobile());
        profile.setAddress(request.getAddress());
        profile.setState(request.getState());
        profile.setDistrict(request.getDistrict());
        profile.setPincode(request.getPincode());
        profile.setContactPersonName(request.getContactPersonName());
        profile.setContactPersonMobile(request.getContactPersonMobile());
        profile.setBankName(request.getBankName());
        profile.setAccountHolderName(request.getAccountHolderName());
        profile.setAccountNumber(request.getAccountNumber());
        profile.setIfscCode(request.getIfscCode());
        profile.setBranchName(request.getBranchName());
        profile.setProfileLogoUrl(request.getProfileLogoUrl());
        profile.setDocumentUrl(request.getDocumentUrl());

        return doctorRepository.save(profile);
    }
    
    public HospitalProfile updateHospitalProfile(HospitalProfile request) {
    	HospitalProfile profile = hospitalRepository.findByAuthUserId(request.getAuthUserId())
                .orElseThrow(() -> new RuntimeException("Hospital profile not found"));

        profile.setHospitalName(request.getHospitalName());
        profile.setRegistrationNumber(request.getRegistrationNumber());
        profile.setHospitalType(request.getHospitalType());
        profile.setBedCapacity(request.getBedCapacity());
        profile.setEmail(request.getEmail());
        profile.setMobile(request.getMobile());
        profile.setAddress(request.getAddress());
        profile.setState(request.getState());
        profile.setDistrict(request.getDistrict());
        profile.setPincode(request.getPincode());
        profile.setContactPersonName(request.getContactPersonName());
        profile.setContactPersonMobile(request.getContactPersonMobile());
        profile.setBankName(request.getBankName());
        profile.setAccountHolderName(request.getAccountHolderName());
        profile.setAccountNumber(request.getAccountNumber());
        profile.setIfscCode(request.getIfscCode());
        profile.setBranchName(request.getBranchName());
        profile.setProfileLogoUrl(request.getProfileLogoUrl());
        profile.setDocumentUrl(request.getDocumentUrl());

        return hospitalRepository.save(profile);
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
    
    public PatientProfile updatePatientProfile(PatientProfile request) {

        if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only PATIENT can update patient profile");
        }

        PatientProfile profile = patientProfileRepository.findByAuthUserId(CurrentUserUtil.getUserId())
                .orElseThrow(() -> new RuntimeException("Patient profile not found"));

        profile.setPatientName(request.getPatientName());
        profile.setMobile(request.getMobile());
        profile.setEmail(request.getEmail());
        profile.setGender(request.getGender());
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setBloodGroup(request.getBloodGroup());
        profile.setAddress(request.getAddress());
        profile.setState(request.getState());
        profile.setDistrict(request.getDistrict());
        profile.setPincode(request.getPincode());
        profile.setMedicalHistory(request.getMedicalHistory());
        profile.setEmergencyContactName(request.getEmergencyContactName());
        profile.setEmergencyContactMobile(request.getEmergencyContactMobile());

        return patientProfileRepository.save(profile);
    }
}
