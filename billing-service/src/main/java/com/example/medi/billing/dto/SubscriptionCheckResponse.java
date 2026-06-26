package com.example.medi.billing.dto;

import java.time.LocalDate;

public class SubscriptionCheckResponse {

	 private boolean active;
	    private Long authUserId;
	    private String role;
	    private Long planId;
	    private String planName;
	    private LocalDate startDate;
	    private LocalDate endDate;
	    private Integer maxMedicines;
	    private Integer maxAppointments;
	    private Integer maxStaff;
	    private Boolean videoConsultationAllowed;

	    public SubscriptionCheckResponse() {
	    }

	    public SubscriptionCheckResponse(
	            boolean active,
	            Long authUserId,
	            String role,
	            Long planId,
	            String planName,
	            LocalDate startDate,
	            LocalDate endDate,
	            Integer maxMedicines,
	            Integer maxAppointments,
	            Integer maxStaff,
	            Boolean videoConsultationAllowed
	    ) {
	        this.active = active;
	        this.authUserId = authUserId;
	        this.role = role;
	        this.planId = planId;
	        this.planName = planName;
	        this.startDate = startDate;
	        this.endDate = endDate;
	        this.maxMedicines = maxMedicines;
	        this.maxAppointments = maxAppointments;
	        this.maxStaff = maxStaff;
	        this.videoConsultationAllowed = videoConsultationAllowed;
	    }

	    public boolean isActive() {
	        return active;
	    }

	    public Long getAuthUserId() {
	        return authUserId;
	    }

	    public String getRole() {
	        return role;
	    }

	    public Long getPlanId() {
	        return planId;
	    }

	    public String getPlanName() {
	        return planName;
	    }

	    public LocalDate getStartDate() {
	        return startDate;
	    }

	    public LocalDate getEndDate() {
	        return endDate;
	    }

	    public Integer getMaxMedicines() {
	        return maxMedicines;
	    }

	    public Integer getMaxAppointments() {
	        return maxAppointments;
	    }

	    public Integer getMaxStaff() {
	        return maxStaff;
	    }

	    public Boolean getVideoConsultationAllowed() {
	        return videoConsultationAllowed;
	    }

	    public void setActive(boolean active) {
	        this.active = active;
	    }

	    public void setAuthUserId(Long authUserId) {
	        this.authUserId = authUserId;
	    }

	    public void setRole(String role) {
	        this.role = role;
	    }

	    public void setPlanId(Long planId) {
	        this.planId = planId;
	    }

	    public void setPlanName(String planName) {
	        this.planName = planName;
	    }

	    public void setStartDate(LocalDate startDate) {
	        this.startDate = startDate;
	    }

	    public void setEndDate(LocalDate endDate) {
	        this.endDate = endDate;
	    }

	    public void setMaxMedicines(Integer maxMedicines) {
	        this.maxMedicines = maxMedicines;
	    }

	    public void setMaxAppointments(Integer maxAppointments) {
	        this.maxAppointments = maxAppointments;
	    }

	    public void setMaxStaff(Integer maxStaff) {
	        this.maxStaff = maxStaff;
	    }

	    public void setVideoConsultationAllowed(Boolean videoConsultationAllowed) {
	        this.videoConsultationAllowed = videoConsultationAllowed;
	    }
}