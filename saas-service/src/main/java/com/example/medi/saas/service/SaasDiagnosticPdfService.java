package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasDiagnosticOrderItemResponse;
import com.example.medi.saas.dto.SaasDiagnosticOrderResponse;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class SaasDiagnosticPdfService {

	private final SaasDiagnosticService diagnosticService;
	private final SaasPdfBrandingService brandingService;
	private final SaasPermissionService permissionService;

	public SaasDiagnosticPdfService(SaasDiagnosticService diagnosticService, SaasPdfBrandingService brandingService,SaasPermissionService permissionService) {
		this.diagnosticService = diagnosticService;
		this.brandingService = brandingService;
		this.permissionService = permissionService;
	}

	public byte[] generateReportPdf(Long tenantId, Long orderId) {

		SaasDiagnosticOrderResponse order = diagnosticService.getOrder(tenantId, orderId);
		
		permissionService.requirePermission(
		        tenantId,
		        order.getDiagnosticType().equals("LAB") ? TenantModule.LAB : TenantModule.RADIOLOGY,
		        SaasPermissionAction.PRINT
		);

		ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

		Document document = new Document(PageSize.A4, 36, 36, 36, 36);

		try {
			PdfWriter.getInstance(document, outputStream);

			document.open();

			Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
			Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
			Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

			brandingService.addHeader(document, tenantId, order.getDiagnosticType() + " Report");

			document.add(new Paragraph("Order No: " + safe(order.getOrderNumber()), normalFont));
			document.add(new Paragraph("Order Date: " + formatDate(order.getOrderDateTime()), normalFont));
			document.add(new Paragraph("Status: " + safe(order.getStatus()), normalFont));

			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Patient Details", headingFont));
			document.add(new Paragraph("Patient: " + safe(order.getPatientName()), normalFont));
			document.add(new Paragraph("Mobile: " + safe(order.getPatientMobile()), normalFont));

			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Doctor Details", headingFont));
			document.add(new Paragraph("Doctor: " + safe(order.getDoctorName()), normalFont));
			document.add(new Paragraph("Department: " + safe(order.getDepartment()), normalFont));

			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Tests", headingFont));

			Table table = new Table(3);
			table.setWidth(100);
			table.setPadding(4);

			table.addCell("Test");
			table.addCell("Code");
			table.addCell("Price");

			if (order.getItems() != null) {
				for (SaasDiagnosticOrderItemResponse item : order.getItems()) {
					table.addCell(safe(item.getTestName()));
					table.addCell(safe(item.getTestCode()));
					table.addCell("Rs. " + safe(item.getPrice()));
				}
			}

			document.add(table);

			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Clinical Notes", headingFont));
			document.add(new Paragraph(safe(order.getClinicalNotes()), normalFont));

			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Result Summary", headingFont));
			document.add(new Paragraph(safe(order.getResultSummary()), normalFont));

			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Result Details", headingFont));
			document.add(new Paragraph(safe(order.getResultDetails()), normalFont));

			document.add(Chunk.NEWLINE);

			document.add(new Paragraph("Report Ready At: " + formatDate(order.getReportReadyAt()), normalFont));

			document.add(Chunk.NEWLINE);
			document.add(Chunk.NEWLINE);

			Paragraph signature = new Paragraph("Authorized Signature: ____________________", normalFont);
			signature.setAlignment(Element.ALIGN_RIGHT);
			document.add(signature);
			
			brandingService.addFooter(document, tenantId, brandingService.getBranding(tenantId).getReportFooter());

			document.close();

			return outputStream.toByteArray();

		} catch (Exception e) {
			throw new RuntimeException("Unable to generate diagnostic report PDF");
		}
	}

	private String formatDate(java.time.LocalDateTime dateTime) {
		if (dateTime == null) {
			return "-";
		}

		return dateTime.format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"));
	}

	private String safe(Object value) {
		return value == null || value.toString().isBlank() ? "-" : value.toString();
	}
}