package com.example.medi.doctor.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.example.medi.doctor.entity.Appointment;

@Service
public class AppointmentNotificationService {

    private final JavaMailSender mailSender;

    public AppointmentNotificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendMeetingLinkToPatient(Appointment appointment) {

        if (appointment == null) {
            return;
        }

        if (!isValidMeetingUrl(appointment.getMeetingUrl())) {
            System.out.println("Invalid meeting URL. Email not sent: " + appointment.getMeetingUrl());
            return;
        }

        if (!StringUtils.hasText(appointment.getPatientEmail())) {
            System.out.println("Patient email not found. Email not sent.");
            return;
        }

        try {
            sendEmailToPatient(appointment);
            System.out.println("Meeting link email sent to: " + appointment.getPatientEmail());
        } catch (Exception e) {
            System.err.println("Failed to send meeting link email: " + e.getMessage());
        }
    }

    private void sendEmailToPatient(Appointment appointment) {

        String subject = "MediRevolution Video Consultation Confirmed";

        String body =
                "Hello " + appointment.getPatientName() + ",\n\n" +
                "Your video consultation appointment is confirmed.\n\n" +
                "Appointment Date: " + appointment.getAppointmentDate() + "\n" +
                "Appointment Time: " + appointment.getAppointmentTime() + "\n\n" +
                "Join Meeting Link:\n" +
                appointment.getMeetingUrl() + "\n\n" +
                "Please join at your appointment time.\n\n" +
                "Regards,\n" +
                "MediRevolution";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(appointment.getPatientEmail());
        message.setSubject(subject);
        message.setText(body);

        mailSender.send(message);
    }

    private boolean isValidMeetingUrl(String url) {
        return StringUtils.hasText(url)
                && (url.startsWith("http://") || url.startsWith("https://"));
    }
}