package com.example.medi.billing.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.medi.billing.dto.SubscribePlanRequest;
import com.example.medi.billing.dto.SubscribePlanResponse;
import com.example.medi.billing.dto.SubscriptionCheckResponse;
import com.example.medi.billing.dto.SubscriptionPaymentVerifyResponse;
import com.example.medi.billing.entity.SubscriptionPayment;
import com.example.medi.billing.entity.SubscriptionPlan;
import com.example.medi.billing.entity.UserSubscription;
import com.example.medi.billing.enums.BillingCycle;
import com.example.medi.billing.enums.PaymentGateway;
import com.example.medi.billing.enums.SubscriptionPaymentStatus;
import com.example.medi.billing.enums.SubscriptionRole;
import com.example.medi.billing.enums.SubscriptionStatus;
import com.example.medi.billing.repository.SubscriptionPaymentRepository;
import com.example.medi.billing.repository.SubscriptionPlanRepository;
import com.example.medi.billing.repository.UserSubscriptionRepository;
import com.example.medi.billing.security.CurrentUserUtil;
import com.example.medi.billing.security.SaasWorkspaceAuthorizationService;

@Service
public class SubscriptionService {

	private final SubscriptionPlanRepository planRepository;
	private final UserSubscriptionRepository subscriptionRepository;
	private final SubscriptionPaymentRepository paymentRepository;
	private final PhonePeSubscriptionService phonePeSubscriptionService;
	private final SaasWorkspaceAuthorizationService saasWorkspaceAuthorizationService;

	public SubscriptionService(SubscriptionPlanRepository planRepository,
			UserSubscriptionRepository subscriptionRepository, SubscriptionPaymentRepository paymentRepository,
			PhonePeSubscriptionService phonePeSubscriptionService,
			SaasWorkspaceAuthorizationService saasWorkspaceAuthorizationService) {
		this.planRepository = planRepository;
		this.subscriptionRepository = subscriptionRepository;
		this.paymentRepository = paymentRepository;
		this.phonePeSubscriptionService = phonePeSubscriptionService;
		this.saasWorkspaceAuthorizationService = saasWorkspaceAuthorizationService;
	}

	// ============================================================
	// PLAN MANAGEMENT
	// ============================================================

	public SubscriptionPlan createPlan(SubscriptionPlan plan) {

		if (plan == null) {
			throw new RuntimeException("Subscription plan is required");
		}

		if (plan.getPlanName() == null || plan.getPlanName().isBlank()) {

			throw new RuntimeException("Plan name is required");
		}

		if (plan.getPlanCode() == null || plan.getPlanCode().isBlank()) {

			throw new RuntimeException("Plan code is required");
		}

		if (plan.getRole() == null) {

			throw new RuntimeException("Plan role is required");
		}

		if (plan.getMonthlyPrice() == null || plan.getMonthlyPrice().compareTo(BigDecimal.ZERO) <= 0) {

			throw new RuntimeException("Monthly price is required");
		}

		if (plan.getYearlyPrice() == null || plan.getYearlyPrice().compareTo(BigDecimal.ZERO) <= 0) {

			throw new RuntimeException("Yearly price is required");
		}

		if (plan.getActive() == null) {
			plan.setActive(true);
		}

		return planRepository.save(plan);
	}

	public List<SubscriptionPlan> getAllActivePlans() {

		return planRepository.findByActiveTrue();
	}

	public List<SubscriptionPlan> getPlansByRole(String role) {

		if (role == null || role.isBlank()) {

			throw new RuntimeException("Role is required");
		}

		try {

			SubscriptionRole subscriptionRole = SubscriptionRole.valueOf(role.trim().toUpperCase());

			return planRepository.findByRoleAndActiveTrue(subscriptionRole);

		} catch (IllegalArgumentException e) {

			throw new RuntimeException("Invalid subscription role: " + role);
		}
	}

	// ============================================================
	// START PAYMENT
	// ============================================================

	public SubscribePlanResponse subscribePlan(SubscribePlanRequest request) {

		if (request == null) {

			throw new RuntimeException("Subscription request is required");
		}

		if (request.getPlanCode() == null || request.getPlanCode().isBlank()) {

			throw new RuntimeException("Plan code is required");
		}

		if (request.getBillingCycle() == null || request.getBillingCycle().isBlank()) {

			throw new RuntimeException("Billing cycle is required");
		}

		Long authUserId = CurrentUserUtil.getUserId();

		String currentRole = CurrentUserUtil.getRole();

		if (authUserId == null) {

			throw new RuntimeException("User not found from token");
		}

		if (currentRole == null || currentRole.isBlank()) {

			throw new RuntimeException("User role not found from token");
		}

		currentRole = currentRole.trim().toUpperCase();

		// --------------------------------------------------------
		// TENANT
		// --------------------------------------------------------

		Long tenantId = normalizeTenantId(request.getTenantId());

		/*
		 * tenantId == null → Main Platform subscription
		 *
		 * tenantId != null → SaaS workspace subscription
		 */
		if (tenantId != null) {

			validateSaasWorkspaceAccess(authUserId, tenantId);
		}

		// --------------------------------------------------------
		// ROLE
		// --------------------------------------------------------

		SubscriptionRole userRole;

		try {

			userRole = SubscriptionRole.valueOf(currentRole);

		} catch (IllegalArgumentException e) {

			throw new RuntimeException("Invalid subscription role: " + currentRole);
		}

		// --------------------------------------------------------
		// BILLING CYCLE
		// --------------------------------------------------------

		BillingCycle billingCycle;

		try {

			billingCycle = BillingCycle.valueOf(request.getBillingCycle().trim().toUpperCase());

		} catch (IllegalArgumentException e) {

			throw new RuntimeException("Invalid billing cycle. " + "Allowed values: MONTHLY, YEARLY");
		}

		// --------------------------------------------------------
		// PLAN
		// --------------------------------------------------------

		SubscriptionPlan plan = planRepository.findByPlanCodeAndActiveTrue(request.getPlanCode().trim())
				.orElseThrow(() -> new RuntimeException("Invalid or inactive subscription plan"));

		if (plan.getRole() != userRole) {

			throw new RuntimeException("Selected plan does not belong to your role");
		}

		// --------------------------------------------------------
		// PRICE
		// --------------------------------------------------------

		BigDecimal amount;

		if (billingCycle == BillingCycle.MONTHLY) {

			amount = plan.getMonthlyPrice();

		} else {

			amount = plan.getYearlyPrice();
		}

		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {

			throw new RuntimeException("Price is not configured for selected billing cycle");
		}

		// --------------------------------------------------------
		// ORDER
		// --------------------------------------------------------

		String merchantOrderId = "MR-SUB-" + UUID.randomUUID();

		// --------------------------------------------------------
		// PAYMENT
		// --------------------------------------------------------

		SubscriptionPayment payment = new SubscriptionPayment();

		payment.setAuthUserId(authUserId);

		payment.setUserRole(currentRole);

		payment.setPlanId(plan.getId());

		payment.setTenantId(tenantId);

		payment.setPlanCode(plan.getPlanCode());

		payment.setAmount(amount);

		payment.setBillingCycle(billingCycle);

		payment.setMerchantOrderId(merchantOrderId);

		payment.setPaymentStatus(SubscriptionPaymentStatus.INITIATED);

		payment.setPaymentGateway(PaymentGateway.PHONEPE);

		SubscriptionPayment savedPayment = paymentRepository.save(payment);

		// --------------------------------------------------------
		// RUPEES → PAISE
		// --------------------------------------------------------

		long amountInPaise = amount.movePointRight(2).longValueExact();

		// --------------------------------------------------------
		// PHONEPE
		// --------------------------------------------------------

		String redirectUrl = phonePeSubscriptionService.createCheckoutPayment(merchantOrderId, amountInPaise,
				savedPayment.getId());

		return new SubscribePlanResponse(true, "Subscription payment initiated", savedPayment.getId(), merchantOrderId,
				redirectUrl);
	}

	// ============================================================
	// CURRENT SUBSCRIPTION
	// ============================================================

	public UserSubscription findCurrentActiveSubscription(Long authUserId) {

		return findCurrentActiveSubscription(authUserId, null);
	}

	public UserSubscription findCurrentActiveSubscription(Long authUserId, Long tenantId) {

		if (authUserId == null) {

			throw new RuntimeException("User ID is required");
		}

		tenantId = normalizeTenantId(tenantId);

		return subscriptionRepository
				.findCurrentActiveSubscription(authUserId, tenantId, SubscriptionStatus.ACTIVE, LocalDate.now())
				.orElse(null);
	}

	public UserSubscription getCurrentActiveSubscription(Long authUserId) {

		return getCurrentActiveSubscription(authUserId, null);
	}

	public UserSubscription getCurrentActiveSubscription(Long authUserId, Long tenantId) {

		tenantId = normalizeTenantId(tenantId);

		if (tenantId != null) {

			validateSaasWorkspaceAccess(authUserId, tenantId);
		}

		UserSubscription subscription = findCurrentActiveSubscription(authUserId, tenantId);

		if (subscription == null) {

			throw new RuntimeException("No active subscription found.");
		}

		return subscription;
	}

	// ============================================================
	// CHECK SUBSCRIPTION
	// ============================================================

	public SubscriptionCheckResponse checkSubscription(Long authUserId) {

		return checkSubscription(authUserId, null);
	}

	public SubscriptionCheckResponse checkSubscription(Long authUserId, Long tenantId) {

		tenantId = normalizeTenantId(tenantId);

		if (tenantId != null) {

			validateSaasWorkspaceAccess(authUserId, tenantId);
		}

		UserSubscription subscription = findCurrentActiveSubscription(authUserId, tenantId);

		if (subscription == null) {

			return new SubscriptionCheckResponse(false, authUserId, null, null, null, null, null, null, null, null,
					false);
		}

		SubscriptionPlan plan = subscription.getPlan();

		return new SubscriptionCheckResponse(

				true,

				subscription.getAuthUserId(),

				subscription.getRole() != null ? subscription.getRole().name() : null,

				plan != null ? plan.getId() : null,

				plan != null ? plan.getPlanName() : null,

				subscription.getStartDate(),

				subscription.getEndDate(),

				plan != null ? plan.getMaxMedicines() : null,

				plan != null ? plan.getMaxAppointments() : null,

				plan != null ? plan.getMaxStaff() : null,

				plan != null && Boolean.TRUE.equals(plan.getVideoConsultationAllowed()));
	}

	// ============================================================
	// LATEST SUBSCRIPTION
	// ============================================================

	public UserSubscription getLatestSubscription(Long authUserId) {

		return getLatestSubscription(authUserId, null);
	}

	public UserSubscription getLatestSubscription(Long authUserId, Long tenantId) {

		tenantId = normalizeTenantId(tenantId);

		if (tenantId != null) {

			validateSaasWorkspaceAccess(authUserId, tenantId);
		}

		return subscriptionRepository.findLatestSubscription(authUserId, tenantId)
				.orElseThrow(() -> new RuntimeException("No subscription found"));
	}

	// ============================================================
	// PAYMENT VERIFICATION
	// ============================================================

	@Transactional
	public SubscriptionPaymentVerifyResponse verifySubscriptionPayment(Long paymentId, String merchantOrderId) {

		if (paymentId == null) {

			throw new RuntimeException("paymentId is required");
		}

		if (merchantOrderId == null || merchantOrderId.isBlank()) {

			throw new RuntimeException("merchantOrderId is required");
		}

		Long authUserId = CurrentUserUtil.getUserId();

		if (authUserId == null) {

			throw new RuntimeException("User not found from token");
		}

		// --------------------------------------------------------
		// PAYMENT LOCK
		// --------------------------------------------------------

		SubscriptionPayment payment = paymentRepository.findByMerchantOrderIdForUpdate(merchantOrderId)
				.orElseThrow(() -> new RuntimeException("Subscription payment not found"));

		// --------------------------------------------------------
		// PAYMENT ID
		// --------------------------------------------------------

		if (!paymentId.equals(payment.getId())) {

			throw new RuntimeException("Invalid payment id");
		}

		// --------------------------------------------------------
		// OWNERSHIP
		// --------------------------------------------------------

		if (!authUserId.equals(payment.getAuthUserId())) {

			throw new RuntimeException("You are not authorized to verify this payment");
		}

		// --------------------------------------------------------
		// TENANT
		// --------------------------------------------------------

		Long tenantId = normalizeTenantId(payment.getTenantId());

		/*
		 * NEVER take tenantId from the verification request.
		 *
		 * Payment record is the source of truth.
		 */
		if (tenantId != null) {

			validateSaasWorkspaceAccess(authUserId, tenantId);
		}

		// --------------------------------------------------------
		// IDEMPOTENCY
		// --------------------------------------------------------

		if (SubscriptionPaymentStatus.SUCCESS.equals(payment.getPaymentStatus())) {

			if (payment.getSubscriptionId() == null) {

				throw new RuntimeException("Payment is successful but subscription is missing");
			}

			UserSubscription existingSubscription = subscriptionRepository.findById(payment.getSubscriptionId())
					.orElseThrow(() -> new RuntimeException("Subscription not found"));

			SubscriptionPlan existingPlan = existingSubscription.getPlan();

			return new SubscriptionPaymentVerifyResponse(

					true,

					"Subscription already activated",

					existingSubscription.getId(),

					payment.getId(),

					payment.getMerchantOrderId(),

					existingPlan.getPlanCode(),

					existingPlan.getPlanName(),

					existingSubscription.getStartDate(),

					existingSubscription.getEndDate());
		}

		// --------------------------------------------------------
		// PHONEPE
		// --------------------------------------------------------

		PhonePePaymentStatus phonePePaymentStatus = phonePeSubscriptionService.checkPaymentStatus(merchantOrderId);

		String phonePeState = phonePePaymentStatus != null
				? phonePePaymentStatus.getState()
				: null;

		String phonePeTransactionId = phonePePaymentStatus != null
				? phonePePaymentStatus.getTransactionId()
				: null;

		String normalizedState = phonePeState == null
				? "UNKNOWN"
				: phonePeState.trim().toUpperCase();

		// --------------------------------------------------------
		// PAYMENT NOT SUCCESSFUL
		// --------------------------------------------------------

		if (!isPhonePePaymentSuccess(normalizedState)) {

			// PENDING
			if (isPhonePePaymentPending(normalizedState)) {

				payment.setPaymentStatus(SubscriptionPaymentStatus.INITIATED);

				if (phonePeTransactionId != null && !phonePeTransactionId.isBlank()) {

					payment.setTransactionId(phonePeTransactionId);
				}

				payment.touch();

				paymentRepository.save(payment);

				return new SubscriptionPaymentVerifyResponse(

						false,

						"Payment is still pending. Current status: " + normalizedState,

						null,

						payment.getId(),

						payment.getMerchantOrderId(),

						payment.getPlanCode(),

						null,

						null,

						null);
			}

			// FAILED
			payment.setPaymentStatus(SubscriptionPaymentStatus.FAILED);

			if (phonePeTransactionId != null && !phonePeTransactionId.isBlank()) {

				payment.setTransactionId(phonePeTransactionId);
			}

			payment.touch();

			paymentRepository.save(payment);

			

			return new SubscriptionPaymentVerifyResponse(

					false,

					"Payment not successful. Current status: " + normalizedState,

					null,

					payment.getId(),

					payment.getMerchantOrderId(),

					payment.getPlanCode(),

					null,

					null,

					null);
		}

		// ========================================================
		// PAYMENT SUCCESS → SUBSCRIPTION
		// ========================================================

		SubscriptionPlan plan = planRepository.findById(payment.getPlanId())
				.orElseThrow(() -> new RuntimeException("Subscription plan not found"));

		// --------------------------------------------------------
		// ROLE
		// --------------------------------------------------------

		SubscriptionRole paymentRole;

		try {

			paymentRole = SubscriptionRole.valueOf(payment.getUserRole().trim().toUpperCase());

		} catch (IllegalArgumentException e) {

			throw new RuntimeException("Invalid subscription role in payment");
		}

		if (plan.getRole() != paymentRole) {

			throw new RuntimeException("Subscription plan does not belong to payment role");
		}

		// --------------------------------------------------------
		// DURATION
		// --------------------------------------------------------

		int durationDays = getSubscriptionDurationDays(payment.getBillingCycle());

		// --------------------------------------------------------
		// LATEST ACTIVE / SCHEDULED
		// --------------------------------------------------------

		LocalDate today = LocalDate.now();

		UserSubscription latestSubscription = subscriptionRepository
				.findLatestActiveOrScheduledForUpdate(authUserId, tenantId, SubscriptionStatus.ACTIVE, today)
				.orElse(null);

		// --------------------------------------------------------
		// START DATE
		// --------------------------------------------------------

		LocalDate startDate;

		if (latestSubscription == null) {

			startDate = today;

		} else {

			startDate = latestSubscription.getEndDate().plusDays(1);
		}

		/*
		 * 30 days means:
		 *
		 * 01 Aug -> 30 Aug
		 *
		 * 365 days means:
		 *
		 * 01 Jan -> 31 Dec
		 */
		LocalDate endDate = startDate.plusDays(durationDays - 1L);

		// --------------------------------------------------------
		// CREATE SUBSCRIPTION
		// --------------------------------------------------------

		UserSubscription subscription = new UserSubscription();

		subscription.setAuthUserId(authUserId);

		subscription.setTenantId(tenantId);

		subscription.setRole(paymentRole);

		subscription.setPlan(plan);

		subscription.setBillingCycle(payment.getBillingCycle());

		subscription.setStartDate(startDate);

		subscription.setEndDate(endDate);

		subscription.setStatus(SubscriptionStatus.ACTIVE);

		subscription.setPaymentOrderId(payment.getMerchantOrderId());

		subscription.setPaymentTransactionId(phonePeTransactionId);

		subscription.setCancellationRequested(false);

		subscription.setCancelledAt(null);

		UserSubscription savedSubscription = subscriptionRepository.save(subscription);

		
		if (tenantId != null) {

			saasWorkspaceAuthorizationService.activateWorkspace(tenantId, authUserId);
		}

		// --------------------------------------------------------
		// PAYMENT SUCCESS
		// --------------------------------------------------------

		payment.setSubscriptionId(savedSubscription.getId());

		payment.setPaymentStatus(SubscriptionPaymentStatus.SUCCESS);

		if (phonePeTransactionId != null && !phonePeTransactionId.isBlank()) {

			payment.setTransactionId(phonePeTransactionId);
		}

		payment.touch();

		paymentRepository.save(payment);

		// --------------------------------------------------------
		// RESPONSE
		// --------------------------------------------------------

		String message = latestSubscription == null ? "Subscription activated successfully"
				: "Subscription renewal scheduled successfully";

		return new SubscriptionPaymentVerifyResponse(

				true,

				message,

				savedSubscription.getId(),

				payment.getId(),

				payment.getMerchantOrderId(),

				plan.getPlanCode(),

				plan.getPlanName(),

				savedSubscription.getStartDate(),

				savedSubscription.getEndDate());
	}

	// ============================================================
	// CANCEL
	// ============================================================

	@Transactional
	public UserSubscription cancelCurrentSubscription(Long authUserId) {

		return cancelCurrentSubscription(authUserId, null);
	}

	@Transactional
	public UserSubscription cancelCurrentSubscription(Long authUserId, Long tenantId) {

		if (authUserId == null) {

			throw new RuntimeException("User not found");
		}

		tenantId = normalizeTenantId(tenantId);

		if (tenantId != null) {

			validateSaasWorkspaceAccess(authUserId, tenantId);
		}

		LocalDate today = LocalDate.now();

		UserSubscription subscription = subscriptionRepository
				.findCurrentActiveSubscriptionForUpdate(authUserId, tenantId, SubscriptionStatus.ACTIVE, today)
				.orElseThrow(() -> new RuntimeException("No active subscription found."));

		if (Boolean.TRUE.equals(subscription.getCancellationRequested())) {

			return subscription;
		}

		/*
		 * Cancellation means:
		 *
		 * Current paid period remains active. We only mark cancellationRequested.
		 */
		subscription.setCancellationRequested(true);

		subscription.setCancelledAt(LocalDateTime.now());

		subscription.setStatus(SubscriptionStatus.ACTIVE);

		return subscriptionRepository.save(subscription);
	}

	// ============================================================
	// EXPIRY
	// ============================================================

	@Scheduled(cron = "0 5 0 * * *", zone = "Asia/Kolkata")
	@Transactional
	public void scheduledSubscriptionExpiry() {

		expireOldSubscriptions();
	}

	@Transactional
	public int expireOldSubscriptions() {

		LocalDate today = LocalDate.now();

		List<UserSubscription> expiredSubscriptions = subscriptionRepository
				.findExpiredActiveSubscriptions(SubscriptionStatus.ACTIVE, today);

		int updated = 0;

		for (UserSubscription subscription : expiredSubscriptions) {

			subscription.setStatus(SubscriptionStatus.EXPIRED);

			updated++;

			/*
			 * SaaS workspace suspension.
			 */
			if (subscription.getTenantId() != null) {

				saasWorkspaceAuthorizationService.suspendWorkspace(subscription.getTenantId());
			}
		}

		if (updated > 0) {

			subscriptionRepository.saveAll(expiredSubscriptions);

			System.out.println("Expired subscriptions updated: " + updated);
		}

		return updated;
	}

	// ============================================================
	// SAAS AUTHORIZATION
	// ============================================================

	private void validateSaasWorkspaceAccess(Long authUserId, Long tenantId) {

		if (tenantId == null) {
			return;
		}

		saasWorkspaceAuthorizationService.validateWorkspaceAccess(tenantId, authUserId);

	}

	// ============================================================
	// HELPERS
	// ============================================================

	private Long normalizeTenantId(Long tenantId) {

		if (tenantId == null || tenantId <= 0) {

			return null;
		}

		return tenantId;
	}

	private int getSubscriptionDurationDays(BillingCycle billingCycle) {

		if (billingCycle == BillingCycle.MONTHLY) {

			return 30;
		}

		if (billingCycle == BillingCycle.YEARLY) {

			return 365;
		}

		throw new RuntimeException("Unsupported billing cycle");
	}

	private boolean isPhonePePaymentSuccess(String status) {

		if (status == null) {
			return false;
		}

		String normalized = status.trim().toUpperCase();

		return normalized.equals("COMPLETED")
				|| normalized.equals("SUCCESS")
				|| normalized.equals("PAYMENT_SUCCESS")
				|| normalized.equals("PAID")
				|| normalized.equals("SUCCESSFUL");
	}

	private boolean isPhonePePaymentPending(String status) {

		if (status == null) {
			return true;
		}

		String normalized = status.trim().toUpperCase();

		return normalized.equals("PENDING") || normalized.equals("INITIATED") || normalized.equals("PROCESSING")
				|| normalized.equals("IN_PROGRESS") || normalized.equals("PENDING_PAYMENT");
	}
}