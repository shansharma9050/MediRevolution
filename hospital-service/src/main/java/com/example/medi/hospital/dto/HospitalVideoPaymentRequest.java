package com.example.medi.hospital.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public class HospitalVideoPaymentRequest {

    private String bookingFor;
    private String consultationType;

    private Long hospitalAuthUserId;
    private Long hospitalDoctorId;

    private String patientName;
    private String patientMobile;
    private String patientEmail;

    private LocalDate appointmentDate;
    private LocalTime appointmentTime;

    private String symptoms;

    public String getBookingFor() {
        return bookingFor;
    }

    public void setBookingFor(String bookingFor) {
        this.bookingFor = bookingFor;
    }

    public String getConsultationType() {
        return consultationType;
    }

    public void setConsultationType(String consultationType) {
        this.consultationType = consultationType;
    }

    public Long getHospitalAuthUserId() {
        return hospitalAuthUserId;
    }

    public void setHospitalAuthUserId(Long hospitalAuthUserId) {
        this.hospitalAuthUserId = hospitalAuthUserId;
    }

    public Long getHospitalDoctorId() {
        return hospitalDoctorId;
    }

    public void setHospitalDoctorId(Long hospitalDoctorId) {
        this.hospitalDoctorId = hospitalDoctorId;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public String getPatientMobile() {
        return patientMobile;
    }

    public void setPatientMobile(String patientMobile) {
        this.patientMobile = patientMobile;
    }

    public String getPatientEmail() {
        return patientEmail;
    }

    public void setPatientEmail(String patientEmail) {
        this.patientEmail = patientEmail;
    }

    public LocalDate getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(LocalDate appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public LocalTime getAppointmentTime() {
        return appointmentTime;
    }

    public void setAppointmentTime(LocalTime appointmentTime) {
        this.appointmentTime = appointmentTime;
    }

    public String getSymptoms() {
        return symptoms;
    }

    public void setSymptoms(String symptoms) {
        this.symptoms = symptoms;
    }
}