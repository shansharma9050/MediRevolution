package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasInvoiceItemResponse;
import com.example.medi.saas.dto.SaasInvoiceResponse;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class SaasInvoicePdfService {

	private final SaasBillingService billingService;
	private final SaasPdfBrandingService brandingService;
	private final SaasPermissionService permissionService;

	public SaasInvoicePdfService(
	        SaasBillingService billingService,
	        SaasPdfBrandingService brandingService,
	        SaasPermissionService permissionService
	) {
	    this.billingService = billingService;
	    this.brandingService = brandingService;
	    this.permissionService = permissionService;
	}
    public byte[] generateInvoicePdf(Long tenantId, Long invoiceId) {
    	
    	permissionService.requirePermission(
    	        tenantId,
    	        TenantModule.BILLING,
    	        SaasPermissionAction.PRINT
    	);

        SaasInvoiceResponse invoice = billingService.getInvoice(tenantId, invoiceId);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        Document document = new Document(PageSize.A4, 36, 36, 36, 36);

        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            brandingService.addHeader(document, tenantId, "Invoice");

            document.add(new Paragraph("Invoice No: " + safe(invoice.getInvoiceNumber()), normalFont));
            document.add(new Paragraph("Invoice Type: " + safe(invoice.getInvoiceType()), normalFont));
            document.add(new Paragraph("Date: " + formatDate(invoice.getInvoiceDateTime()), normalFont));
            document.add(new Paragraph("Payment Status: " + safe(invoice.getPaymentStatus()), normalFont));

            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Patient Details", headingFont));
            document.add(new Paragraph("Name: " + safe(invoice.getPatientName()), normalFont));
            document.add(new Paragraph("Mobile: " + safe(invoice.getPatientMobile()), normalFont));

            document.add(Chunk.NEWLINE);

            if (invoice.getDoctorName() != null) {
                document.add(new Paragraph("Doctor Details", headingFont));
                document.add(new Paragraph("Doctor: " + safe(invoice.getDoctorName()), normalFont));
                document.add(new Paragraph("Department: " + safe(invoice.getDepartment()), normalFont));
                document.add(Chunk.NEWLINE);
            }

            if (invoice.getIpdNumber() != null) {
                document.add(new Paragraph("IPD No: " + safe(invoice.getIpdNumber()), normalFont));
                document.add(Chunk.NEWLINE);
            }

            document.add(new Paragraph("Invoice Items", headingFont));

            Table table = new Table(5);
            table.setWidth(100);
            table.setPadding(4);

            table.addCell("Item");
            table.addCell("Type");
            table.addCell("Qty");
            table.addCell("Unit Price");
            table.addCell("Total");

            if (invoice.getItems() != null) {
                for (SaasInvoiceItemResponse item : invoice.getItems()) {
                    table.addCell(safe(item.getItemName()));
                    table.addCell(safe(item.getItemType()));
                    table.addCell(safe(item.getQuantity()));
                    table.addCell("Rs. " + safe(item.getUnitPrice()));
                    table.addCell("Rs. " + safe(item.getTotalPrice()));
                }
            }

            document.add(table);

            document.add(Chunk.NEWLINE);

            Paragraph totals = new Paragraph(
                    "Subtotal: Rs. " + safe(invoice.getSubtotal()) + "\n"
                            + "Discount: Rs. " + safe(invoice.getDiscountAmount()) + "\n"
                            + "Tax: Rs. " + safe(invoice.getTaxAmount()) + "\n"
                            + "Total: Rs. " + safe(invoice.getTotalAmount()) + "\n"
                            + "Paid: Rs. " + safe(invoice.getPaidAmount()) + "\n"
                            + "Due: Rs. " + safe(invoice.getDueAmount()),
                    headingFont
            );
            totals.setAlignment(Element.ALIGN_RIGHT);
            document.add(totals);

            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Payment Mode: " + safe(invoice.getPaymentMode()), normalFont));
            document.add(new Paragraph("Transaction ID: " + safe(invoice.getTransactionId()), normalFont));
            document.add(new Paragraph("Notes: " + safe(invoice.getNotes()), normalFont));

            document.add(Chunk.NEWLINE);
            document.add(Chunk.NEWLINE);

            Paragraph signature = new Paragraph("Authorized Signature: ____________________", normalFont);
            signature.setAlignment(Element.ALIGN_RIGHT);
            document.add(signature);

            
            brandingService.addFooter(document, tenantId, brandingService.getBranding(tenantId).getInvoiceFooter());
            
            document.close();

            return outputStream.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Unable to generate invoice PDF");
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