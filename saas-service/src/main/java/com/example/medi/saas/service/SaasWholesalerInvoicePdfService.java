package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasSaleItemResponse;
import com.example.medi.saas.dto.SaasSaleResponse;
import com.example.medi.saas.dto.SaasSaleStockAllocationResponse;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.lowagie.text.Cell;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Table;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class SaasWholesalerInvoicePdfService {

    private final SaasWholesalerBillingService billingService;
    private final SaasPdfBrandingService brandingService;
    private final SaasPermissionService permissionService;

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private static final DecimalFormat MONEY =
            new DecimalFormat("0.00");

    public SaasWholesalerInvoicePdfService(
            SaasWholesalerBillingService billingService,
            SaasPdfBrandingService brandingService,
            SaasPermissionService permissionService
    ) {
        this.billingService = billingService;
        this.brandingService = brandingService;
        this.permissionService = permissionService;
    }


            private String safe(Object value) {

                if (value == null) {
                    return "-";
                }

                String text = value.toString().trim();

                return text.isEmpty() ? "-" : text;
            }

            private String money(BigDecimal value) {

                if (value == null) {
                    value = BigDecimal.ZERO;
                }

                return "Rs. " + MONEY.format(value);
            }

            private String date(LocalDate value) {

                if (value == null) {
                    return "-";
                }

                return value.format(DATE_FORMAT);
            }

            private String batch(
                    List<SaasSaleStockAllocationResponse> allocations
            ) {

                if (allocations == null || allocations.isEmpty()) {
                    return "-";
                }

                StringBuilder sb = new StringBuilder();

                for (SaasSaleStockAllocationResponse allocation : allocations) {

                    if (allocation.getBatchNumber() == null) {
                        continue;
                    }

                    if (sb.length() > 0) {
                        sb.append(", ");
                    }

                    sb.append(allocation.getBatchNumber());
                }

                return sb.length() == 0 ? "-" : sb.toString();
            }

            private String expiry(
                    List<SaasSaleStockAllocationResponse> allocations
            ) {

                if (allocations == null || allocations.isEmpty()) {
                    return "-";
                }

                StringBuilder sb = new StringBuilder();

                for (SaasSaleStockAllocationResponse allocation : allocations) {

                    if (allocation.getExpiryDate() == null) {
                        continue;
                    }

                    if (sb.length() > 0) {
                        sb.append(", ");
                    }

                    sb.append(
                            allocation.getExpiryDate()
                                    .format(DATE_FORMAT)
                    );
                }

                return sb.length() == 0 ? "-" : sb.toString();
            }

            private int totalQuantity(
                    List<SaasSaleStockAllocationResponse> allocations
            ) {

                if (allocations == null) {
                    return 0;
                }

                return allocations.stream()
                        .mapToInt(SaasSaleStockAllocationResponse::getAllocatedQuantity)
                        .sum();
            }
            
            public byte[] generateInvoicePdf(
                    Long tenantId,
                    Long saleId
            ) {

                permissionService.requirePermission(
                        tenantId,
                        TenantModule.BILLING,
                        SaasPermissionAction.PRINT
                );

                SaasSaleResponse sale = billingService.getSaleById(
                        tenantId,
                        saleId
                );

                ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

                Document document = new Document(
                        PageSize.A4,
                        36,
                        36,
                        36,
                        36
                );

                try {

                    PdfWriter.getInstance(
                            document,
                            outputStream
                    );

                    document.open();

                    Font titleFont = FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            18
                    );

                    Font headingFont = FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            12
                    );

                    Font normalFont = FontFactory.getFont(
                            FontFactory.HELVETICA,
                            10
                    );
                    

                    Font sectionFont = FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD,
                            11
                    );

                   

                    brandingService.addHeader(
                            document,
                            tenantId,
                            "WHOLESALER TAX INVOICE"
                    );

                    Paragraph title = new Paragraph(
                            "SALES INVOICE",
                            titleFont
                    );
                    title.setAlignment(Element.ALIGN_CENTER);
                    document.add(title);

                    document.add(Chunk.NEWLINE);

                    /*****************************************************************
                     * CUSTOMER DETAILS
                     *****************************************************************/

                    document.add(
                            new Paragraph(
                                    "CUSTOMER DETAILS",
                                    headingFont
                            )
                    );

                    document.add(
                            new Paragraph(
                                    "Customer Name : "
                                            + safe(sale.getCustomerName()),
                                    normalFont
                            )
                    );

                    document.add(
                            new Paragraph(
                                    "Customer Code : "
                                            + safe(sale.getCustomerCode()),
                                    normalFont
                            )
                    );

                    document.add(
                            new Paragraph(
                                    "Customer Type : "
                                            + safe(sale.getCustomerType()),
                                    normalFont
                            )
                    );

                    document.add(
                            new Paragraph(
                                    "GSTIN : "
                                            + safe(sale.getCustomerGstin()),
                                    normalFont
                            )
                    );

                    document.add(Chunk.NEWLINE);

                    /*****************************************************************
                     * INVOICE INFORMATION
                     *****************************************************************/

                    document.add(
                            new Paragraph(
                                    "INVOICE INFORMATION",
                                    headingFont
                            )
                    );

                    document.add(
                            new Paragraph(
                                    "Invoice No : "
                                            + safe(sale.getSaleNumber()),
                                    normalFont
                            )
                    );

                    document.add(
                            new Paragraph(
                                    "Invoice Date : "
                                            + formatDate(sale.getSaleDate()),
                                    normalFont
                            )
                    );

                    document.add(
                            new Paragraph(
                                    "Payment Status : "
                                            + safe(sale.getPaymentStatus()),
                                    normalFont
                            )
                    );

                    document.add(
                            new Paragraph(
                                    "Sale Status : "
                                            + safe(sale.getSaleStatus()),
                                    normalFont
                            )
                    );

                    document.add(
                            new Paragraph(
                                    "Remarks : "
                                            + safe(sale.getRemarks()),
                                    normalFont
                            )
                    );

                    document.add(Chunk.NEWLINE);
                    
                    // ============================================================
                    // Invoice Medicines
                    // ============================================================

                    document.add(new Paragraph("Medicines", sectionFont));
                    document.add(Chunk.NEWLINE);

                    Table table = new Table(8);
                    table.setWidth(100);
                    table.setPadding(4);

                    table.addCell("Medicine");
                    table.addCell("Type");
                    table.addCell("Qty");
                    table.addCell("Rate");
                    table.addCell("Disc%");
                    table.addCell("GST%");
                    table.addCell("Batch");
                    table.addCell("Amount");

                    if (sale.getItems() != null && !sale.getItems().isEmpty()) {

                        for (SaasSaleItemResponse item : sale.getItems()) {

                            String batch = "-";

                            if (item.getAllocations() != null
                                    && !item.getAllocations().isEmpty()) {

                                batch = safe(
                                        item.getAllocations()
                                                .get(0)
                                                .getBatchNumber()
                                );
                            }

                            table.addCell(
                                    safe(item.getMedicineName())
                            );

                            table.addCell(
                                    safe(item.getMedicineType())
                            );

                            table.addCell(
                                    safe(item.getQuantity())
                            );

                            table.addCell(
                                    "Rs. " + safe(item.getSaleRate())
                            );

                            table.addCell(
                                    safe(item.getDiscountPercentage())
                            );

                            table.addCell(
                                    safe(item.getGstPercentage())
                            );

                            table.addCell(batch);

                            table.addCell(
                                    "Rs. " + safe(item.getLineTotal())
                            );
                        }

                    } else {

                        Cell cell = new Cell("No medicines found");
                        cell.setColspan(8);
                        table.addCell(cell);
                    }

                    document.add(table);

                    document.add(Chunk.NEWLINE);
                    document.add(Chunk.NEWLINE);

                    // ============================================================
                    // Amount Summary
                    // ============================================================

                    Paragraph totals = new Paragraph("", headingFont);

                    totals.add(
                            "Gross Amount      : Rs. "
                                    + safe(sale.getGrossAmount())
                                    + "\n"
                    );

                    totals.add(
                            "Discount          : Rs. "
                                    + safe(sale.getDiscountAmount())
                                    + "\n"
                    );

                    totals.add(
                            "Taxable Amount    : Rs. "
                                    + safe(sale.getTaxableAmount())
                                    + "\n"
                    );

                    totals.add(
                            "GST Amount        : Rs. "
                                    + safe(sale.getGstAmount())
                                    + "\n"
                    );

                    totals.add(
                            "Other Charges     : Rs. "
                                    + safe(sale.getOtherCharges())
                                    + "\n"
                    );

                    totals.add(
                            "Round Off         : Rs. "
                                    + safe(sale.getRoundOffAmount())
                                    + "\n"
                    );

                    totals.add(
                            "Grand Total       : Rs. "
                                    + safe(sale.getGrandTotal())
                                    + "\n"
                    );

                    totals.add(
                            "Paid Amount       : Rs. "
                                    + safe(sale.getPaidAmount())
                                    + "\n"
                    );

                    totals.add(
                            "Due Amount        : Rs. "
                                    + safe(sale.getDueAmount())
                    );

                    totals.setAlignment(Element.ALIGN_RIGHT);

                    document.add(totals);

                    document.add(Chunk.NEWLINE);
                    document.add(Chunk.NEWLINE);

                    // ============================================================
                    // Remarks
                    // ============================================================

                    if (sale.getRemarks() != null
                            && !sale.getRemarks().isBlank()) {

                        document.add(
                                new Paragraph(
                                        "Remarks",
                                        sectionFont
                                )
                        );

                        document.add(
                                new Paragraph(
                                        sale.getRemarks(),
                                        normalFont
                                )
                        );

                        document.add(Chunk.NEWLINE);
                    }

                    // ============================================================
                    // Signature
                    // ============================================================

                    Paragraph sign = new Paragraph(
                            "Authorized Signature",
                            normalFont
                    );

                    sign.setAlignment(Element.ALIGN_RIGHT);

                    document.add(sign);

                    document.add(Chunk.NEWLINE);
                    document.add(Chunk.NEWLINE);

                    // ============================================================
                    // Footer
                    // ============================================================

                    brandingService.addFooter(
                            document,
                            tenantId,
                            brandingService
                                    .getBranding(tenantId)
                                    .getInvoiceFooter()
                    );

                    document.close();

                    return outputStream.toByteArray();

                } catch (Exception e) {

                    throw new RuntimeException(
                            "Unable to generate wholesaler invoice PDF",
                            e
                    );
                }
            }
            
            private String formatDate(LocalDate date) {

                if (date == null) {
                    return "-";
                }

                return date.format(
                        DateTimeFormatter.ofPattern("dd-MM-yyyy")
                );
            }

            
        }