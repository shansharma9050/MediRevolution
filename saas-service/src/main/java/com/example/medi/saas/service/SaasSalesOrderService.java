package com.example.medi.saas.service;

import com.example.medi.saas.client.MedicineServiceClient;
import com.example.medi.saas.dto.GlobalMedicineResponse;
import com.example.medi.saas.dto.SaasCustomerMedicineResponse;
import com.example.medi.saas.dto.SaasCustomerOrderItemRequest;
import com.example.medi.saas.dto.SaasCustomerOrderRequest;
import com.example.medi.saas.dto.SaasMemberPermissionResponse;
import com.example.medi.saas.dto.SaasSaleItemRequest;
import com.example.medi.saas.dto.SaasSaleRequest;
import com.example.medi.saas.dto.SaasSaleResponse;
import com.example.medi.saas.dto.SaasSalesOrderConvertRequest;
import com.example.medi.saas.dto.SaasSalesOrderItemRequest;
import com.example.medi.saas.dto.SaasSalesOrderItemResponse;
import com.example.medi.saas.dto.SaasSalesOrderRequest;
import com.example.medi.saas.dto.SaasSalesOrderResponse;
import com.example.medi.saas.dto.SaasSalesOrderStatusRequest;
import com.example.medi.saas.dto.SaasSalesOrderSummaryResponse;
import com.example.medi.saas.entity.SaasCustomer;
import com.example.medi.saas.entity.SaasMedicineStock;
import com.example.medi.saas.entity.SaasSalesOrder;
import com.example.medi.saas.entity.SaasSalesOrderItem;
import com.example.medi.saas.entity.SaasSalesOrderTimeline;
import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.SaasSalesOrderStatus;
import com.example.medi.saas.enums.SaasSalesOrderTimelineType;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasCustomerRepository;
import com.example.medi.saas.repository.SaasMedicineStockRepository;
import com.example.medi.saas.repository.SaasSalesOrderItemRepository;
import com.example.medi.saas.repository.SaasSalesOrderRepository;
import com.example.medi.saas.repository.SaasSalesOrderTimelineRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class SaasSalesOrderService {

	private static final BigDecimal HUNDRED = new BigDecimal("100");

	private final SaasSalesOrderRepository orderRepository;

	private final SaasSalesOrderItemRepository itemRepository;

	private final SaasSalesOrderTimelineRepository timelineRepository;

	private final SaasCustomerRepository customerRepository;

	private final SaasMedicineStockRepository stockRepository;

	private final SaasSaleService saleService;

	private final TenantAccessService tenantAccessService;

	private final SaasPermissionService permissionService;

	private final MedicineServiceClient medicineServiceClient;

	private final SaasNotificationService notificationService;

	private final String internalServiceKey;

	public SaasSalesOrderService(SaasSalesOrderRepository orderRepository, SaasSalesOrderItemRepository itemRepository,
			SaasSalesOrderTimelineRepository timelineRepository, SaasCustomerRepository customerRepository,
			SaasMedicineStockRepository stockRepository, MedicineServiceClient medicineServiceClient,
			@Value("${internal.service.key}") String internalServiceKey, SaasSaleService saleService,
			TenantAccessService tenantAccessService, SaasPermissionService permissionService,
			SaasNotificationService notificationService) {

		this.orderRepository = orderRepository;

		this.itemRepository = itemRepository;

		this.timelineRepository = timelineRepository;

		this.customerRepository = customerRepository;

		this.stockRepository = stockRepository;

		this.medicineServiceClient = medicineServiceClient;

		this.internalServiceKey = internalServiceKey;

		this.saleService = saleService;

		this.tenantAccessService = tenantAccessService;

		this.permissionService = permissionService;

		this.notificationService = notificationService;
	}

	/*
	 * ============================================================ WHOLESALER /
	 * ASSIGNED STAFF ============================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasSalesOrderResponse> getOrders(Long tenantId) {

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.VIEW);

		return orderRepository.findByTenantIdOrderByOrderDateDescCreatedAtDesc(tenantId).stream().map(this::toResponse)
				.toList();
	}

	@Transactional(readOnly = true)
	public List<SaasSalesOrderResponse> searchOrders(Long tenantId, String keyword) {

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.VIEW);

		if (keyword == null || keyword.isBlank()) {

			return getOrders(tenantId);
		}

		return orderRepository.searchOrders(tenantId, keyword.trim()).stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasSalesOrderSummaryResponse getSummary(Long tenantId) {

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.VIEW);

		return new SaasSalesOrderSummaryResponse(

				orderRepository.countByTenantId(tenantId),

				orderRepository.countByTenantIdAndOrderStatus(tenantId, SaasSalesOrderStatus.PENDING),

				orderRepository.countByTenantIdAndOrderStatus(tenantId, SaasSalesOrderStatus.CONFIRMED),

				orderRepository.countByTenantIdAndOrderStatus(tenantId, SaasSalesOrderStatus.DISPATCHED),

				orderRepository.countByTenantIdAndOrderStatus(tenantId, SaasSalesOrderStatus.DELIVERED),

				money(orderRepository.sumOrderValue(tenantId)));
	}

	@Transactional(readOnly = true)
	public SaasSalesOrderResponse getOrder(Long tenantId, Long orderId) {

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.VIEW);

		return toResponse(findOrder(tenantId, orderId));
	}

	/*
	 * ============================================================ WHOLESALER
	 * CREATE ORDER ============================================================
	 */

	@Transactional
	public SaasSalesOrderResponse createOrder(com.example.medi.saas.dto.SaasSalesOrderRequest request,
			String authorization) {

		validateWholesalerOrderRequest(request);

		Long tenantId = request.getTenantId();

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.CREATE);

		SaasCustomer customer = customerRepository.findByIdAndTenantId(request.getCustomerId(), tenantId)
				.orElseThrow(() -> new RuntimeException("Customer not found in this workspace"));

		if (!Boolean.TRUE.equals(customer.getActive())) {

			throw new RuntimeException("Selected customer is inactive");
		}

		LocalDate orderDate = request.getOrderDate() == null ? LocalDate.now() : request.getOrderDate();

		if (request.getExpectedDeliveryDate() != null && request.getExpectedDeliveryDate().isBefore(orderDate)) {

			throw new RuntimeException("Expected delivery date cannot be before order date");
		}

		CalculatedOrder calculated = calculateWholesalerOrder(request, orderDate, authorization);

		BigDecimal otherCharges = nonNegativeAmount(request.getOtherCharges(), "Other charges");

		BigDecimal roundOff = money(request.getRoundOffAmount());

		BigDecimal grandTotal = money(
				calculated.taxableAmount().add(calculated.gstAmount()).add(otherCharges).add(roundOff));

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

		order.setTotalQuantity(calculated.totalQuantity());

		order.setGrossAmount(calculated.grossAmount());

		order.setDiscountAmount(calculated.discountAmount());

		order.setTaxableAmount(calculated.taxableAmount());

		order.setGstAmount(calculated.gstAmount());

		order.setOtherCharges(otherCharges);

		order.setRoundOffAmount(roundOff);

		order.setGrandTotal(grandTotal);

		order.setOrderStatus(SaasSalesOrderStatus.PENDING);

		order.setRemarks(normalizeOptional(request.getRemarks()));

		order.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder savedOrder = orderRepository.save(order);

		for (SaasSalesOrderItemRequest itemRequest : request.getItems()) {

			GlobalMedicineResponse medicine = findActiveMedicine(itemRequest.getMedicineId(), authorization);

			CalculatedItem itemCalculated = calculateItem(itemRequest.getSaleRate(),
					itemRequest.getDiscountPercentage(), itemRequest.getGstPercentage(), itemRequest.getQuantity());

			int available = getAvailableQuantity(tenantId, medicine.getId(), orderDate);

			if (available < itemRequest.getQuantity()) {

				throw new RuntimeException("Insufficient stock for " + medicine.getMedicineName() + ". Available: "
						+ available + ", Required: " + itemRequest.getQuantity());
			}

			saveOrderItem(savedOrder, medicine, itemRequest.getQuantity(), available, itemCalculated);
		}

		createTimeline(savedOrder, SaasSalesOrderTimelineType.CREATED, "Order created",
				"Sales order created successfully", null);

		return toResponse(savedOrder);
	}

	/*
	 * ============================================================ CUSTOMER CATALOG
	 * ============================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasCustomerMedicineResponse> getCustomerCatalog(Long tenantId, String keyword, String authorization) {

		SaasCustomer customer = validateCustomerWorkspace(tenantId);

		if (!Boolean.TRUE.equals(customer.getActive())) {

			throw new RuntimeException("Customer account is inactive");
		}

		String normalizedKeyword = normalizeOptional(keyword);

		List<SaasMedicineStock> stocks = stockRepository
				.findByTenantIdAndActiveTrueAndCurrentQuantityGreaterThan(tenantId, 0);

		/*
		 * Prevent duplicate Global Medicine API calls.
		 */
		Map<Long, GlobalMedicineResponse> medicineCache = new HashMap<>();

		Map<Long, SaasCustomerMedicineResponse> unique = new LinkedHashMap<>();

		for (SaasMedicineStock stock : stocks) {

			if (stock.getMedicineId() == null) {
				continue;
			}

			if (stock.getCurrentQuantity() == null || stock.getCurrentQuantity() <= 0) {
				continue;
			}

			if (stock.getActive() == null || !stock.getActive()) {
				continue;
			}

			if (stock.getExpiryDate() != null && stock.getExpiryDate().isBefore(LocalDate.now())) {
				continue;
			}

			GlobalMedicineResponse medicine = medicineCache.computeIfAbsent(stock.getMedicineId(),
					id -> findActiveMedicine(id, authorization));

			if (normalizedKeyword != null && !matchesMedicineKeyword(medicine, normalizedKeyword)) {

				continue;
			}

			if (unique.containsKey(medicine.getId())) {

				continue;
			}

			SaasMedicineStock suggestedStock = findSuggestedStock(tenantId, medicine.getId());

			if (suggestedStock == null) {

				continue;
			}

			int available = getAvailableQuantity(tenantId, medicine.getId(), LocalDate.now());

			if (available <= 0) {

				continue;
			}

			BigDecimal unitPrice = customerUnitPrice(suggestedStock);

			BigDecimal gst = customerGst(suggestedStock);

			unique.put(medicine.getId(), new SaasCustomerMedicineResponse(

					medicine.getId(),

					medicine.getMedicineName(),

					medicine.getMedicineType(),

					medicine.getManufacturer(),

					available,

					unitPrice,

					gst));
		}

		return unique.values().stream().sorted(Comparator.comparing(SaasCustomerMedicineResponse::getMedicineName,
				Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))).toList();
	}

	/*
	 * ============================================================ CUSTOMER ORDER
	 * LIST ============================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasSalesOrderResponse> getCustomerOrders(Long tenantId) {

		SaasCustomer customer = validateCustomerWorkspace(tenantId);

		return orderRepository.findByTenantIdAndCustomerIdOrderByOrderDateDescCreatedAtDesc(tenantId, customer.getId())
				.stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<SaasSalesOrderResponse> searchCustomerOrders(Long tenantId, String keyword) {

		SaasCustomer customer = validateCustomerWorkspace(tenantId);

		if (keyword == null || keyword.isBlank()) {

			return getCustomerOrders(tenantId);
		}

		return orderRepository.searchCustomerOrders(tenantId, customer.getId(), keyword.trim()).stream()
				.map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public SaasSalesOrderSummaryResponse getCustomerSummary(Long tenantId) {

		SaasCustomer customer = validateCustomerWorkspace(tenantId);

		Long customerId = customer.getId();

		return new SaasSalesOrderSummaryResponse(

				orderRepository.countByTenantIdAndCustomerId(tenantId, customerId),

				orderRepository.countByTenantIdAndCustomerIdAndOrderStatus(tenantId, customerId,
						SaasSalesOrderStatus.PENDING),

				orderRepository.countByTenantIdAndCustomerIdAndOrderStatus(tenantId, customerId,
						SaasSalesOrderStatus.CONFIRMED),

				orderRepository.countByTenantIdAndCustomerIdAndOrderStatus(tenantId, customerId,
						SaasSalesOrderStatus.DISPATCHED),

				orderRepository.countByTenantIdAndCustomerIdAndOrderStatus(tenantId, customerId,
						SaasSalesOrderStatus.DELIVERED),

				money(orderRepository.sumCustomerOrderValue(tenantId, customerId)));
	}

	@Transactional(readOnly = true)
	public SaasSalesOrderResponse getCustomerOrder(Long tenantId, Long orderId) {

		SaasCustomer customer = validateCustomerWorkspace(tenantId);

		SaasSalesOrder order = orderRepository.findByIdAndTenantIdAndCustomerId(orderId, tenantId, customer.getId())
				.orElseThrow(() -> new RuntimeException("Sales order not found"));

		return toResponse(order);
	}

	/*
	 * ============================================================ CUSTOMER CREATE
	 * ORDER ============================================================
	 */

	@Transactional
	public SaasSalesOrderResponse createCustomerOrder(SaasCustomerOrderRequest request, String authorization) {

		validateCustomerOrderRequest(request);

		Long tenantId = request.getTenantId();

		SaasCustomer customer = validateCustomerWorkspace(tenantId);

		if (!Boolean.TRUE.equals(customer.getActive())) {

			throw new RuntimeException("Customer account is inactive");
		}

		LocalDate orderDate = LocalDate.now();

		if (request.getExpectedDeliveryDate() != null && request.getExpectedDeliveryDate().isBefore(orderDate)) {

			throw new RuntimeException("Expected delivery date cannot be before today");
		}

		Set<Long> medicineIds = new HashSet<>();

		List<CustomerCalculatedItem> calculations = new ArrayList<>();

		int totalQuantity = 0;

		BigDecimal gross = BigDecimal.ZERO;

		BigDecimal discount = BigDecimal.ZERO;

		BigDecimal taxable = BigDecimal.ZERO;

		BigDecimal gst = BigDecimal.ZERO;

		Map<Long, GlobalMedicineResponse> medicineCache = new HashMap<>();

		for (SaasCustomerOrderItemRequest requestItem : request.getItems()) {

			if (requestItem == null || requestItem.getMedicineId() == null) {

				throw new RuntimeException("Medicine is required");
			}

			if (requestItem.getQuantity() == null || requestItem.getQuantity() <= 0) {

				throw new RuntimeException("Order quantity must be greater than 0");
			}

			if (!medicineIds.add(requestItem.getMedicineId())) {

				throw new RuntimeException("Duplicate medicine items are not allowed");
			}

			GlobalMedicineResponse medicine = medicineCache.computeIfAbsent(requestItem.getMedicineId(),
					id -> findActiveMedicine(id, authorization));

			SaasMedicineStock stock = findSuggestedStock(tenantId, medicine.getId());

			if (stock == null) {

				throw new RuntimeException(
						"Medicine is not available in wholesaler inventory: " + medicine.getMedicineName());
			}

			int available = getAvailableQuantity(tenantId, medicine.getId(), orderDate);

			if (available < requestItem.getQuantity()) {

				throw new RuntimeException("Insufficient stock for " + medicine.getMedicineName() + ". Available: "
						+ available + ", Required: " + requestItem.getQuantity());
			}

			BigDecimal saleRate = customerUnitPrice(stock);

			BigDecimal gstPercentage = customerGst(stock);

			BigDecimal discountPercentage = customerDiscount(customer);

			CalculatedItem calculated = calculateItem(saleRate, discountPercentage, gstPercentage,
					requestItem.getQuantity());

			calculations.add(new CustomerCalculatedItem(

					requestItem.getQuantity(),

					available,

					medicine,

					calculated));

			totalQuantity += requestItem.getQuantity();

			gross = gross.add(calculated.grossAmount());

			discount = discount.add(calculated.discountAmount());

			taxable = taxable.add(calculated.taxableAmount());

			gst = gst.add(calculated.gstAmount());
		}

		BigDecimal grandTotal = money(taxable.add(gst));

		SaasSalesOrder order = new SaasSalesOrder();

		order.setTenantId(tenantId);

		order.setOrderNumber(generateOrderNumber(tenantId));

		order.setOrderDate(orderDate);

		order.setExpectedDeliveryDate(request.getExpectedDeliveryDate());

		/*
		 * VERY IMPORTANT: Customer ID comes from authenticated customer, never from
		 * request body.
		 */
		order.setCustomerId(customer.getId());

		order.setCustomerCode(customer.getCustomerCode());

		order.setCustomerName(customer.getCustomerName());

		order.setCustomerType(customer.getCustomerType());

		order.setCustomerMobile(customer.getMobile());

		order.setCustomerGstin(customer.getGstin());

		/*
		 * Shipping address: request override is allowed, otherwise customer profile
		 * address is used.
		 */
		order.setShippingAddress(resolveShippingAddress(request.getShippingAddress(), customer));

		order.setTotalQuantity(totalQuantity);

		order.setGrossAmount(money(gross));

		order.setDiscountAmount(money(discount));

		order.setTaxableAmount(money(taxable));

		order.setGstAmount(money(gst));

		/*
		 * Customer is not allowed to manipulate wholesaler-side charges.
		 */
		order.setOtherCharges(BigDecimal.ZERO);

		order.setRoundOffAmount(BigDecimal.ZERO);

		order.setGrandTotal(grandTotal);

		order.setOrderStatus(SaasSalesOrderStatus.PENDING);

		order.setRemarks(normalizeOptional(request.getRemarks()));

		order.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder saved = orderRepository.save(order);

		for (CustomerCalculatedItem calculated : calculations) {

			SaasSalesOrderItem item = new SaasSalesOrderItem();

			item.setTenantId(tenantId);

			item.setOrderId(saved.getId());

			item.setMedicineId(calculated.medicine().getId());

			item.setMedicineName(calculated.medicine().getMedicineName());

			item.setMedicineType(calculated.medicine().getMedicineType());

			item.setManufacturer(calculated.medicine().getManufacturer());

			item.setQuantity(calculated.quantity());

			item.setAvailableQuantityAtOrder(calculated.availableQuantity());

			item.setSaleRate(calculated.calculated().saleRate());

			item.setGrossAmount(calculated.calculated().grossAmount());

			item.setDiscountPercentage(calculated.calculated().discountPercentage());

			item.setDiscountAmount(calculated.calculated().discountAmount());

			item.setTaxableAmount(calculated.calculated().taxableAmount());

			item.setGstPercentage(calculated.calculated().gstPercentage());

			item.setGstAmount(calculated.calculated().gstAmount());

			item.setLineTotal(calculated.calculated().lineTotal());

			itemRepository.save(item);
		}

		createTimeline(saved, SaasSalesOrderTimelineType.CREATED, "Order placed",
				"Customer placed the order from SaaS workspace", null);

		/*
		 * ====================================================== WHOLESALER
		 * NOTIFICATION ======================================================
		 *
		 * Notification is created at tenant level. Later recipient filtering can be
		 * handled in notification service/repository.
		 */
		notificationService.createSystemNotificationIfNotExists(

				tenantId,

				SaasNotificationType.ORDER,

				SaasNotificationPriority.HIGH,

				"New Customer Order",

				customer.getCustomerName() + " placed sales order " + saved.getOrderNumber(),

				saved.getId(),

				"SALES_ORDER",

				"/saas/sales-orders");

		return toResponse(saved);
	}

	/*
	 * ============================================================ WHOLESALER ORDER
	 * STATUS ACTIONS ============================================================
	 */

	@Transactional
	public SaasSalesOrderResponse confirmOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.UPDATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		requireStatus(order, SaasSalesOrderStatus.PENDING, "Only pending orders can be confirmed");

		validateCurrentStockAvailability(order);

		return saveStatus(order, SaasSalesOrderStatus.CONFIRMED, request.getRemarks(),
				SaasSalesOrderTimelineType.CONFIRMED, "Order confirmed", null);
	}

	@Transactional
	public SaasSalesOrderResponse rejectOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.UPDATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		requireStatus(order, SaasSalesOrderStatus.PENDING, "Only pending orders can be rejected");

		String reason = normalizeRequired(request.getRemarks(), "Rejection reason");

		order.setRejectionReason(reason);

		return saveStatus(order, SaasSalesOrderStatus.REJECTED, reason, SaasSalesOrderTimelineType.REJECTED,
				"Order rejected", null);
	}

	@Transactional
	public SaasSalesOrderResponse dispatchOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.UPDATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		requireStatus(order, SaasSalesOrderStatus.CONFIRMED, "Only confirmed orders can be dispatched");

		validateCurrentStockAvailability(order);

		return saveStatus(order, SaasSalesOrderStatus.DISPATCHED, request.getRemarks(),
				SaasSalesOrderTimelineType.DISPATCHED, "Order dispatched", null);
	}

	@Transactional
	public SaasSalesOrderResponse deliverOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.UPDATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		requireStatus(order, SaasSalesOrderStatus.DISPATCHED, "Only dispatched orders can be marked delivered");

		SaasSalesOrderResponse response = saveStatus(order, SaasSalesOrderStatus.DELIVERED, request.getRemarks(),
				SaasSalesOrderTimelineType.DELIVERED, "Order delivered", null);

		notifyCustomerOrderStatus(order, "Order Delivered",
				"Your order " + order.getOrderNumber() + " has been delivered.");

		return response;
	}

	@Transactional
	public SaasSalesOrderResponse cancelOrder(Long orderId, SaasSalesOrderStatusRequest request) {

		Long tenantId = requireTenantId(request);

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.DELETE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		if (order.getOrderStatus() == SaasSalesOrderStatus.CONVERTED_TO_SALE) {

			throw new RuntimeException("Converted sales order cannot be cancelled");
		}

		if (order.getOrderStatus() == SaasSalesOrderStatus.DELIVERED) {

			throw new RuntimeException("Delivered sales order cannot be cancelled");
		}

		if (order.getOrderStatus() == SaasSalesOrderStatus.REJECTED

				||

				order.getOrderStatus() == SaasSalesOrderStatus.CANCELLED) {

			throw new RuntimeException("Sales order is already closed");
		}

		String reason = normalizeRequired(request.getRemarks(), "Cancellation reason");

		order.setCancellationReason(reason);

		SaasSalesOrderResponse response = saveStatus(order, SaasSalesOrderStatus.CANCELLED, reason,
				SaasSalesOrderTimelineType.CANCELLED, "Order cancelled", null);

		notifyCustomerOrderStatus(order, "Order Cancelled",
				"Your order " + order.getOrderNumber() + " has been cancelled.");

		return response;
	}

	/*
	 * ============================================================ CONVERT ORDER ->
	 * SALE ============================================================
	 */

	@Transactional
	public SaasSalesOrderResponse convertOrderToSale(Long orderId, SaasSalesOrderConvertRequest request) {

		if (request == null || request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required");
		}

		Long tenantId = request.getTenantId();

		requireWholesalerWorkspaceActor(tenantId, SaasPermissionAction.UPDATE);

		permissionService.requirePermission(tenantId, TenantModule.SALES, SaasPermissionAction.CREATE);

		SaasSalesOrder order = findOrder(tenantId, orderId);

		if (order.getOrderStatus() != SaasSalesOrderStatus.CONFIRMED

				&&

				order.getOrderStatus() != SaasSalesOrderStatus.DISPATCHED

				&&

				order.getOrderStatus() != SaasSalesOrderStatus.DELIVERED) {

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

				normalizeOptional(request.getRemarks()) == null

						?

						"Converted from sales order " + order.getOrderNumber()

						:

						request.getRemarks().trim());

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

	/*
	 * ============================================================ CUSTOMER
	 * SECURITY ============================================================
	 */

	private SaasCustomer validateCustomerWorkspace(Long tenantId) {

		if (tenantId == null || tenantId <= 0) {

			throw new RuntimeException("tenantId is required");
		}

		String role = normalizeRole(CurrentUserUtil.getRole());

		if (!"SAAS_CUSTOMER".equals(role)) {

			throw new AccessDeniedException("Customer access required");
		}

		Tenant tenant = tenantAccessService.validateTenantAccess(tenantId);

		String tenantType = tenant.getTenantType() == null ? ""
				: tenant.getTenantType().name().trim().toUpperCase(Locale.ROOT);

		if (!"WHOLESALER".equals(tenantType)) {

			throw new RuntimeException("Customer orders are available only in wholesaler workspaces");
		}

		Long authUserId = CurrentUserUtil.getUserId();

		if (authUserId == null) {

			throw new AccessDeniedException("Authenticated customer is missing");
		}

		SaasCustomer customer = customerRepository.findByAuthUserId(authUserId)
				.orElseThrow(() -> new RuntimeException("Customer profile not found"));

		if (!Boolean.TRUE.equals(customer.getActive())) {

			throw new AccessDeniedException("Customer account is inactive");
		}

		/*
		 * Customer belongs to exactly one wholesaler workspace.
		 */
		if (!Objects.equals(customer.getTenantId(), tenantId)) {

			throw new AccessDeniedException("Customer is not assigned to this workspace");
		}

		return customer;
	}

	/*
	 * ============================================================ WHOLESALER
	 * SECURITY ============================================================
	 */

	private void requireWholesalerWorkspaceActor(Long tenantId, SaasPermissionAction action) {

		String role = normalizeRole(CurrentUserUtil.getRole());

		if (!"WHOLESALER".equals(role) && !"SAAS_STAFF".equals(role)) {

			throw new AccessDeniedException("Only wholesaler or assigned SaaS staff can manage sales orders");
		}

		validateWholesalerWorkspace(tenantId);

		permissionService.requirePermission(tenantId, TenantModule.SALES_ORDERS, action);
	}

	private void validateWholesalerWorkspace(Long tenantId) {

		Tenant tenant = tenantAccessService.validateTenantAccess(tenantId);

		String tenantType = tenant.getTenantType() == null ? ""
				: tenant.getTenantType().name().trim().toUpperCase(Locale.ROOT);

		if (!"WHOLESALER".equals(tenantType)) {

			throw new RuntimeException("Sales Orders module is available only for Wholesaler workspaces");
		}
	}

	/*
	 * ============================================================ CUSTOMER CATALOG
	 * HELPERS ============================================================
	 */

	private boolean matchesMedicineKeyword(GlobalMedicineResponse medicine, String keyword) {

		String k = keyword.toLowerCase(Locale.ROOT);

		return contains(medicine.getMedicineName(), k)

				||

				contains(medicine.getMedicineType(), k)

				||

				contains(medicine.getManufacturer(), k);
	}

	private boolean contains(String value, String keyword) {

		return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
	}

	private SaasMedicineStock findSuggestedStock(Long tenantId, Long medicineId) {

		List<SaasMedicineStock> stocks = stockRepository
				.findByTenantIdAndMedicineIdAndActiveTrueAndCurrentQuantityGreaterThan(tenantId, medicineId, 0);

		return stocks.stream()

				.filter(stock -> stock.getCurrentQuantity() != null && stock.getCurrentQuantity() > 0)

				.filter(stock -> stock.getExpiryDate() == null || !stock.getExpiryDate().isBefore(LocalDate.now()))

				/*
				 * Prefer stock having a valid sale price.
				 */
				.sorted(Comparator.comparing(
						(SaasMedicineStock stock) -> getStockEffectiveSalePrice(stock).compareTo(BigDecimal.ZERO) <= 0)
						.thenComparing(SaasMedicineStock::getExpiryDate,
								Comparator.nullsLast(Comparator.naturalOrder()))
						.thenComparing(SaasMedicineStock::getCreatedAt,
								Comparator.nullsLast(Comparator.naturalOrder())))

				.findFirst().orElse(null);
	}

	private BigDecimal getStockEffectiveSalePrice(SaasMedicineStock stock) {

		if (stock == null) {
			return BigDecimal.ZERO;
		}

		if (stock.getSalePrice() != null && stock.getSalePrice().compareTo(BigDecimal.ZERO) > 0) {

			return money(stock.getSalePrice());
		}

		if (stock.getMrp() != null && stock.getMrp().compareTo(BigDecimal.ZERO) > 0) {

			return money(stock.getMrp());
		}

		return BigDecimal.ZERO;
	}

	private BigDecimal customerUnitPrice(SaasMedicineStock stock) {

		if (stock.getSalePrice() != null && stock.getSalePrice().compareTo(BigDecimal.ZERO) > 0) {

			return money(stock.getSalePrice());
		}

		return money(stock.getMrp());
	}

	private BigDecimal customerGst(SaasMedicineStock stock) {

		return validPercentage(stock.getGstPercentage(), "GST percentage");
	}

	private BigDecimal customerDiscount(SaasCustomer customer) {

		if (customer.getDiscountPercentage() == null) {

			return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		}

		return validPercentage(customer.getDiscountPercentage(), "Customer discount percentage");
	}

	/*
	 * ============================================================ CALCULATIONS
	 * ============================================================
	 */

	private CalculatedOrder calculateWholesalerOrder(SaasSalesOrderRequest request, LocalDate requiredDate,
			String authorization) {

		BigDecimal gross = BigDecimal.ZERO;

		BigDecimal discount = BigDecimal.ZERO;

		BigDecimal taxable = BigDecimal.ZERO;

		BigDecimal gst = BigDecimal.ZERO;

		int quantity = 0;

		Set<Long> medicineIds = new HashSet<>();

		for (SaasSalesOrderItemRequest item : request.getItems()) {

			validateWholesalerItem(item);

			if (!medicineIds.add(item.getMedicineId())) {

				throw new RuntimeException("Duplicate medicine items are not allowed");
			}

			GlobalMedicineResponse medicine = findActiveMedicine(item.getMedicineId(), authorization);

			int available = getAvailableQuantity(request.getTenantId(), medicine.getId(), requiredDate);

			if (available < item.getQuantity()) {

				throw new RuntimeException("Insufficient stock for " + medicine.getMedicineName() + ". Available: "
						+ available + ", Required: " + item.getQuantity());
			}

			CalculatedItem calculated = calculateItem(item.getSaleRate(), item.getDiscountPercentage(),
					item.getGstPercentage(), item.getQuantity());

			gross = gross.add(calculated.grossAmount());

			discount = discount.add(calculated.discountAmount());

			taxable = taxable.add(calculated.taxableAmount());

			gst = gst.add(calculated.gstAmount());

			quantity += item.getQuantity();
		}

		return new CalculatedOrder(money(gross), money(discount), money(taxable), money(gst), quantity);
	}

	private CalculatedItem calculateItem(BigDecimal saleRate, BigDecimal discountPercentage, BigDecimal gstPercentage,
			Integer quantityValue) {

		if (quantityValue == null || quantityValue <= 0) {

			throw new RuntimeException("Order quantity must be greater than 0");
		}

		BigDecimal rate = nonNegativeAmount(saleRate, "Sale rate");

		BigDecimal discountPct = validPercentage(discountPercentage, "Discount percentage");

		BigDecimal gstPct = validPercentage(gstPercentage, "GST percentage");

		BigDecimal quantity = BigDecimal.valueOf(quantityValue);

		BigDecimal gross = money(rate.multiply(quantity));

		BigDecimal discount = money(gross.multiply(discountPct).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal taxable = money(gross.subtract(discount));

		BigDecimal gst = money(taxable.multiply(gstPct).divide(HUNDRED, 4, RoundingMode.HALF_UP));

		BigDecimal line = money(taxable.add(gst));

		return new CalculatedItem(rate, discountPct, gstPct, gross, discount, taxable, gst, line);
	}

	/*
	 * ============================================================ STOCK
	 * ============================================================
	 */

	private void validateCurrentStockAvailability(SaasSalesOrder order) {

		List<SaasSalesOrderItem> items = itemRepository.findByTenantIdAndOrderIdOrderByIdAsc(order.getTenantId(),
				order.getId());

		LocalDate requiredDate = LocalDate.now();

		for (SaasSalesOrderItem item : items) {

			int available = getAvailableQuantity(order.getTenantId(), item.getMedicineId(), requiredDate);

			if (available < item.getQuantity()) {

				throw new RuntimeException("Insufficient stock for " + item.getMedicineName() + ". Available: "
						+ available + ", Required: " + item.getQuantity());
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

	/*
	 * ============================================================ GLOBAL MEDICINE
	 * SERVICE ============================================================
	 */

	private GlobalMedicineResponse findActiveMedicine(Long medicineId, String authorization) {

		if (medicineId == null) {

			throw new RuntimeException("Medicine is required");
		}

		try {

			GlobalMedicineResponse medicine = medicineServiceClient.getMedicine(authorization, internalServiceKey,
					medicineId);

			if (medicine == null || medicine.getId() == null) {

				throw new RuntimeException("Medicine not found in Global Medicine Master");
			}

			if (Boolean.FALSE.equals(medicine.isActive())) {

				throw new RuntimeException("Selected medicine is inactive");
			}

			return medicine;

		} catch (RuntimeException exception) {

			throw exception;

		} catch (Exception exception) {

			throw new RuntimeException("Medicine not found in Global Medicine Master");
		}
	}

	/*
	 * ============================================================ ORDER STATUS
	 * ============================================================
	 */

	private SaasSalesOrderResponse saveStatus(SaasSalesOrder order, SaasSalesOrderStatus status, String remarks,
			SaasSalesOrderTimelineType timelineType, String label, Long referenceId) {

		order.setOrderStatus(status);

		order.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());

		SaasSalesOrder saved = orderRepository.save(order);

		createTimeline(saved, timelineType, label, normalizeOptional(remarks), referenceId);

		/*
		 * Notify customer when wholesaler changes status.
		 */
		if (status == SaasSalesOrderStatus.CONFIRMED) {

			notifyCustomerOrderStatus(saved, "Order Confirmed",
					"Your order " + saved.getOrderNumber() + " has been confirmed.");
		}

		if (status == SaasSalesOrderStatus.REJECTED) {

			notifyCustomerOrderStatus(saved, "Order Rejected",
					"Your order " + saved.getOrderNumber() + " has been rejected.");
		}

		if (status == SaasSalesOrderStatus.DISPATCHED) {

			notifyCustomerOrderStatus(saved, "Order Dispatched",
					"Your order " + saved.getOrderNumber() + " has been dispatched.");
		}

		return toResponse(saved);
	}

	private void notifyCustomerOrderStatus(SaasSalesOrder order, String title, String message) {

		if (order == null || order.getCustomerId() == null) {

			return;
		}

		SaasCustomer customer = customerRepository.findByIdAndTenantId(order.getCustomerId(), order.getTenantId())
				.orElse(null);

		if (customer == null || customer.getAuthUserId() == null) {

			return;
		}

		/*
		 * Customer-specific notification.
		 *
		 * This assumes SaasNotificationService stores authUserId.
		 */
		notificationService.createSystemNotificationIfNotExists(

				order.getTenantId(),

				SaasNotificationType.ORDER,

				SaasNotificationPriority.MEDIUM,

				title,

				message,

				order.getId(),

				"SALES_ORDER",

				"/saas/sales-orders");
	}

	private SaasSalesOrder findOrder(Long tenantId, Long orderId) {

		if (orderId == null) {

			throw new RuntimeException("Sales order id is required");
		}

		return orderRepository.findByIdAndTenantId(orderId, tenantId)
				.orElseThrow(() -> new RuntimeException("Sales order not found"));
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

	/*
	 * ============================================================ TIMELINE
	 * ============================================================
	 */

	private void createTimeline(SaasSalesOrder order, SaasSalesOrderTimelineType type, String label, String remarks,
			Long referenceId) {

		SaasSalesOrderTimeline timeline = new SaasSalesOrderTimeline();

		timeline.setTenantId(order.getTenantId());

		timeline.setOrderId(order.getId());

		timeline.setTimelineType(type);

		timeline.setStatusLabel(label);

		timeline.setRemarks(normalizeOptional(remarks));

		timeline.setReferenceId(referenceId);

		timeline.setCreatedByAuthUserId(CurrentUserUtil.getUserId());

		timelineRepository.save(timeline);
	}

	/*
	 * ============================================================ RESPONSE MAPPING
	 * ============================================================
	 */

	private SaasSalesOrderResponse toResponse(SaasSalesOrder order) {

		List<SaasSalesOrderItemResponse> items = itemRepository
				.findByTenantIdAndOrderIdOrderByIdAsc(order.getTenantId(), order.getId()).stream()
				.map(this::toItemResponse).toList();

		List<com.example.medi.saas.dto.SaasSalesOrderTimelineResponse> timeline = timelineRepository
				.findByTenantIdAndOrderIdOrderByCreatedAtAsc(order.getTenantId(), order.getId()).stream()
				.map(this::toTimelineResponse).toList();

		return new SaasSalesOrderResponse(

				order.getId(),

				order.getTenantId(),

				order.getOrderNumber(),

				order.getOrderDate(),

				order.getExpectedDeliveryDate(),

				order.getCustomerId(),

				order.getCustomerCode(),

				order.getCustomerName(),

				order.getCustomerType(),

				order.getCustomerMobile(),

				order.getCustomerGstin(),

				order.getShippingAddress(),

				order.getTotalQuantity(),

				order.getGrossAmount(),

				order.getDiscountAmount(),

				order.getTaxableAmount(),

				order.getGstAmount(),

				order.getOtherCharges(),

				order.getRoundOffAmount(),

				order.getGrandTotal(),

				order.getOrderStatus() == null ? null : order.getOrderStatus().name(),

				order.getConvertedSaleId(),

				order.getConvertedSaleNumber(),

				order.getRejectionReason(),

				order.getCancellationReason(),

				order.getRemarks(),

				order.getCreatedAt(),

				items,

				timeline);
	}

	private SaasSalesOrderItemResponse toItemResponse(SaasSalesOrderItem item) {

		return new SaasSalesOrderItemResponse(

				item.getId(),

				item.getMedicineId(),

				item.getMedicineName(),

				item.getMedicineType(),

				item.getManufacturer(),

				item.getQuantity(),

				item.getAvailableQuantityAtOrder(),

				item.getSaleRate(),

				item.getGrossAmount(),

				item.getDiscountPercentage(),

				item.getDiscountAmount(),

				item.getTaxableAmount(),

				item.getGstPercentage(),

				item.getGstAmount(),

				item.getLineTotal());
	}

	private com.example.medi.saas.dto.SaasSalesOrderTimelineResponse toTimelineResponse(
			SaasSalesOrderTimeline timeline) {

		return new com.example.medi.saas.dto.SaasSalesOrderTimelineResponse(

				timeline.getId(),

				timeline.getTimelineType() == null ? null : timeline.getTimelineType().name(),

				timeline.getStatusLabel(),

				timeline.getRemarks(),

				timeline.getReferenceId(),

				timeline.getCreatedAt());
	}

	private SaasSaleItemRequest toSaleItemRequest(SaasSalesOrderItem item) {

		SaasSaleItemRequest request = new SaasSaleItemRequest();

		request.setMedicineId(item.getMedicineId());

		request.setQuantity(item.getQuantity());

		request.setSaleRate(item.getSaleRate());

		request.setDiscountPercentage(item.getDiscountPercentage());

		request.setGstPercentage(item.getGstPercentage());

		return request;
	}

	private void saveOrderItem(SaasSalesOrder order, GlobalMedicineResponse medicine, Integer quantity,
			Integer availableQuantity, CalculatedItem calculated) {

		SaasSalesOrderItem item = new SaasSalesOrderItem();

		item.setTenantId(order.getTenantId());

		item.setOrderId(order.getId());

		item.setMedicineId(medicine.getId());

		item.setMedicineName(medicine.getMedicineName());

		item.setMedicineType(medicine.getMedicineType());

		item.setManufacturer(medicine.getManufacturer());

		item.setQuantity(quantity);

		item.setAvailableQuantityAtOrder(availableQuantity);

		item.setSaleRate(calculated.saleRate());

		item.setGrossAmount(calculated.grossAmount());

		item.setDiscountPercentage(calculated.discountPercentage());

		item.setDiscountAmount(calculated.discountAmount());

		item.setTaxableAmount(calculated.taxableAmount());

		item.setGstPercentage(calculated.gstPercentage());

		item.setGstAmount(calculated.gstAmount());

		item.setLineTotal(calculated.lineTotal());

		itemRepository.save(item);
	}

	/*
	 * ============================================================ VALIDATION
	 * ============================================================
	 */

	private void validateWholesalerOrderRequest(com.example.medi.saas.dto.SaasSalesOrderRequest request) {

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

		if (request.getItems().size() > 100) {

			throw new RuntimeException("Too many order items");
		}

		nonNegativeAmount(request.getOtherCharges(), "Other charges");
	}

	private void validateCustomerOrderRequest(SaasCustomerOrderRequest request) {

		if (request == null) {

			throw new RuntimeException("Customer order request is required");
		}

		if (request.getTenantId() == null) {

			throw new RuntimeException("tenantId is required");
		}

		if (request.getItems() == null || request.getItems().isEmpty()) {

			throw new RuntimeException("At least one medicine is required");
		}

		if (request.getItems().size() > 100) {

			throw new RuntimeException("Too many order items");
		}
	}

	private void validateWholesalerItem(SaasSalesOrderItemRequest item) {

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

	/*
	 * ============================================================ ADDRESS
	 * ============================================================
	 */

	private String resolveShippingAddress(String requestedAddress, SaasCustomer customer) {

		/*
		 * 1. If customer explicitly supplied a shipping address, use that address
		 * first.
		 */
		String address = normalizeOptional(requestedAddress);

		if (address != null) {
			return address;
		}

		/*
		 * 2. Otherwise build address from customer profile.
		 *
		 * IMPORTANT: Do NOT use List.of(...) here because List.of() does not allow null
		 * elements.
		 */
		if (customer == null) {
			return null;
		}

		return java.util.stream.Stream
				.of(customer.getAddress(), customer.getCity(), customer.getDistrict(), customer.getState(),
						customer.getPincode())
				.filter(Objects::nonNull).map(String::trim).filter(value -> !value.isBlank())
				.reduce((first, second) -> first + ", " + second).orElse(null);
	}

	/*
	 * ============================================================ ORDER NUMBER
	 * ============================================================
	 */

	private String generateOrderNumber(Long tenantId) {

		String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

		String random = UUID.randomUUID().toString().replace("-", "").substring(0, 5).toUpperCase(Locale.ROOT);

		return "ORD-" + tenantId + "-" + timestamp + "-" + random;
	}

	/*
	 * ============================================================ MONEY / TEXT
	 * ============================================================
	 */

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

		if (percentage.compareTo(BigDecimal.ZERO) < 0

				||

				percentage.compareTo(HUNDRED) > 0) {

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

	private String normalizeRole(String value) {

		return String.valueOf(value == null ? "" : value).trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", "");
	}

	/*
	 * ============================================================ INTERNAL RECORDS
	 * ============================================================
	 */

	private record CalculatedOrder(BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount,
			BigDecimal gstAmount, Integer totalQuantity) {
	}

	private record CalculatedItem(BigDecimal saleRate, BigDecimal discountPercentage, BigDecimal gstPercentage,
			BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxableAmount, BigDecimal gstAmount,
			BigDecimal lineTotal) {
	}

	private record CustomerCalculatedItem(Integer quantity, Integer availableQuantity, GlobalMedicineResponse medicine,
			CalculatedItem calculated) {
	}
}