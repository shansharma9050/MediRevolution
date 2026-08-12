package com.example.medi.billing.service;

import com.example.medi.billing.entity.Invoice;
import com.example.medi.billing.entity.InvoiceItem;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class InvoicePdfService {

	@Cacheable(value = "invoicePdf", key = "#invoice.id")
	public byte[] generateInvoicePdf(Invoice invoice) {

		if (invoice == null) {
			throw new IllegalArgumentException("Invoice cannot be null");
		}

		try {

			ByteArrayOutputStream out = new ByteArrayOutputStream();

			Document document = new Document(PageSize.A4);

			PdfWriter.getInstance(document, out);

			document.open();

			/*
			 * ===================================================== FONTS
			 * =====================================================
			 */

			Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);

			Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);

			Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

			/*
			 * ===================================================== TITLE
			 * =====================================================
			 */

			Paragraph title = new Paragraph("MediRevolution Invoice", titleFont);

			title.setAlignment(Element.ALIGN_CENTER);

			document.add(title);

			document.add(new Paragraph(" "));

			/*
			 * ===================================================== INVOICE DETAILS
			 * =====================================================
			 */

			document.add(new Paragraph("Invoice No: " + safe(invoice.getInvoiceNumber()), normalFont));

			document.add(new Paragraph("Order No: " + safe(invoice.getOrderNumber()), normalFont));

			document.add(new Paragraph("Invoice Date: " + safe(invoice.getInvoiceDate()), normalFont));

			document.add(new Paragraph("Retailer ID: " + safe(invoice.getRetailerAuthUserId()), normalFont));

			document.add(new Paragraph("Wholesaler ID: " + safe(invoice.getWholesalerAuthUserId()), normalFont));

			document.add(new Paragraph(" "));

			/*
			 * ===================================================== ITEMS TABLE
			 * =====================================================
			 */

			PdfPTable table = new PdfPTable(8);

			table.setWidthPercentage(100);

			table.setWidths(new float[] { 1, 3, 2, 1, 2, 2, 2, 2 });

			addHeader(table, "S.No", headerFont);

			addHeader(table, "Medicine", headerFont);

			addHeader(table, "Batch", headerFont);

			addHeader(table, "Qty", headerFont);

			addHeader(table, "Unit Price", headerFont);

			addHeader(table, "GST %", headerFont);

			addHeader(table, "GST Amt", headerFont);

			addHeader(table, "Total", headerFont);

			/*
			 * ===================================================== ITEMS
			 * =====================================================
			 */

			int index = 1;

			if (invoice.getItems() != null) {

				for (InvoiceItem item : invoice.getItems()) {

					addCell(table, String.valueOf(index++), normalFont);

					addCell(table, item.getMedicineName(), normalFont);

					addCell(table, item.getBatchNumber(), normalFont);

					addCell(table, String.valueOf(item.getQuantity()), normalFont);

					addCell(table, format(item.getUnitPrice()), normalFont);

					addCell(table, format(item.getGstPercentage()), normalFont);

					addCell(table, format(item.getGstAmount()), normalFont);

					addCell(table, format(item.getLineTotal()), normalFont);
				}
			}

			document.add(table);

			document.add(new Paragraph(" "));

			/*
			 * ===================================================== TOTALS
			 * =====================================================
			 *
			 * IMPORTANT: Using "Rs." instead of "₹" because Helvetica does not support the
			 * Rupee symbol.
			 */

			Paragraph taxable = new Paragraph("Taxable Amount: Rs. " + format(invoice.getTaxableAmount()), headerFont);

			taxable.setAlignment(Element.ALIGN_RIGHT);

			document.add(taxable);

			Paragraph gst = new Paragraph("GST Amount: Rs. " + format(invoice.getGstAmount()), headerFont);

			gst.setAlignment(Element.ALIGN_RIGHT);

			document.add(gst);

			Paragraph total = new Paragraph("Grand Total: Rs. " + format(invoice.getTotalAmount()), titleFont);

			total.setAlignment(Element.ALIGN_RIGHT);

			document.add(total);

			document.add(new Paragraph(" "));

			/*
			 * ===================================================== FOOTER
			 * =====================================================
			 */

			document.add(new Paragraph("This is a computer-generated invoice.", normalFont));

			/*
			 * ===================================================== CLOSE
			 * =====================================================
			 */

			document.close();

			return out.toByteArray();

		} catch (Exception e) {

			e.printStackTrace();

			throw new RuntimeException("Failed to generate invoice PDF: " + e.getMessage(), e);
		}
	}

	/*
	 * ============================================================= TABLE HEADER
	 * =============================================================
	 */

	private void addHeader(PdfPTable table, String text, Font font) {

		PdfPCell cell = new PdfPCell(new Phrase(safe(text), font));

		cell.setHorizontalAlignment(Element.ALIGN_CENTER);

		cell.setPadding(5);

		table.addCell(cell);
	}

	/*
	 * ============================================================= TABLE CELL
	 * =============================================================
	 */

	private void addCell(PdfPTable table, String text, Font font) {

		PdfPCell cell = new PdfPCell(new Phrase(safe(text), font));

		cell.setPadding(5);

		table.addCell(cell);
	}

	/*
	 * ============================================================= DECIMAL FORMAT
	 * =============================================================
	 */

	private String format(BigDecimal value) {

		if (value == null) {
			return "0.00";
		}

		return value.setScale(2, RoundingMode.HALF_UP).toString();
	}

	/*
	 * ============================================================= NULL SAFE
	 * =============================================================
	 */

	private String safe(Object value) {

		return value == null ? "" : String.valueOf(value);
	}
}