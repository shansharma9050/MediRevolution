package com.example.medi.doctor.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.doctor.dto.AvailableSlotResponse;
import com.example.medi.doctor.dto.BookDoctorAppointmentRequest;
import com.example.medi.doctor.dto.UpdatePrescriptionRequest;
import com.example.medi.doctor.entity.Appointment;
import com.example.medi.doctor.entity.DoctorAvailability;
import com.example.medi.doctor.entity.Patient;
import com.example.medi.doctor.entity.Prescription;
import com.example.medi.doctor.enums.AppointmentStatus;
import com.example.medi.doctor.enums.ConsultationType;
import com.example.medi.doctor.repository.AppointmentRepository;
import com.example.medi.doctor.repository.DoctorAvailabilityRepository;
import com.example.medi.doctor.repository.PatientRepository;
import com.example.medi.doctor.repository.PrescriptionRepository;
import com.example.medi.doctor.security.CurrentUserUtil;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.Element;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.awt.Color;
import com.lowagie.text.Chunk;
import com.lowagie.text.PageSize;

@Service
public class DoctorService {

	private final PatientRepository patientRepository;
	private final PrescriptionRepository prescriptionRepository;
	private final AppointmentRepository appointmentRepository;
	private final DoctorAvailabilityRepository availabilityRepository;

	public DoctorService(PatientRepository patientRepository, PrescriptionRepository prescriptionRepository,
			AppointmentRepository appointmentRepository, DoctorAvailabilityRepository availabilityRepository) {
		this.patientRepository = patientRepository;
		this.prescriptionRepository = prescriptionRepository;
		this.appointmentRepository = appointmentRepository;
		this.availabilityRepository = availabilityRepository;
	}

	private void allowDoctorOnly() {
		if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
			throw new AccessDeniedException("Only DOCTOR can access this module");
		}
	}

	public Patient createPatient(Patient patient) {
		allowDoctorOnly();
		patient.setDoctorAuthUserId(CurrentUserUtil.getUserId());
		return patientRepository.save(patient);
	}

	public List<Patient> getMyPatients() {
		allowDoctorOnly();
		return patientRepository.findByDoctorAuthUserIdAndActiveTrue(CurrentUserUtil.getUserId());
	}

	public Patient updatePatient(Long patientId, Patient updatedPatient) {
		allowDoctorOnly();

		Patient existingPatient = patientRepository.findById(patientId)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		if (!existingPatient.getDoctorAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your own patient");
		}

		existingPatient.setPatientName(updatedPatient.getPatientName());
		existingPatient.setMobile(updatedPatient.getMobile());
		existingPatient.setEmail(updatedPatient.getEmail());
		existingPatient.setGender(updatedPatient.getGender());
		existingPatient.setDateOfBirth(updatedPatient.getDateOfBirth());
		existingPatient.setBloodGroup(updatedPatient.getBloodGroup());
		existingPatient.setAddress(updatedPatient.getAddress());
		existingPatient.setMedicalHistory(updatedPatient.getMedicalHistory());

		return patientRepository.save(existingPatient);
	}

	public void deletePatient(Long patientId) {
		allowDoctorOnly();

		Patient existingPatient = patientRepository.findById(patientId)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		if (!existingPatient.getDoctorAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your own patient");
		}

		existingPatient.setActive(false);
		patientRepository.save(existingPatient);
	}

	public Prescription createPrescription(Long patientId, Prescription prescription) {
		allowDoctorOnly();

		Patient patient = patientRepository.findById(patientId)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		if (!patient.getDoctorAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can prescribe only for your patients");
		}

		prescription.setDoctorAuthUserId(CurrentUserUtil.getUserId());
		prescription.setDoctorName(CurrentUserUtil.getUserName());
		prescription.setPatient(patient);
		prescription.setPrescriptionDate(LocalDateTime.now());

		return prescriptionRepository.save(prescription);
	}

	public List<Prescription> getMyPrescriptions() {
		allowDoctorOnly();
		return prescriptionRepository.findByDoctorAuthUserId(CurrentUserUtil.getUserId());
	}

	public List<Appointment> getMyAppointments() {
		allowDoctorOnly();
		return appointmentRepository.findByDoctorAuthUserId(CurrentUserUtil.getUserId());
	}

	public DoctorAvailability createAvailability(DoctorAvailability availability) {

		if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
			throw new AccessDeniedException("Only DOCTOR can create availability");
		}

		if (availability.getAvailableDate() == null) {
			throw new RuntimeException("Available date is required");
		}

		if (availability.getStartTime() == null || availability.getEndTime() == null) {
			throw new RuntimeException("Start time and end time are required");
		}

		if (availability.getSlotDuration() == null || availability.getSlotDuration() <= 0) {
			throw new RuntimeException("Slot duration must be greater than zero");
		}

		if (!availability.getEndTime().isAfter(availability.getStartTime())) {
			throw new RuntimeException("End time must be after start time");
		}

		availability.setDoctorAuthUserId(CurrentUserUtil.getUserId());

		return availabilityRepository.save(availability);
	}

	public List<DoctorAvailability> getMyAvailability() {

		if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
			throw new AccessDeniedException("Only DOCTOR can view availability");
		}

		return availabilityRepository.findByDoctorAuthUserId(CurrentUserUtil.getUserId());
	}

	public List<AvailableSlotResponse> getAvailableSlots(Long doctorId, LocalDate date) {

		List<DoctorAvailability> availabilityList = availabilityRepository
				.findByDoctorAuthUserIdAndAvailableDate(doctorId, date);

		List<AvailableSlotResponse> slots = new ArrayList<>();

		for (DoctorAvailability availability : availabilityList) {

			LocalTime current = availability.getStartTime();

			while (current.plusMinutes(availability.getSlotDuration()).compareTo(availability.getEndTime()) <= 0) {

				boolean booked = appointmentRepository
						.existsByDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusNot(doctorId, date,
								current, AppointmentStatus.CANCELLED);

				slots.add(new AvailableSlotResponse(current.toString(), booked));

				current = current.plusMinutes(availability.getSlotDuration());
			}
		}

		return slots;
	}

	public Appointment bookAppointment(BookDoctorAppointmentRequest request) {

		if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
			throw new AccessDeniedException("Only PATIENT can book doctor appointment");
		}

		if (request.getDoctorAuthUserId() == null) {
			throw new RuntimeException("Doctor id is required");
		}

		if (request.getAppointmentDate() == null || request.getAppointmentTime() == null) {
			throw new RuntimeException("Appointment date and time are required");
		}

		boolean booked = appointmentRepository.existsByDoctorAuthUserIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
				request.getDoctorAuthUserId(), request.getAppointmentDate(), request.getAppointmentTime(),
				AppointmentStatus.CANCELLED);

		if (booked) {
			throw new RuntimeException("Selected slot is already booked");
		}

		List<AvailableSlotResponse> slots = getAvailableSlots(request.getDoctorAuthUserId(),
				request.getAppointmentDate());

		boolean validSlot = slots.stream()
				.anyMatch(slot -> slot.getTime().equals(request.getAppointmentTime().toString()) && !slot.isBooked());

		if (!validSlot) {
			throw new RuntimeException("Selected slot is not available");
		}

		Appointment appointment = new Appointment();
		appointment.setDoctorAuthUserId(request.getDoctorAuthUserId());
		appointment.setPatientAuthUserId(CurrentUserUtil.getUserId());
		appointment.setPatientName(request.getPatientName());
		appointment.setPatientMobile(request.getPatientMobile());
		appointment.setAppointmentDate(request.getAppointmentDate());
		appointment.setAppointmentTime(request.getAppointmentTime());
		appointment.setSymptoms(request.getSymptoms());
		appointment.setConsultationType(
		        request.getConsultationType() == null
		                ? ConsultationType.OFFLINE
		                : request.getConsultationType()
		);
		appointment.setStatus(AppointmentStatus.PENDING);

		return appointmentRepository.save(appointment);
	}

	public List<Appointment> getDoctorAppointments() {

		if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
			throw new AccessDeniedException("Only DOCTOR can view doctor appointments");
		}

		return appointmentRepository
				.findByDoctorAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(CurrentUserUtil.getUserId());
	}

	public List<Appointment> getPatientAppointments() {

		if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
			throw new AccessDeniedException("Only PATIENT can view own appointment");
		}

		return appointmentRepository
				.findByPatientAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(CurrentUserUtil.getUserId());
	}

	public Appointment updateAppointmentStatus(Long appointmentId, AppointmentStatus status) {

		if (!"DOCTOR".equals(CurrentUserUtil.getRole())) {
			throw new AccessDeniedException("Only DOCTOR can update appointment status");
		}

		Appointment appointment = appointmentRepository.findById(appointmentId)
				.orElseThrow(() -> new RuntimeException("Appointment not found"));

		if (!appointment.getDoctorAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your appointments");
		}

		appointment.setStatus(status);

		if (status == AppointmentStatus.CONFIRMED && appointment.getMeetingUrl() == null) {
			appointment.setMeetingUrl("Google Meet link will be generated in Phase 2");
		}

		return appointmentRepository.save(appointment);
	}

	public Appointment cancelPatientAppointment(Long appointmentId) {

		if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
			throw new AccessDeniedException("Only PATIENT can cancel appointment");
		}

		Appointment appointment = appointmentRepository.findById(appointmentId)
				.orElseThrow(() -> new RuntimeException("Appointment not found"));

		if (!appointment.getPatientAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can cancel only your appointment");
		}

		if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
			throw new RuntimeException("Completed appointment cannot be cancelled");
		}

		appointment.setStatus(AppointmentStatus.CANCELLED);

		return appointmentRepository.save(appointment);
	}

	public byte[] downloadPrescriptionPdf(Long prescriptionId) {

		Long loggedInUserId = CurrentUserUtil.getUserId();
		String loggedInRole = CurrentUserUtil.getRole();

		Prescription prescription;

		if ("DOCTOR".equals(loggedInRole)) {

			prescription = prescriptionRepository.findByIdAndDoctorAuthUserId(prescriptionId, loggedInUserId)
					.orElseThrow(() -> new RuntimeException("Prescription not found"));

		} else if ("PATIENT".equals(loggedInRole)) {

			prescription = prescriptionRepository.findByIdAndPatientPatientAuthUserId(prescriptionId, loggedInUserId)
					.orElseThrow(() -> new RuntimeException("Prescription not found"));

		} else {
			throw new RuntimeException("Only DOCTOR or PATIENT can download prescription");
		}

		Patient patient = prescription.getPatient();

		if (patient == null) {
			throw new RuntimeException("Patient details not found for prescription");
		}

		try {
			ByteArrayOutputStream out = new ByteArrayOutputStream();

			Document document = new Document(PageSize.A4, 50, 50, 35, 35);
			PdfWriter.getInstance(document, out);

			document.open();

			Color blueColor = new Color(45, 117, 181);
			Color lightBlueColor = new Color(235, 244, 255);
			Color borderColor = new Color(210, 220, 230);

			Font clinicFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.WHITE);
			Font clinicSmallFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.WHITE);
			Font whiteIconFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 34, Color.WHITE);

			Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, blueColor);
			Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
			Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
			Font medicineFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
			Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.WHITE);

			String doctorName = nullSafe(prescription.getDoctorName());

			if ("-".equals(doctorName)) {
				doctorName = nullSafe(CurrentUserUtil.getUserName());
			}

			String clinicName = "MEDIREVOLUTION CLINIC";
			String clinicAddress = "Noida, Uttar Pradesh, India";
			String clinicContact = "Email: support@medirevolution.com | Phone: +91-9876543210";

			String prescriptionDate = "-";

			if (prescription.getPrescriptionDate() != null) {
				prescriptionDate = prescription.getPrescriptionDate()
						.format(DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm a"));
			}

			// ================= HEADER =================

			PdfPTable headerTable = new PdfPTable(2);
			headerTable.setWidthPercentage(100);
			headerTable.setWidths(new float[] { 70, 30 });
			headerTable.setSpacingAfter(25);

			PdfPCell headerLeft = new PdfPCell();
			headerLeft.setBackgroundColor(blueColor);
			headerLeft.setBorder(Rectangle.NO_BORDER);
			headerLeft.setPaddingTop(18);
			headerLeft.setPaddingBottom(18);
			headerLeft.setPaddingLeft(25);

			Paragraph clinicTitle = new Paragraph(clinicName, clinicFont);
			headerLeft.addElement(clinicTitle);

			Paragraph clinicInfo = new Paragraph(clinicAddress + "\n" + clinicContact, clinicSmallFont);
			clinicInfo.setLeading(12);
			headerLeft.addElement(clinicInfo);

			PdfPCell headerRight = new PdfPCell();
			headerRight.setBackgroundColor(blueColor);
			headerRight.setBorder(Rectangle.NO_BORDER);
			headerRight.setPaddingTop(12);
			headerRight.setPaddingRight(25);
			headerRight.setHorizontalAlignment(Element.ALIGN_RIGHT);

			Paragraph icon = new Paragraph("⚕", whiteIconFont);
			icon.setAlignment(Element.ALIGN_RIGHT);
			headerRight.addElement(icon);

			headerTable.addCell(headerLeft);
			headerTable.addCell(headerRight);

			document.add(headerTable);

			// ================= DOCTOR + PRESCRIPTION INFO =================

			PdfPTable topInfoTable = new PdfPTable(2);
			topInfoTable.setWidthPercentage(100);
			topInfoTable.setWidths(new float[] { 60, 40 });
			topInfoTable.setSpacingAfter(22);

			PdfPCell doctorCell = new PdfPCell();
			doctorCell.setBorder(Rectangle.BOTTOM);
			doctorCell.setBorderColor(borderColor);
			doctorCell.setPaddingBottom(10);

			doctorCell.addElement(new Paragraph("Dr. " + doctorName, headingFont));
			doctorCell.addElement(new Paragraph("Medical Physician", normalFont));
			doctorCell.addElement(new Paragraph("Contact: +91-9876543210", normalFont));

			PdfPCell prescriptionInfoCell = new PdfPCell();
			prescriptionInfoCell.setBorder(Rectangle.BOTTOM);
			prescriptionInfoCell.setBorderColor(borderColor);
			prescriptionInfoCell.setPaddingBottom(10);

			Paragraph prescriptionNo = new Paragraph("Prescription No:  RX-" + prescription.getId(), normalFont);
			prescriptionNo.setAlignment(Element.ALIGN_RIGHT);

			Paragraph datePara = new Paragraph("Date:  " + prescriptionDate, normalFont);
			datePara.setAlignment(Element.ALIGN_RIGHT);

			prescriptionInfoCell.addElement(prescriptionNo);
			prescriptionInfoCell.addElement(datePara);

			topInfoTable.addCell(doctorCell);
			topInfoTable.addCell(prescriptionInfoCell);

			document.add(topInfoTable);

			// ================= MEDICAL PRESCRIPTION TITLE =================

			Paragraph prescriptionTitle = new Paragraph("MEDICAL PRESCRIPTION", headingFont);
			prescriptionTitle.setAlignment(Element.ALIGN_CENTER);
			prescriptionTitle.setSpacingAfter(18);
			document.add(prescriptionTitle);

			// ================= SYMPTOMS / DIAGNOSIS =================

			PdfPTable diagnosisTable = new PdfPTable(2);
			diagnosisTable.setWidthPercentage(100);
			diagnosisTable.setWidths(new float[] { 20, 80 });
			diagnosisTable.setSpacingAfter(15);

			addCleanRow(diagnosisTable, "Symptoms", nullSafe(prescription.getSymptoms()), labelFont, normalFont);
			addCleanRow(diagnosisTable, "Diagnosis", nullSafe(prescription.getDiagnosis()), labelFont, normalFont);

			document.add(diagnosisTable);

			// ================= MEDICINES =================

			PdfPCell medicineBox = new PdfPCell();
			medicineBox.setBorder(Rectangle.BOX);
			medicineBox.setBorderColor(borderColor);
			medicineBox.setBackgroundColor(lightBlueColor);
			medicineBox.setPadding(15);

			Paragraph medicineHeading = new Paragraph("Medicines", headingFont);
			medicineHeading.setSpacingAfter(8);
			medicineBox.addElement(medicineHeading);

			Paragraph medicineText = new Paragraph(nullSafe(prescription.getMedicines()), medicineFont);
			medicineText.setLeading(16);
			medicineBox.addElement(medicineText);

			PdfPTable medicineOuterTable = new PdfPTable(1);
			medicineOuterTable.setWidthPercentage(100);
			medicineOuterTable.setSpacingAfter(18);
			medicineOuterTable.addCell(medicineBox);

			document.add(medicineOuterTable);

			// ================= ADVICE =================

			PdfPCell adviceBox = new PdfPCell();
			adviceBox.setBorder(Rectangle.BOX);
			adviceBox.setBorderColor(borderColor);
			adviceBox.setPadding(15);

			Paragraph adviceHeading = new Paragraph("Advice", headingFont);
			adviceHeading.setSpacingAfter(8);
			adviceBox.addElement(adviceHeading);

			Paragraph adviceText = new Paragraph(nullSafe(prescription.getAdvice()), normalFont);
			adviceText.setLeading(15);
			adviceBox.addElement(adviceText);

			PdfPTable adviceOuterTable = new PdfPTable(1);
			adviceOuterTable.setWidthPercentage(100);
			adviceOuterTable.setSpacingAfter(20);
			adviceOuterTable.addCell(adviceBox);

			document.add(adviceOuterTable);

			// ================= PATIENT DETAILS =================

			Paragraph patientHeading = new Paragraph("Patient Details", headingFont);
			patientHeading.setSpacingAfter(8);
			document.add(patientHeading);

			PdfPTable patientTable = new PdfPTable(2);
			patientTable.setWidthPercentage(100);
			patientTable.setWidths(new float[] { 50, 50 });
			patientTable.setSpacingAfter(30);

			addPatientInfoCell(patientTable, "Name", nullSafe(patient.getPatientName()), labelFont, normalFont);
			addPatientInfoCell(patientTable, "Age / DOB",
					patient.getDateOfBirth() != null ? patient.getDateOfBirth().toString() : "-", labelFont,
					normalFont);
			addPatientInfoCell(patientTable, "Gender", nullSafe(patient.getGender()), labelFont, normalFont);
			addPatientInfoCell(patientTable, "Blood Group", nullSafe(patient.getBloodGroup()), labelFont, normalFont);
			addPatientInfoCell(patientTable, "Mobile", nullSafe(patient.getMobile()), labelFont, normalFont);
			addPatientInfoCell(patientTable, "Email", nullSafe(patient.getEmail()), labelFont, normalFont);

			document.add(patientTable);

			// ================= SIGNATURE =================

			PdfPTable signatureTable = new PdfPTable(2);
			signatureTable.setWidthPercentage(100);
			signatureTable.setWidths(new float[] { 60, 40 });
			signatureTable.setSpacingAfter(25);

			PdfPCell emptySignatureCell = new PdfPCell(new Phrase(""));
			emptySignatureCell.setBorder(Rectangle.NO_BORDER);

			PdfPCell signatureCell = new PdfPCell();
			signatureCell.setBorder(Rectangle.NO_BORDER);
			signatureCell.setHorizontalAlignment(Element.ALIGN_CENTER);

			Paragraph line = new Paragraph("________________________", normalFont);
			line.setAlignment(Element.ALIGN_CENTER);

			Paragraph signText = new Paragraph("Doctor Signature", normalFont);
			signText.setAlignment(Element.ALIGN_CENTER);

			signatureCell.addElement(line);
			signatureCell.addElement(signText);

			signatureTable.addCell(emptySignatureCell);
			signatureTable.addCell(signatureCell);

			document.add(signatureTable);

			// ================= FOOTER =================

			PdfPTable footerTable = new PdfPTable(2);
			footerTable.setWidthPercentage(100);
			footerTable.setWidths(new float[] { 50, 50 });

			PdfPCell footerLeft = new PdfPCell(new Phrase("☎ +91-9876543210", footerFont));
			footerLeft.setBackgroundColor(blueColor);
			footerLeft.setBorder(Rectangle.NO_BORDER);
			footerLeft.setPadding(10);

			PdfPCell footerRight = new PdfPCell(new Phrase("✉ support@medirevolution.com", footerFont));
			footerRight.setBackgroundColor(blueColor);
			footerRight.setBorder(Rectangle.NO_BORDER);
			footerRight.setPadding(10);
			footerRight.setHorizontalAlignment(Element.ALIGN_RIGHT);

			footerTable.addCell(footerLeft);
			footerTable.addCell(footerRight);

			document.add(footerTable);

			document.close();

			return out.toByteArray();

		} catch (Exception e) {
			throw new RuntimeException("Unable to generate prescription PDF");
		}
	}

	private void addCleanRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {

		PdfPCell labelCell = new PdfPCell(new Phrase(label + ":", labelFont));
		labelCell.setBorder(Rectangle.NO_BORDER);
		labelCell.setPaddingBottom(8);

		PdfPCell valueCell = new PdfPCell(new Phrase(nullSafe(value), valueFont));
		valueCell.setBorder(Rectangle.NO_BORDER);
		valueCell.setPaddingBottom(8);

		table.addCell(labelCell);
		table.addCell(valueCell);
	}

	private void addPatientInfoCell(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {

		Phrase phrase = new Phrase();
		phrase.add(new Chunk(label + ": ", labelFont));
		phrase.add(new Chunk(nullSafe(value), valueFont));

		PdfPCell cell = new PdfPCell(phrase);
		cell.setBorder(Rectangle.NO_BORDER);
		cell.setPaddingBottom(8);

		table.addCell(cell);
	}

	private String nullSafe(String value) {
		return value == null || value.trim().isEmpty() ? "-" : value;
	}

	public Prescription updatePrescription(Long prescriptionId, UpdatePrescriptionRequest request) {

		Prescription prescription = prescriptionRepository.findById(prescriptionId)
				.orElseThrow(() -> new RuntimeException("Prescription not found"));

		if (request.getSymptoms() == null || request.getSymptoms().trim().isEmpty()) {
			throw new RuntimeException("Symptoms are required");
		}

		if (request.getDiagnosis() == null || request.getDiagnosis().trim().isEmpty()) {
			throw new RuntimeException("Diagnosis is required");
		}

		if (request.getMedicines() == null || request.getMedicines().trim().isEmpty()) {
			throw new RuntimeException("Medicines are required");
		}

		prescription.setSymptoms(request.getSymptoms().trim());
		prescription.setDiagnosis(request.getDiagnosis().trim());
		prescription.setMedicines(request.getMedicines().trim());
		prescription.setAdvice(request.getAdvice() == null ? null : request.getAdvice().trim());

		return prescriptionRepository.save(prescription);
	}

	public List<Prescription> getPrescriptionsForPatient(Long patientAuthUserId) {

		return prescriptionRepository.findByPatientPatientAuthUserIdOrderByPrescriptionDateDesc(patientAuthUserId);
	}
}