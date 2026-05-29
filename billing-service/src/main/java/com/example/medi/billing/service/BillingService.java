package com.example.medi.billing.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.billing.client.OrderClient;
import com.example.medi.billing.dto.OrderItemResponse;
import com.example.medi.billing.dto.OrderResponse;
import com.example.medi.billing.entity.Invoice;
import com.example.medi.billing.entity.InvoiceItem;
import com.example.medi.billing.repository.InvoiceRepository;
import com.example.medi.billing.security.CurrentUserUtil;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class BillingService {

    private final InvoiceRepository invoiceRepository;
    private final OrderClient orderClient;

    public BillingService(
            InvoiceRepository invoiceRepository,
            OrderClient orderClient
    ) {
        this.invoiceRepository = invoiceRepository;
        this.orderClient = orderClient;
    }

    public Invoice generateInvoice(Long orderId) {

        invoiceRepository.findByOrderId(orderId).ifPresent(invoice -> {
            throw new RuntimeException("Invoice already generated for this order");
        });

        String token = CurrentUserUtil.getAuthorizationHeader();
        OrderResponse order = orderClient.getOrderById(orderId, token);

        if (!"DELIVERED".equals(order.getStatus())) {
            throw new RuntimeException("Invoice can be generated only after order is delivered");
        }

        String role = CurrentUserUtil.getRole();
        Long userId = CurrentUserUtil.getUserId();

        if (role.equals("RETAILER") && !order.getRetailerAuthUserId().equals(userId)) {
            throw new AccessDeniedException("You can generate invoice only for your own order");
        }

        if (role.equals("WHOLESALER") && !order.getWholesalerAuthUserId().equals(userId)) {
            throw new AccessDeniedException("You can generate invoice only for your own order");
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("MR-INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        invoice.setOrderId(order.getId());
        invoice.setOrderNumber(order.getOrderNumber());
        invoice.setRetailerAuthUserId(order.getRetailerAuthUserId());
        invoice.setWholesalerAuthUserId(order.getWholesalerAuthUserId());

        BigDecimal taxableTotal = BigDecimal.ZERO;
        BigDecimal gstTotal = BigDecimal.ZERO;
        BigDecimal grandTotal = BigDecimal.ZERO;

        for (OrderItemResponse itemResponse : order.getItems()) {

            BigDecimal unitPrice = itemResponse.getUnitPrice();
            BigDecimal quantity = BigDecimal.valueOf(itemResponse.getQuantity());
            BigDecimal gstPercentage = itemResponse.getGstPercentage() == null
                    ? BigDecimal.ZERO
                    : itemResponse.getGstPercentage();

            BigDecimal taxableAmount = unitPrice.multiply(quantity);
            BigDecimal gstAmount = taxableAmount.multiply(gstPercentage).divide(BigDecimal.valueOf(100));
            BigDecimal lineTotal = taxableAmount.add(gstAmount);

            InvoiceItem item = new InvoiceItem();
            item.setStockId(itemResponse.getStockId());
            item.setMedicineId(itemResponse.getMedicineId());
            item.setMedicineName(itemResponse.getMedicineName());
            item.setBatchNumber(itemResponse.getBatchNumber());
            item.setQuantity(itemResponse.getQuantity());
            item.setUnitPrice(unitPrice);
            item.setGstPercentage(gstPercentage);
            item.setTaxableAmount(taxableAmount);
            item.setGstAmount(gstAmount);
            item.setLineTotal(lineTotal);
            item.setInvoice(invoice);

            invoice.getItems().add(item);

            taxableTotal = taxableTotal.add(taxableAmount);
            gstTotal = gstTotal.add(gstAmount);
            grandTotal = grandTotal.add(lineTotal);
        }

        invoice.setTaxableAmount(taxableTotal);
        invoice.setGstAmount(gstTotal);
        invoice.setTotalAmount(grandTotal);

        return invoiceRepository.save(invoice);
    }

    public Invoice getInvoiceByOrderId(Long orderId) {
        return invoiceRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
    }
}
