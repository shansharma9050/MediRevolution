package com.example.medi.user.service;

import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.user.dto.WholesalerProfileResponse;
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

    public Long currentUserId() {
        return CurrentUserUtil.getUserId();
    }

    @CacheEvict(value = "wholesalerProfile", allEntries = true)
    public WholesalerProfile createWholesalerProfile(WholesalerProfile profile) {

        if (wholesalerRepository.findByAuthUserId(profile.getAuthUserId()).isPresent()) {
            throw new RuntimeException("Wholesaler profile already exists");
        }

        return wholesalerRepository.save(profile);
    }

    @CacheEvict(value = "retailerProfile", allEntries = true)
    public RetailerProfile createRetailerProfile(RetailerProfile profile) {

        if (retailerRepository.findByAuthUserId(profile.getAuthUserId()).isPresent()) {
            throw new RuntimeException("Retailer profile already exists");
        }

        return retailerRepository.save(profile);
    }

    @CacheEvict(value = {"doctorProfile", "doctors"}, allEntries = true)
    public DoctorProfile createDoctorProfile(DoctorProfile profile) {

        if (doctorRepository.findByAuthUserId(profile.getAuthUserId()).isPresent()) {
            throw new RuntimeException("Doctor profile already exists");
        }

        return doctorRepository.save(profile);
    }

    @CacheEvict(value = {"hospitalProfile", "hospitals"}, allEntries = true)
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

    @Cacheable(value = "wholesalerProfile", key = "#authUserId")
    public WholesalerProfile getWholesalerProfile(Long authUserId) {
        System.out.println("DB HIT: Loading wholesaler profile authUserId = " + authUserId);

        return wholesalerRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Wholesaler profile not found"));
    }

    @Cacheable(value = "retailerProfile", key = "#authUserId")
    public RetailerProfile getRetailerProfile(Long authUserId) {
        System.out.println("DB HIT: Loading retailer profile authUserId = " + authUserId);

        return retailerRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Retailer profile not found"));
    }

    @Cacheable(value = "doctorProfile", key = "#authUserId")
    public DoctorProfile getDoctorProfile(Long authUserId) {
        System.out.println("DB HIT: Loading doctor profile authUserId = " + authUserId);

        return doctorRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
    }

    @Cacheable(value = "hospitalProfile", key = "#authUserId")
    public HospitalProfile getHospitalProfile(Long authUserId) {
        System.out.println("DB HIT: Loading hospital profile authUserId = " + authUserId);

        return hospitalRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Hospital profile not found"));
    }

    @Transactional
    @CacheEvict(value = "patientProfile", allEntries = true)
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
    @CacheEvict(value = "wholesalerProfile", allEntries = true)
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
    @CacheEvict(value = "retailerProfile", allEntries = true)
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
    @CacheEvict(value = {"doctorProfile", "doctors"}, allEntries = true)
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
        existing.setExperienceYears(profile.getExperienceYears());

        existing.setProfileLogoUrl(profile.getProfileLogoUrl());
        existing.setDocumentUrl(profile.getDocumentUrl());

        return doctorRepository.save(existing);
    }

    @Transactional
    @CacheEvict(value = {"hospitalProfile", "hospitals"}, allEntries = true)
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

    @CacheEvict(value = "patientProfile", allEntries = true)
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

    @Cacheable(value = "patientProfile", key = "#root.target.currentUserId()")
    public PatientProfile getMyPatientProfile() {

        if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
            throw new AccessDeniedException("Only PATIENT can view patient profile");
        }

        Long authUserId = CurrentUserUtil.getUserId();

        System.out.println("DB HIT: Loading patient profile authUserId = " + authUserId);

        return patientProfileRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Patient profile not found"));
    }

    @Cacheable(value = "doctors")
    public List<DoctorProfile> getAllDoctors() {
        System.out.println("DB HIT: Loading all doctors");
        return doctorRepository.findAll();
    }

    @Cacheable(value = "hospitals")
    public List<HospitalProfile> getAllHospitals() {
        System.out.println("DB HIT: Loading all hospitals");
        return hospitalRepository.findAllByOrderByHospitalNameAsc();
    }
    
    public WholesalerProfileResponse getWholesalerProfileByAuthUserId(Long authUserId) {

        WholesalerProfile profile = wholesalerRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new RuntimeException("Wholesaler profile not found"));

        return new WholesalerProfileResponse(
                profile.getAuthUserId(),
                profile.getBusinessName(),
                profile.getBusinessName(),
                profile.getContactPersonName(),
                profile.getMobile(),
                profile.getEmail(),
                profile.getAddress(),
                profile.getDistrict(),
                profile.getState()
        );
    }
}