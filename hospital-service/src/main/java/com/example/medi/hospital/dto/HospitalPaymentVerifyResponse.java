package com.example.medi.hospital.dto;

public class HospitalPaymentVerifyResponse {

	 private boolean success;
	    private String message;
	    private Long appointmentId;
	    private String status;
	    private String paymentStatus;
	    private String meetingUrl;

	    public HospitalPaymentVerifyResponse() {
	    }

	    public HospitalPaymentVerifyResponse(
	            boolean success,
	            String message,
	            Long appointmentId,
	            String status,
	            String paymentStatus,
	            String meetingUrl
	    ) {
	        this.success = success;
	        this.message = message;
	        this.appointmentId = appointmentId;
	        this.status = status;
	        this.paymentStatus = paymentStatus;
	        this.meetingUrl = meetingUrl;
	    }

	    public boolean isSuccess() {
	        return success;
	    }

	    public String getMessage() {
	        return message;
	    }

	    public Long getAppointmentId() {
	        return appointmentId;
	    }

	    public String getStatus() {
	        return status;
	    }

	    public String getPaymentStatus() {
	        return paymentStatus;
	    }

	    public String getMeetingUrl() {
	        return meetingUrl;
	    }
	
}