package com.example.medi.saas.service;

import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class SaasVideoMeetingService {

	public String generateMeetingUrl(Long appointmentId) {

		String room = "medirevolution-saas-appointment-" + appointmentId + "-" + UUID.randomUUID();

		return "https://meet.jit.si/" + room;
	}
}