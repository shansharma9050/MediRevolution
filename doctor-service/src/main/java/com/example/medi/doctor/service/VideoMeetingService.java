package com.example.medi.doctor.service;

import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class VideoMeetingService {

    public String generateMeetingUrl(Long appointmentId) {

        String roomName = "MediRevolution-" + appointmentId + "-" + UUID.randomUUID();

        return "https://meet.jit.si/" + roomName;
    }
}