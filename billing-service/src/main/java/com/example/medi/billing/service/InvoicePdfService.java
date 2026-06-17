package com.example.medi.billing.service;

import com.example.medi.billing.entity.Invoice;
import com.example.medi.billing.entity.InvoiceItem;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;

@Service
public class InvoicePdfService {

    @Cacheable(value = "invoicePdf", key = "#invoice.id")
    public byte[] generateInvoicePdf(Invoice invoice) {

        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();

            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, out);

            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            Paragraph title = new Paragraph("MediRevolution Invoice", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            document.add(new Paragraph(" "));
            document.add(new Paragraph("Invoice No: " + invoice.getInvoiceNumber(), normalFont));
            document.add(new Paragraph("Order No: " + invoice.getOrderNumber(), normalFont));
            document.add(new Paragraph("Invoice Date: " + invoice.getInvoiceDate(), normalFont));
            document.add(new Paragraph("Retailer ID: " + invoice.getRetailerAuthUserId(), normalFont));
            document.add(new Paragraph("Wholesaler ID: " + invoice.getWholesalerAuthUserId(), normalFont));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1, 3, 2, 1, 2, 2, 2, 2});

            addHeader(table, "S.No", headerFont);
            addHeader(table, "Medicine", headerFont);
            addHeader(table, "Batch", headerFont);
            addHeader(table, "Qty", headerFont);
            addHeader(table, "Unit Price", headerFont);
            addHeader(table, "GST %", headerFont);
            addHeader(table, "GST Amt", headerFont);
            addHeader(table, "Total", headerFont);

            int index = 1;

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

            document.add(table);
            document.add(new Paragraph(" "));

            Paragraph taxable = new Paragraph("Taxable Amount: ₹ " + format(invoice.getTaxableAmount()), headerFont);
            taxable.setAlignment(Element.ALIGN_RIGHT);
            document.add(taxable);

            Paragraph gst = new Paragraph("GST Amount: ₹ " + format(invoice.getGstAmount()), headerFont);
            gst.setAlignment(Element.ALIGN_RIGHT);
            document.add(gst);

            Paragraph total = new Paragraph("Grand Total: ₹ " + format(invoice.getTotalAmount()), titleFont);
            total.setAlignment(Element.ALIGN_RIGHT);
            document.add(total);

            document.add(new Paragraph(" "));
            document.add(new Paragraph("This is a computer-generated invoice.", normalFont));

            document.close();

            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate invoice PDF");
        }
    }

    private void addHeader(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPadding(5);
        table.addCell(cell);
    }

    private void addCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text == null ? "" : text, font));
        cell.setPadding(5);
        table.addCell(cell);
    }

    private String format(BigDecimal value) {
        return value == null ? "0.00" : value.setScale(2, java.math.RoundingMode.HALF_UP).toString();
    }
}