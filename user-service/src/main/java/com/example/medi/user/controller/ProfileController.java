package com.example.medi.user.controller;


import org.springframework.web.bind.annotation.*;

import com.example.medi.user.entity.DoctorProfile;
import com.example.medi.user.entity.HospitalProfile;
import com.example.medi.user.entity.RetailerProfile;
import com.example.medi.user.entity.WholesalerProfile;
import com.example.medi.user.security.CurrentUserUtil;
import com.example.medi.user.security.RoleValidator;
import com.example.medi.user.service.ProfileService;


@RestController
@RequestMapping("/users/profiles")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @PostMapping("/wholesaler")
    public WholesalerProfile createWholesalerProfile(@RequestBody WholesalerProfile profile) {
        RoleValidator.allowOnly("WHOLESALER");
        profile.setAuthUserId(CurrentUserUtil.getUserId());
        return profileService.createWholesalerProfile(profile);
    }

    @PostMapping("/retailer")
    public RetailerProfile createRetailerProfile(@RequestBody RetailerProfile profile) {
        RoleValidator.allowOnly("RETAILER");
        profile.setAuthUserId(CurrentUserUtil.getUserId());
        return profileService.createRetailerProfile(profile);
    }

    @PostMapping("/doctor")
    public DoctorProfile createDoctorProfile(@RequestBody DoctorProfile profile) {
        RoleValidator.allowOnly("DOCTOR");
        profile.setAuthUserId(CurrentUserUtil.getUserId());
        return profileService.createDoctorProfile(profile);
    }

    @PostMapping("/hospital")
    public HospitalProfile createHospitalProfile(@RequestBody HospitalProfile profile) {
        RoleValidator.allowOnly("HOSPITAL");
        profile.setAuthUserId(CurrentUserUtil.getUserId());
        return profileService.createHospitalProfile(profile);
    }

    @GetMapping("/me/wholesaler")
    public WholesalerProfile getMyWholesalerProfile() {
        RoleValidator.allowOnly("WHOLESALER");
        return profileService.getWholesalerProfile(CurrentUserUtil.getUserId());
    }

    @GetMapping("/me/retailer")
    public RetailerProfile getMyRetailerProfile() {
        RoleValidator.allowOnly("RETAILER");
        return profileService.getRetailerProfile(CurrentUserUtil.getUserId());
    }

    @GetMapping("/me/doctor")
    public DoctorProfile getMyDoctorProfile() {
        RoleValidator.allowOnly("DOCTOR");
        return profileService.getDoctorProfile(CurrentUserUtil.getUserId());
    }

    @GetMapping("/me/hospital")
    public HospitalProfile getMyHospitalProfile() {
        RoleValidator.allowOnly("HOSPITAL");
        return profileService.getHospitalProfile(CurrentUserUtil.getUserId());
    }

    @GetMapping("/wholesaler/{authUserId}")
    public WholesalerProfile getWholesalerProfile(@PathVariable Long authUserId) {
        RoleValidator.allowAny("SUPER_ADMIN", "WHOLESALER");
        return profileService.getWholesalerProfile(authUserId);
    }

    @GetMapping("/retailer/{authUserId}")
    public RetailerProfile getRetailerProfile(@PathVariable Long authUserId) {
        RoleValidator.allowAny("SUPER_ADMIN", "RETAILER");
        return profileService.getRetailerProfile(authUserId);
    }

    @GetMapping("/doctor/{authUserId}")
    public DoctorProfile getDoctorProfile(@PathVariable Long authUserId) {
        RoleValidator.allowAny("SUPER_ADMIN", "DOCTOR");
        return profileService.getDoctorProfile(authUserId);
    }

    @GetMapping("/hospital/{authUserId}")
    public HospitalProfile getHospitalProfile(@PathVariable Long authUserId) {
        RoleValidator.allowAny("SUPER_ADMIN", "HOSPITAL");
        return profileService.getHospitalProfile(authUserId);
    }
    
    @PutMapping("/wholesaler")
    public WholesalerProfile updateWholesalerProfile(@RequestBody WholesalerProfile profile) {
        RoleValidator.allowOnly("WHOLESALER");
        profile.setAuthUserId(CurrentUserUtil.getUserId());
        return profileService.updateWholesalerProfile(profile);
    }

    @PutMapping("/retailer")
    public RetailerProfile updateRetailerProfile(@RequestBody RetailerProfile profile) {
        RoleValidator.allowOnly("RETAILER");
        profile.setAuthUserId(CurrentUserUtil.getUserId());
        return profileService.updateRetailerProfile(profile);
    }

    @PutMapping("/doctor")
    public DoctorProfile updateDoctorProfile(@RequestBody DoctorProfile profile) {
        RoleValidator.allowOnly("DOCTOR");
        profile.setAuthUserId(CurrentUserUtil.getUserId());
        return profileService.updateDoctorProfile(profile);
    }

    @PutMapping("/hospital")
    public HospitalProfile updateHospitalProfile(@RequestBody HospitalProfile profile) {
        RoleValidator.allowOnly("HOSPITAL");
        profile.setAuthUserId(CurrentUserUtil.getUserId());
        return profileService.updateHospitalProfile(profile);
    }
}