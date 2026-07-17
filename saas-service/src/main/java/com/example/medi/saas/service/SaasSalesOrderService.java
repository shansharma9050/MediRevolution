package com.example.medi.saas.service;

import com.example.medi.saas.dto.*;
import com.example.medi.saas.entity.*;
import com.example.medi.saas.enums.*;
import com.example.medi.saas.repository.*;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class SaasSalesOrderService {

	private static final BigDecimal HUNDRED = new BigDecimal("100");

	private final SaasSalesOrderRepository orderRepository;
	private final SaasSalesOrderItemRepository itemRepository;
	private final SaasSalesOrderTimelineRepository timelineRepository;
	private final SaasCustomerRepository customerRepository;
	private final SaasMedicineRepository medicineRepository;
	private final SaasMedicineStockRepository stockRepository;
	private final SaasSaleService saleService;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;

	public SaasSalesOrderService(SaasSalesOrderRepository orderRepository, SaasSalesOrderItemRepository itemRepository,
			SaasSalesOrderTimelineRepository timelineRepository, SaasCustomerRepository customerRepository,
			SaasMedicineRepository medicineRepository, SaasMedicineStockRepository stockRepository,
			SaasSaleService saleService, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService) {
		this.orderRepository = orderRepository;
		this.itemRepository = itemRepository;
		this.timelineRepository = timelineRepository;
		this.customerRepository = customerRepository;
		this.medicineRepository = medicineRepository;
		this.stockRepository = stockRepository;
		this.saleService = saleService;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
	}

	public List<SaasSalesOrderResponse> getOrders(Long tenantId) {

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.VIEW);

		return orderRepository.findByTenantIdOrderByOrderDateDescCreatedAtDesc(tenantId).stream().map(this::toResponse)
				.toList();
	}

	public List<SaasSalesOrderResponse> searchOrders(Long tenantId, String keyword) {

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {
			return getOrders(tenantId);
		}

		return orderRepository.searchOrders(tenantId, keyword.trim()).stream().map(this::toResponse).toList();
	}

	public SaasSalesOrderResponse getOrder(Long tenantId, Long orderId) {

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.VIEW);

		return toResponse(findOrder(tenantId, orderId));
	}

	public SaasSalesOrderSummaryResponse getSummary(Long tenantId) {

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.VIEW);

		return new SaasSalesOrderSummaryResponse(orderRepository.countByTenantId(tenantId),

				orderRepository.countByTenantIdAndOrderStatus(tenantId, SaasSalesOrderStatus.PENDING),

				orderRepository.countByTenantIdAndOrderStatus(tenantId, SaasSalesOrderStatus.CONFIRMED),

				orderRepository.countByTenantIdAndOrderStatus(tenantId, SaasSalesOrderStatus.DISPATCHED),

				orderRepository.countByTenantIdAndOrderStatus(tenantId, SaasSalesOrderStatus.DELIVERED),

				money(orderRepository.sumOrderValue(tenantId)));
	}

	@Transactional
	public SaasSalesOrderResponse createOrder(SaasSalesOrderRequest request) {

		validateRequest(request);

		Long tenantId = request.getTenantId();

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.CREATE);

		SaasCustomer customer = customerRepository.findByIdAndTenantId(request.getCustomerId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Customer not found in this workspace"));

		if (!Boolean.TRUE.equals(customer.getActive())) {
			throw new RuntimeException("Selected customer is inactive");
		}

		LocalDate orderDate = request.getOrderDate() == null ? LocalDate.now() : request.getOrderDate();

		if (request.getExpectedDeliveryDate() != null && request.getExpectedDeliveryDate().isBefore(orderDate)) {

			throw new RuntimeException("Expected delivery date cannot be before order date");
		}

		CalculatedOrder calculatedOrder = calculateOrder(request, orderDate);

		BigDecimal otherCharges = nonNegativeAmount(request.getOtherCharges(), "Other charges");

		BigDecimal roundOff = money(request.getRoundOffAmount());

		BigDecimal grandTotal = money(
				calculatedOrder.taxableAmount().add(calculatedOrder.gstAmount()).add(otherCharges).add(roundOff));

		if (grandTotal.compareTo(BigDecimal.ZERO) < 0) {
			throw new RuntimeException("Grand total cannot be negative");
		}

		SaasSalesOrder order = new SaasSalesOrder();

		order.setTenantId(tenantId);

		order.setOrderNumber(generateOrderNumber(tenantId));

		order.setOrderDate(orderDate);

		order.setExpectedDeliveryDate(request.getExpectedDeliveryDate());

		order.setCustomerId(customer.getId());

		order.setCustomerCode(customer.getCustomerCode());

		order.setCustomerName(customer.getCustomerName());

		order.setCustomerType(customer.getCustomerType());

		order.setCustomerMobile(customer.getMobile());

		order.setCustomerGstin(customer.getGstin());

		order.setShippingAddress(resolveShippingAddress(request.getShippingAddress(), customer));

		order.setTotalQuantity(calculatedOrder.totalQuantity());

		order.setGrossAmount(calculatedOrder.grossAmount());

		order.setDiscountAmount(calculatedOrder.discountAmount());

		order.setTaxableAmount(calculatedOrder.taxableAmount());

		order.setGstAmount(calculatedOrder.gstAmount());

		order.setOtherCharges(otherCharges);

		order.setRoundOffAmount(roundOff);

		order.setGrandTotal(grandTotal);

		order.setOrderStatus(SaasSalesOrderStatus.PENDING);

		order.setRemarks(normalizeOptional(request.getRemarks()));

		order.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder savedOrder = orderRepository.save(order);

		for (SaasSalesOrderItemRequest itemRequest : request.getItems()) {

			SaasMedicine medicine = findActiveMedicine(tenantId, itemRequest.getMedicineId());

			CalculatedItem calculatedItem = calculateItem(itemRequest);

			int availableQuantity = getAvailableQuantity(tenantId, medicine.getId(), orderDate);

			SaasSalesOrderItem item = new SaasSalesOrderItem();

			item.setTenantId(tenantId);
			item.setOrderId(savedOrder.getId());
			item.setMedicineId(medicine.getId());
			item.setMedicineName(medicine.getMedicineName());
			item.setMedicineType(medicine.getMedicineType());
			item.setManufacturer(medicine.getManufacturer());
			item.setQuantity(itemRequest.getQuantity());
			item.setAvailableQuantityAtOrder(availableQuantity);
			item.setSaleRate(calculatedItem.saleRate());
			item.setGrossAmount(calculatedItem.grossAmount());
			item.setDiscountPercentage(calculatedItem.discountPercentage());
			item.setDiscountAmount(calculatedItem.discountAmount());
			item.setTaxableAmount(calculatedItem.taxableAmount());
			item.setGstPercentage(calculatedItem.gstPercentage());
			item.setGstAmount(calculatedItem.gstAmount());
			item.setLineTotal(calculatedItem.lineTotal());

			itemRepository.save(item);
		}

		createTimeline(savedOrder, SaasSalesOrderTimelineType.CREATED, "Order created",
				"Sales order created successfully", null);

		return toResponse(savedOrder);
	}

	@Transactional
	public SaasSalesOrderResponse confirmOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.UPDATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		requireStatus(order, SaasSalesOrderStatus.PENDING, "Only pending orders can be confirmed");

		validateCurrentStockAvailability(order);

		order.setOrderStatus(SaasSalesOrderStatus.CONFIRMED);

		order.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder saved = orderRepository.save(order);

		createTimeline(saved, SaasSalesOrderTimelineType.CONFIRMED, "Order confirmed",
				normalizeOptional(request.getRemarks()), null);

		return toResponse(saved);
	}

	@Transactional
	public SaasSalesOrderResponse rejectOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.UPDATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		requireStatus(order, SaasSalesOrderStatus.PENDING, "Only pending orders can be rejected");

		String reason = normalizeRequired(request.getRemarks(), "Rejection reason");

		order.setOrderStatus(SaasSalesOrderStatus.REJECTED);

		order.setRejectionReason(reason);

		order.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder saved = orderRepository.save(order);

		createTimeline(saved, SaasSalesOrderTimelineType.REJECTED, "Order rejected", reason, null);

		return toResponse(saved);
	}

	@Transactional
	public SaasSalesOrderResponse dispatchOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.UPDATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		requireStatus(order, SaasSalesOrderStatus.CONFIRMED, "Only confirmed orders can be dispatched");

		validateCurrentStockAvailability(order);

		order.setOrderStatus(SaasSalesOrderStatus.DISPATCHED);

		order.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder saved = orderRepository.save(order);

		createTimeline(saved, SaasSalesOrderTimelineType.DISPATCHED, "Order dispatched",
				normalizeOptional(request.getRemarks()), null);

		return toResponse(saved);
	}

	@Transactional
	public SaasSalesOrderResponse deliverOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.UPDATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		requireStatus(order, SaasSalesOrderStatus.DISPATCHED, "Only dispatched orders can be marked delivered");

		order.setOrderStatus(SaasSalesOrderStatus.DELIVERED);

		order.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder saved = orderRepository.save(order);

		createTimeline(saved, SaasSalesOrderTimelineType.DELIVERED, "Order delivered",
				normalizeOptional(request.getRemarks()), null);

		return toResponse(saved);
	}

	@Transactional
	public SaasSalesOrderResponse cancelOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.DELETE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		if (order.getOrderStatus() == SaasSalesOrderStatus.CONVERTED_TO_SALE) {

			throw new RuntimeException("Converted sales order cannot be cancelled");
		}

		if (order.getOrderStatus() == SaasSalesOrderStatus.DELIVERED) {

			throw new RuntimeException("Delivered sales order cannot be cancelled");
		}

		if (order.getOrderStatus() == SaasSalesOrderStatus.REJECTED
				|| order.getOrderStatus() == SaasSalesOrderStatus.CANCELLED) {

			throw new RuntimeException("Sales order is already closed");
		}

		String reason = normalizeRequired(request.getRemarks(), "Cancellation reason");

		order.setOrderStatus(SaasSalesOrderStatus.CANCELLED);

		order.setCancellationReason(reason);

		order.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder saved = orderRepository.save(order);

		createTimeline(saved, SaasSalesOrderTimelineType.CANCELLED, "Order cancelled", reason, null);

		return toResponse(saved);
	}

	@Transactional
	public SaasSalesOrderResponse convertOrderToSale(Long orderId, SaasSalesOrderConvertRequest request) {

		if (request == null || request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required");
		}

		Long tenantId = request.getTenantId();

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, SaasPermissionAction.UPDATE);

		permissionService.requirePermission(tenantId, TenantModule.SALES, SaasPermissionAction.CREATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		if (order.getOrderStatus() != SaasSalesOrderStatus.CONFIRMED
				&& order.getOrderStatus() != SaasSalesOrderStatus.DISPATCHED
				&& order.getOrderStatus() != SaasSalesOrderStatus.DELIVERED) {

			throw new RuntimeException("Only confirmed, dispatched or delivered orders can be converted to sale");
		}

		if (order.getConvertedSaleId() != null) {
			throw new RuntimeException("Sales order is already converted to sale");
		}

		validateCurrentStockAvailability(order);

		List<SaasSalesOrderItem> orderItems = itemRepository.findByTenantIdAndOrderIdOrderByIdAsc(tenantId,
				order.getId());

		SaasSaleRequest saleRequest = new SaasSaleRequest();

		saleRequest.setTenantId(tenantId);

		saleRequest.setSaleDate(request.getSaleDate() == null ? LocalDate.now() : request.getSaleDate());

		saleRequest.setCustomerId(order.getCustomerId());

		saleRequest.setOtherCharges(order.getOtherCharges());

		saleRequest.setRoundOffAmount(order.getRoundOffAmount());

		saleRequest.setPaidAmount(nonNegativeAmount(request.getPaidAmount(), "Paid amount"));

		saleRequest.setRemarks(
				normalizeOptional(request.getRemarks()) == null ? "Converted from sales order " + order.getOrderNumber()
						: request.getRemarks().trim());

		saleRequest.setItems(orderItems.stream().map(this::toSaleItemRequest).toList());

		SaasSaleResponse saleResponse = saleService.createSale(saleRequest);

		order.setOrderStatus(SaasSalesOrderStatus.CONVERTED_TO_SALE);

		order.setConvertedSaleId(saleResponse.getId());

		order.setConvertedSaleNumber(saleResponse.getSaleNumber());

		order.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder saved = orderRepository.save(order);

		createTimeline(saved, SaasSalesOrderTimelineType.CONVERTED_TO_SALE, "Converted to sale",
				"Sale generated: " + saleResponse.getSaleNumber(), saleResponse.getId());

		return toResponse(saved);
	}

	private SaasSaleItemRequest toSaleItemRequest(SaasSalesOrderItem orderItem) {

		SaasSaleItemRequest request = new SaasSaleItemRequest();

		request.setMedicineId(orderItem.getMedicineId());

		request.setQuantity(orderItem.getQuantity());

		request.setSaleRate(orderItem.getSaleRate());

		request.setDiscountPercentage(orderItem.getDiscountPercentage());

		request.setGstPercentage(orderItem.getGstPercentage());

		return request;
	}

	private CalculatedOrder calculateOrder(SaasSalesOrderRequest request, LocalDate requiredDate) {

		BigDecimal grossAmount = BigDecimal.ZERO;

		BigDecimal discountAmount = BigDecimal.ZERO;

		BigDecimal taxableAmount = BigDecimal.ZERO;

		BigDecimal gstAmount = BigDecimal.ZERO;

		int totalQuantity = 0;

		Set<Long> medicineIds = new HashSet<>();

		for (SaasSalesOrderItemRequest item : request.getItems()) {

			validateItem(item);

			if (!medicineIds.add(item.getMedicineId())) {

				throw new RuntimeException("Duplicate medicine items are not allowed");
			}

			SaasMedicine medicine = findActiveMedicine(request.getTenantId(), item.getMedicineId());

			int availableQuantity = getAvailableQuantity(request.getTenantId(), medicine.getId(), requiredDate);

			if (availableQuantity < item.getQuantity()) {

				throw new RuntimeException("Insufficient stock for " + medicine.getMedicineName() + ". Available: "
						+ availableQuantity + ", Required: " + item.getQuantity());
			}

			CalculatedItem calculatedItem = calculateItem(item);

			grossAmount = grossAmount.add(calculatedItem.grossAmount());

			discountAmount = discountAmount.add(calculatedItem.discountAmount());

			taxableAmount = taxableAmount.add(calculatedItem.taxableAmount());

			gstAmount = gstAmount.add(calculatedItem.gstAmount());

			totalQuantity += item.getQuantity();
		}

		return new CalculatedOrder(money(grossAmount), money(discountAmount), money(taxableAmount), money(gstAmount),
				totalQuantity);
	}

	private CalculatedItem calculateItem(SaasSalesOrderItemRequest item) {

		BigDecimal saleRate = nonNegativeAmount(item.getSaleRate(), "Sale rate");

		BigDecimal discountPercentage = validPercentage(item.getDiscountPercentage(), "Discount percentage");

		BigDecimal gstPercentage = validPercentage(item.getGstPercentage(), "GST percentage");

		BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());

		BigDecimal grossAmount = money(saleRate.multiply(quantity));

		BigDecimal discountAmount = money(
				grossAmount.multiply(discountPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal taxableAmount = money(grossAmount.subtract(discountAmount));

		BigDecimal gstAmount = money(taxableAmount.multiply(gstPercentage).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal lineTotal = money(taxableAmount.add(gstAmount));

		return new CalculatedItem(saleRate, discountPercentage, gstPercentage, grossAmount, discountAmount,
				taxableAmount, gstAmount, lineTotal);
	}

	private void validateCurrentStockAvailability(SaasSalesOrder order) {

		List<SaasSalesOrderItem> items = itemRepository.findByTenantIdAndOrderIdOrderByIdAsc(order.getTenantId(),
				order.getId());

		LocalDate requiredDate = LocalDate.now();

		for (SaasSalesOrderItem item : items) {

			int availableQuantity = getAvailableQuantity(order.getTenantId(), item.getMedicineId(), requiredDate);

			if (availableQuantity < item.getQuantity()) {

				throw new RuntimeException("Insufficient stock for " + item.getMedicineName() + ". Available: "
						+ availableQuantity + ", Required: " + item.getQuantity());
			}
		}
	}

	private int getAvailableQuantity(Long tenantId, Long medicineId, LocalDate requiredDate) {

		Long quantity = stockRepository.sumAvailableQuantityForSale(tenantId, medicineId, requiredDate);

		if (quantity == null) {
			return 0;
		}

		if (quantity > Integer.MAX_VALUE) {
			return Integer.MAX_VALUE;
		}

		return quantity.intValue();
	}

	private void validateRequest(SaasSalesOrderRequest request) {

		if (request == null) {
			throw new RuntimeException("Sales order request is required");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getCustomerId() == null) {
			throw new RuntimeException("Customer is required");
		}

		if (request.getItems() == null || request.getItems().isEmpty()) {

			throw new RuntimeException("At least one order item is required");
		}

		nonNegativeAmount(request.getOtherCharges(), "Other charges");
	}

	private void validateItem(SaasSalesOrderItemRequest item) {

		if (item == null) {
			throw new RuntimeException("Sales order item is required");
		}

		if (item.getMedicineId() == null) {
			throw new RuntimeException("Medicine is required");
		}

		if (item.getQuantity() == null || item.getQuantity() <= 0) {

			throw new RuntimeException("Order quantity must be greater than 0");
		}

		nonNegativeAmount(item.getSaleRate(), "Sale rate");

		validPercentage(item.getDiscountPercentage(), "Discount percentage");

		validPercentage(item.getGstPercentage(), "GST percentage");
	}

	private SaasSalesOrder findOrder(Long tenantId, Long orderId) {

		if (orderId == null) {
			throw new RuntimeException("Sales order id is required");
		}

		return orderRepository.findByIdAndTenantId(orderId, tenantId)
				.orElseThrow(() -> new RuntimeException("Sales order not found"));
	}

	private SaasMedicine findActiveMedicine(Long tenantId, Long medicineId) {

		return medicineRepository.findByIdAndTenantIdAndActiveTrue(medicineId, tenantId)
				.orElseThrow(() -> new RuntimeException("Medicine not found in this workspace"));
	}

	private void requireStatus(SaasSalesOrder order, SaasSalesOrderStatus requiredStatus, String message) {

		if (order.getOrderStatus() != requiredStatus) {

			throw new RuntimeException(message);
		}
	}

	private Long requireTenantId(SaasSalesOrderStatusRequest request) {

		if (request == null || request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required");
		}

		return request.getTenantId();
	}

	private void createTimeline(SaasSalesOrder order, SaasSalesOrderTimelineType type, String statusLabel,
			String remarks, Long referenceId) {

		SaasSalesOrderTimeline timeline = new SaasSalesOrderTimeline();

		timeline.setTenantId(order.getTenantId());

		timeline.setOrderId(order.getId());

		timeline.setTimelineType(type);

		timeline.setStatusLabel(statusLabel);

		timeline.setRemarks(normalizeOptional(remarks));

		timeline.setReferenceId(referenceId);

		timeline.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		timelineRepository.save(timeline);
	}

	private SaasSalesOrderResponse toResponse(SaasSalesOrder order) {

		List<SaasSalesOrderItemResponse> items = itemRepository
				.findByTenantIdAndOrderIdOrderByIdAsc(order.getTenantId(), order.getId()).stream()
				.map(this::toItemResponse).toList();

		List<SaasSalesOrderTimelineResponse> timeline = timelineRepository
				.findByTenantIdAndOrderIdOrderByCreatedAtAsc(order.getTenantId(), order.getId()).stream()
				.map(this::toTimelineResponse).toList();

		return new SaasSalesOrderResponse(order.getId(), order.getTenantId(), order.getOrderNumber(),
				order.getOrderDate(), order.getExpectedDeliveryDate(), order.getCustomerId(), order.getCustomerCode(),
				order.getCustomerName(), order.getCustomerType(), order.getCustomerMobile(), order.getCustomerGstin(),
				order.getShippingAddress(), order.getTotalQuantity(), order.getGrossAmount(), order.getDiscountAmount(),
				order.getTaxableAmount(), order.getGstAmount(), order.getOtherCharges(), order.getRoundOffAmount(),
				order.getGrandTotal(), order.getOrderStatus().name(), order.getConvertedSaleId(),
				order.getConvertedSaleNumber(), order.getRejectionReason(), order.getCancellationReason(),
				order.getRemarks(), order.getCreatedAt(), items, timeline);
	}

	private SaasSalesOrderItemResponse toItemResponse(SaasSalesOrderItem item) {

		return new SaasSalesOrderItemResponse(item.getId(), item.getMedicineId(), item.getMedicineName(),
				item.getMedicineType(), item.getManufacturer(), item.getQuantity(), item.getAvailableQuantityAtOrder(),
				item.getSaleRate(), item.getGrossAmount(), item.getDiscountPercentage(), item.getDiscountAmount(),
				item.getTaxableAmount(), item.getGstPercentage(), item.getGstAmount(), item.getLineTotal());
	}

	private SaasSalesOrderTimelineResponse toTimelineResponse(SaasSalesOrderTimeline timeline) {

		return new SaasSalesOrderTimelineResponse(timeline.getId(), timeline.getTimelineType().name(),
				timeline.getStatusLabel(), timeline.getRemarks(), timeline.getReferenceId(), timeline.getCreatedAt());
	}

	private String resolveShippingAddress(String requestedAddress, SaasCustomer customer) {

		String address = normalizeOptional(requestedAddress);

		if (address != null) {
			return address;
		}

		return List
				.of(customer.getAddress(), customer.getCity(), customer.getDistrict(), customer.getState(),
						customer.getPincode())
				.stream().filter(value -> value != null && !value.isBlank())
				.reduce((first, second) -> first + ", " + second).orElse(null);
	}

	private String generateOrderNumber(Long tenantId) {

		String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

		String random = UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase(Locale.ROOT);

		return "ORD-" + tenantId + "-" + timestamp + "-" + random;
	}

	private void validateWholesalerWorkspace(Long tenantId) {

		Tenant tenant = tenantAccessService.validateTenantAccess(tenantId);

		String tenantType = tenant.getTenantType() == null ? ""
				: tenant.getTenantType().name().trim().toUpperCase(Locale.ROOT);

		if (!"WHOLESALER".equals(tenantType)) {

			throw new RuntimeException("Sales Orders module is available only for Wholesaler workspaces");
		}
	}

	private BigDecimal money(BigDecimal value) {

		return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal nonNegativeAmount(BigDecimal value, String fieldName) {

		BigDecimal amount = money(value);

		if (amount.compareTo(BigDecimal.ZERO) < 0) {

			throw new RuntimeException(fieldName + " cannot be negative");
		}

		return amount;
	}

	private BigDecimal validPercentage(BigDecimal value, String fieldName) {

		BigDecimal percentage = money(value);

		if (percentage.compareTo(BigDecimal.ZERO) < 0 || percentage.compareTo(HUNDRED) > 0) {

			throw new RuntimeException(fieldName + " must be between 0 and 100");
		}

		return percentage;
	}

	private String normalizeRequired(String value, String fieldName) {

		String normalized = normalizeOptional(value);

		if (normalized == null) {

			throw new RuntimeException(fieldName + " is required");
		}

		return normalized;
	}

	private String normalizeOptional(String value) {

		if (value == null) {
			return null;
		}

		String normalized = value.trim().replaceAll("\\s+", " ");

		return normalized.isBlank() ? null : normalized;
	}

	private record CalculatedOrder(BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount,
			BigDecimal gstAmount, Integer totalQuantity) {
	}

	private record CalculatedItem(BigDecimal saleRate, BigDecimal discountPercentage, BigDecimal gstPercentage,
			BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount, BigDecimal gstAmount,
			BigDecimal lineTotal) {
	}
}