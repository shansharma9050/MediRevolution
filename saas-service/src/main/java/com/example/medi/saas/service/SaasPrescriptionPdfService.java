package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasPrescriptionMedicineResponse;
import com.example.medi.saas.dto.SaasPrescriptionResponse;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class SaasPrescriptionPdfService {

	private final SaasPrescriptionService prescriptionService;
	private final SaasPdfBrandingService brandingService;
	 private final SaasPermissionService permissionService;

	public SaasPrescriptionPdfService(SaasPrescriptionService prescriptionService,
			SaasPdfBrandingService brandingService, SaasPermissionService permissionService) {
		this.prescriptionService = prescriptionService;
		this.brandingService = brandingService;
		 this.permissionService = permissionService;
	}

	public byte[] generatePrescriptionPdf(Long tenantId, Long prescriptionId) {
		
		permissionService.requirePermission(
		        tenantId,
		        TenantModule.PRESCRIPTIONS,
		        SaasPermissionAction.PRINT
		);

		SaasPrescriptionResponse prescription = prescriptionService.getPrescription(tenantId, prescriptionId);

		ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

		Document document = new Document(PageSize.A4, 36, 36, 36, 36);

		try {
			PdfWriter.getInstance(document, outputStream);

			document.open();

			Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
			Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
			Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
			Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

			brandingService.addHeader(document, tenantId, "Prescription");

			document.add(new Paragraph("Prescription ID: " + prescription.getId(), smallFont));
			document.add(new Paragraph("Date: " + formatDateTime(prescription), smallFont));
			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Patient Details", headingFont));
			document.add(new Paragraph("Name: " + safe(prescription.getPatientName()), normalFont));
			document.add(new Paragraph("Patient Code: " + safe(prescription.getPatientCode()), normalFont));
			document.add(new Paragraph("Mobile: " + safe(prescription.getPatientMobile()), normalFont));
			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Doctor Details", headingFont));
			document.add(new Paragraph("Doctor: " + safe(prescription.getDoctorName()), normalFont));
			document.add(new Paragraph("Department: " + safe(prescription.getDepartment()), normalFont));
			document.add(new Paragraph("Specialization: " + safe(prescription.getSpecialization()), normalFont));
			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Vitals", headingFont));
			document.add(new Paragraph("BP: " + safe(prescription.getBloodPressure()) + " | Pulse: "
					+ safe(prescription.getPulse()) + " | Temp: " + safe(prescription.getTemperature()) + " | SpO2: "
					+ safe(prescription.getSpo2()), normalFont));

			document.add(new Paragraph("Weight: " + safe(prescription.getWeight()) + " | Height: "
					+ safe(prescription.getHeight()) + " | Sugar: " + safe(prescription.getSugarLevel()), normalFont));

			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Diagnosis", headingFont));
			document.add(new Paragraph(safe(prescription.getDiagnosis()), normalFont));
			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Clinical Notes", headingFont));
			document.add(new Paragraph(safe(prescription.getClinicalNotes()), normalFont));
			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Medicines", headingFont));

			if (prescription.getMedicines() == null || prescription.getMedicines().isEmpty()) {
				document.add(new Paragraph("No medicines added.", normalFont));
			} else {
				com.lowagie.text.Table table = new com.lowagie.text.Table(5);
				table.setWidth(100);
				table.setPadding(4);

				table.addCell("Medicine");
				table.addCell("Dosage");
				table.addCell("Frequency");
				table.addCell("Duration");
				table.addCell("Instructions");

				for (SaasPrescriptionMedicineResponse medicine : prescription.getMedicines()) {
					table.addCell(safe(medicine.getMedicineName()));
					table.addCell(safe(medicine.getDosage()));
					table.addCell(safe(medicine.getFrequency()));
					table.addCell(safe(medicine.getDuration()));
					table.addCell(safe(medicine.getInstructions()));
				}

				document.add(table);
			}

			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Advice", headingFont));
			document.add(new Paragraph(safe(prescription.getAdvice()), normalFont));
			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Lab Tests", headingFont));
			document.add(new Paragraph(safe(prescription.getLabTests()), normalFont));
			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Follow Up", headingFont));
			document.add(new Paragraph(
					"Date: " + (prescription.getFollowUpDate() == null ? "-" : prescription.getFollowUpDate())
							+ " | Advice: " + safe(prescription.getFollowUpAdvice()),
					normalFont));

			document.add(Chunk.NEWLINE);
			document.add(Chunk.NEWLINE);

			Paragraph signature = new Paragraph("Doctor Signature: ____________________", normalFont);
			signature.setAlignment(Element.ALIGN_RIGHT);
			document.add(signature);
			
			brandingService.addFooter(document, tenantId, brandingService.getBranding(tenantId).getPrescriptionFooter());

			document.close();

			return outputStream.toByteArray();

		} catch (Exception e) {
			throw new RuntimeException("Unable to generate prescription PDF");
		}
	}

	private String formatDateTime(SaasPrescriptionResponse prescription) {
		if (prescription.getCreatedAt() == null) {
			return "-";
		}

		return prescription.getCreatedAt().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"));
	}

	private String safe(Object value) {
		return value == null || value.toString().isBlank() ? "-" : value.toString();
	}
}