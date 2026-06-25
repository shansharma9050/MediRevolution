package com.example.medi.hospital.service;

import org.springframework.stereotype.Service;

@Service
public class HospitalVideoMeetingService {

    public String generateMeetingUrl(Long appointmentId) {
        return "https://meet.jit.si/medirevolution-hospital-appointment-" + appointmentId;
    }
}