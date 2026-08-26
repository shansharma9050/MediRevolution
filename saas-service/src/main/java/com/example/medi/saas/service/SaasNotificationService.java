package com.example.medi.saas.service;

import com.example.medi.saas.dto.ApiResponse;
import com.example.medi.saas.dto.SaasNotificationCountResponse;
import com.example.medi.saas.dto.SaasNotificationRequest;
import com.example.medi.saas.dto.SaasNotificationResponse;
import com.example.medi.saas.entity.SaasNotification;
import com.example.medi.saas.enums.SaasNotificationPriority;
import com.example.medi.saas.enums.SaasNotificationType;
import com.example.medi.saas.enums.SaasPermissionAction;
import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.repository.SaasNotificationRepository;
import com.example.medi.saas.repository.SaasPatientRepository;
import com.example.medi.saas.security.CurrentUserUtil;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class SaasNotificationService {

	private final SaasNotificationRepository notificationRepository;
	private final SaasPatientRepository patientRepository;
	private final TenantAccessService tenantAccessService;
	private final SaasPermissionService permissionService;

	public SaasNotificationService(SaasNotificationRepository notificationRepository,
			SaasPatientRepository patientRepository, TenantAccessService tenantAccessService,
			SaasPermissionService permissionService) {
		this.notificationRepository = notificationRepository;
		this.patientRepository = patientRepository;
		this.tenantAccessService = tenantAccessService;
		this.permissionService = permissionService;
	}

	/*
	 * ========================================================= CREATE NOTIFICATION
	 * =========================================================
	 */

	@Transactional
	public SaasNotificationResponse createNotification(SaasNotificationRequest request) {

		validateRequest(request);

		/*
		 * Patient ko normal notification-create API se notification create karne ki
		 * permission nahi deni.
		 */
		if (isCurrentUserPatient()) {
			throw new RuntimeException("Patient cannot create notifications.");
		}

		permissionService.requirePermission(request.getTenantId(), TenantModule.NOTIFICATIONS,
				SaasPermissionAction.CREATE);

		tenantAccessService.validateTenantAccess(request.getTenantId());

		SaasNotification notification = buildNotification(request);

		return toResponse(notificationRepository.save(notification));
	}

	/*
	 * ========================================================= SYSTEM NOTIFICATION
	 * =========================================================
	 *
	 * Existing internal backend events ke liye.
	 *
	 * Ye tenant-wide notification hai.
	 */

	@Transactional
	public void createSystemNotification(Long tenantId, SaasNotificationType type, SaasNotificationPriority priority,
			String title, String message, Long referenceId, String referenceType, String actionUrl) {

		if (tenantId == null || title == null || title.isBlank()) {

			return;
		}

		SaasNotification notification = new SaasNotification();

		notification.setTenantId(tenantId);

		/*
		 * IMPORTANT: null ka matlab tenant-wide notification.
		 */
		notification.setAuthUserId(null);

		notification.setNotificationType(type == null ? SaasNotificationType.SYSTEM : type);

		notification.setPriority(priority == null ? SaasNotificationPriority.MEDIUM : priority);

		notification.setTitle(title.trim());

		notification.setMessage(clean(message));

		notification.setReferenceId(referenceId);

		notification.setReferenceType(clean(referenceType));

		notification.setActionUrl(clean(actionUrl));

		notification.setReadStatus(false);
		notification.setActive(true);

		notificationRepository.save(notification);
	}

	/*
	 * ========================================================= PATIENT-SPECIFIC
	 * SYSTEM NOTIFICATION =========================================================
	 *
	 * Appointment, payment, doctor confirmation etc. ke liye use karein.
	 */

	@Transactional
	public void createPatientNotification(Long tenantId, Long patientAuthUserId, SaasNotificationType type,
			SaasNotificationPriority priority, String title, String message, Long referenceId, String referenceType,
			String actionUrl) {

		if (tenantId == null || patientAuthUserId == null || title == null || title.isBlank()) {

			return;
		}

		/*
		 * Ensure patient actually belongs to workspace.
		 */
		boolean patientExists = patientRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, patientAuthUserId)
				.isPresent();

		if (!patientExists) {
			return;
		}

		SaasNotification notification = new SaasNotification();

		notification.setTenantId(tenantId);

		notification.setAuthUserId(patientAuthUserId);

		notification.setNotificationType(type == null ? SaasNotificationType.SYSTEM : type);

		notification.setPriority(priority == null ? SaasNotificationPriority.MEDIUM : priority);

		notification.setTitle(title.trim());

		notification.setMessage(clean(message));

		notification.setReferenceId(referenceId);

		notification.setReferenceType(clean(referenceType));

		notification.setActionUrl(clean(actionUrl));

		notification.setReadStatus(false);
		notification.setActive(true);

		notificationRepository.save(notification);
	}

	/*
	 * ========================================================= ALL NOTIFICATIONS
	 * =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasNotificationResponse> getNotifications(Long tenantId) {

		requireValidTenantId(tenantId);

		if (isCurrentUserPatient()) {

			Long authUserId = getCurrentAuthUserId();

			validatePatientWorkspaceAssignment(tenantId, authUserId);

			return notificationRepository
					.findByTenantIdAndAuthUserIdAndActiveTrueOrderByCreatedAtDesc(tenantId, authUserId).stream()
					.map(this::toResponse).toList();
		}

		/*
		 * Normal SaaS user.
		 */
		permissionService.requirePermission(tenantId, TenantModule.NOTIFICATIONS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		return notificationRepository.findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenantId).stream()
				.map(this::toResponse).toList();
	}

	/*
	 * ========================================================= UNREAD
	 * NOTIFICATIONS =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasNotificationResponse> getUnreadNotifications(Long tenantId) {

		requireValidTenantId(tenantId);

		if (isCurrentUserPatient()) {

			Long authUserId = getCurrentAuthUserId();

			validatePatientWorkspaceAssignment(tenantId, authUserId);

			return notificationRepository
					.findByTenantIdAndAuthUserIdAndReadStatusFalseAndActiveTrueOrderByCreatedAtDesc(tenantId,
							authUserId)
					.stream().map(this::toResponse).toList();
		}

		permissionService.requirePermission(tenantId, TenantModule.NOTIFICATIONS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		return notificationRepository.findByTenantIdAndReadStatusFalseAndActiveTrueOrderByCreatedAtDesc(tenantId)
				.stream().map(this::toResponse).toList();
	}

	/*
	 * ========================================================= NOTIFICATIONS BY
	 * TYPE =========================================================
	 */

	@Transactional(readOnly = true)
	public List<SaasNotificationResponse> getNotificationsByType(Long tenantId, String type) {

		requireValidTenantId(tenantId);

		if (type == null || type.isBlank()) {

			throw new RuntimeException("Notification type is required.");
		}

		SaasNotificationType notificationType;

		try {

			notificationType = SaasNotificationType.valueOf(type.trim().toUpperCase(Locale.ROOT));

		} catch (IllegalArgumentException exception) {

			throw new RuntimeException("Invalid notification type: " + type);
		}

		if (isCurrentUserPatient()) {

			Long authUserId = getCurrentAuthUserId();

			validatePatientWorkspaceAssignment(tenantId, authUserId);

			return notificationRepository
					.findByTenantIdAndAuthUserIdAndNotificationTypeAndActiveTrueOrderByCreatedAtDesc(tenantId,
							authUserId, notificationType)
					.stream().map(this::toResponse).toList();
		}

		permissionService.requirePermission(tenantId, TenantModule.NOTIFICATIONS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		return notificationRepository
				.findByTenantIdAndNotificationTypeAndActiveTrueOrderByCreatedAtDesc(tenantId, notificationType).stream()
				.map(this::toResponse).toList();
	}

	/*
	 * ========================================================= UNREAD COUNT
	 * =========================================================
	 *
	 * Aapka current 400 error yahin solve hoga.
	 */

	@Transactional(readOnly = true)
	public SaasNotificationCountResponse getUnreadCount(Long tenantId) {

		requireValidTenantId(tenantId);

		if (isCurrentUserPatient()) {

			Long authUserId = getCurrentAuthUserId();

			/*
			 * Patient ko tenant member ki tarah validate mat karo.
			 *
			 * Instead saas_patients relation check karo.
			 */
			validatePatientWorkspaceAssignment(tenantId, authUserId);

			Long count = notificationRepository.countByTenantIdAndAuthUserIdAndReadStatusFalseAndActiveTrue(tenantId,
					authUserId);

			return new SaasNotificationCountResponse(count);
		}

		/*
		 * Normal SaaS user.
		 */
		permissionService.requirePermission(tenantId, TenantModule.NOTIFICATIONS, SaasPermissionAction.VIEW);

		tenantAccessService.validateTenantAccess(tenantId);

		Long count = notificationRepository.countByTenantIdAndReadStatusFalseAndActiveTrue(tenantId);

		return new SaasNotificationCountResponse(count);
	}

	/*
	 * ========================================================= MARK READ
	 * =========================================================
	 */

	@Transactional
	public SaasNotificationResponse markRead(Long tenantId, Long notificationId) {

		requireValidTenantId(tenantId);

		if (notificationId == null) {
			throw new RuntimeException("Notification id is required.");
		}

		SaasNotification notification;

		if (isCurrentUserPatient()) {

			Long authUserId = getCurrentAuthUserId();

			validatePatientWorkspaceAssignment(tenantId, authUserId);

			notification = notificationRepository
					.findByIdAndTenantIdAndAuthUserIdAndActiveTrue(notificationId, tenantId, authUserId)
					.orElseThrow(() -> new RuntimeException("Notification not found."));

		} else {

			permissionService.requirePermission(tenantId, TenantModule.NOTIFICATIONS, SaasPermissionAction.UPDATE);

			tenantAccessService.validateTenantAccess(tenantId);

			notification = notificationRepository.findByIdAndTenantIdAndActiveTrue(notificationId, tenantId)
					.orElseThrow(() -> new RuntimeException("Notification not found."));
		}

		notification.setReadStatus(true);
		notification.setReadAt(LocalDateTime.now());

		return toResponse(notificationRepository.save(notification));
	}

	/*
	 * ========================================================= MARK ALL READ
	 * =========================================================
	 */

	@Transactional
	public ApiResponse markAllRead(Long tenantId) {

		requireValidTenantId(tenantId);

		List<SaasNotification> notifications;

		if (isCurrentUserPatient()) {

			Long authUserId = getCurrentAuthUserId();

			validatePatientWorkspaceAssignment(tenantId, authUserId);

			notifications = notificationRepository
					.findByTenantIdAndAuthUserIdAndReadStatusFalseAndActiveTrueOrderByCreatedAtDesc(tenantId,
							authUserId);

		} else {

			permissionService.requirePermission(tenantId, TenantModule.NOTIFICATIONS, SaasPermissionAction.UPDATE);

			tenantAccessService.validateTenantAccess(tenantId);

			notifications = notificationRepository
					.findByTenantIdAndReadStatusFalseAndActiveTrueOrderByCreatedAtDesc(tenantId);
		}

		LocalDateTime now = LocalDateTime.now();

		for (SaasNotification notification : notifications) {

			notification.setReadStatus(true);
			notification.setReadAt(now);
		}

		notificationRepository.saveAll(notifications);

		return new ApiResponse(true, "All notifications marked as read");
	}

	/*
	 * ========================================================= DELETE
	 * =========================================================
	 */

	@Transactional
	public ApiResponse deleteNotification(Long tenantId, Long notificationId) {

		requireValidTenantId(tenantId);

		if (notificationId == null) {
			throw new RuntimeException("Notification id is required.");
		}

		SaasNotification notification;

		if (isCurrentUserPatient()) {

			Long authUserId = getCurrentAuthUserId();

			validatePatientWorkspaceAssignment(tenantId, authUserId);

			notification = notificationRepository
					.findByIdAndTenantIdAndAuthUserIdAndActiveTrue(notificationId, tenantId, authUserId)
					.orElseThrow(() -> new RuntimeException("Notification not found."));

		} else {

			permissionService.requirePermission(tenantId, TenantModule.NOTIFICATIONS, SaasPermissionAction.DELETE);

			tenantAccessService.validateTenantAccess(tenantId);

			notification = notificationRepository.findByIdAndTenantIdAndActiveTrue(notificationId, tenantId)
					.orElseThrow(() -> new RuntimeException("Notification not found."));
		}

		notification.setActive(false);

		notificationRepository.save(notification);

		return new ApiResponse(true, "Notification deleted successfully");
	}

	/*
	 * ========================================================= CREATE SYSTEM
	 * NOTIFICATION IF NOT EXISTS
	 * =========================================================
	 */

	@Transactional
	public void createSystemNotificationIfNotExists(Long tenantId, SaasNotificationType type,
			SaasNotificationPriority priority, String title, String message, Long referenceId, String referenceType,
			String actionUrl) {

		if (tenantId == null || title == null || title.isBlank()) {

			return;
		}

		SaasNotificationType notificationType = type == null ? SaasNotificationType.SYSTEM : type;

		if (referenceId != null && referenceType != null && !referenceType.isBlank()) {

			boolean exists = notificationRepository
					.existsByTenantIdAndNotificationTypeAndReferenceIdAndReferenceTypeAndReadStatusFalseAndActiveTrue(
							tenantId, notificationType, referenceId, referenceType);

			if (exists) {
				return;
			}
		}

		createSystemNotification(tenantId, notificationType, priority, title, message, referenceId, referenceType,
				actionUrl);
	}

	/*
	 * ========================================================= PATIENT
	 * NOTIFICATION IF NOT EXISTS
	 * =========================================================
	 */

	@Transactional
	public void createPatientNotificationIfNotExists(Long tenantId, Long patientAuthUserId, SaasNotificationType type,
			SaasNotificationPriority priority, String title, String message, Long referenceId, String referenceType,
			String actionUrl) {

		if (tenantId == null || patientAuthUserId == null || title == null || title.isBlank()) {

			return;
		}

		SaasNotificationType notificationType = type == null ? SaasNotificationType.SYSTEM : type;

		/*
		 * Duplicate check is patient-specific here.
		 */
		if (referenceId != null && referenceType != null && !referenceType.isBlank()) {

			boolean exists = notificationRepository
					.findByTenantIdAndAuthUserIdAndActiveTrueOrderByCreatedAtDesc(tenantId, patientAuthUserId).stream()
					.anyMatch(notification -> notification.getNotificationType() == notificationType
							&& referenceId.equals(notification.getReferenceId())
							&& referenceType.equalsIgnoreCase(notification.getReferenceType())
							&& !Boolean.TRUE.equals(notification.getReadStatus()));

			if (exists) {
				return;
			}
		}

		createPatientNotification(tenantId, patientAuthUserId, notificationType, priority, title, message, referenceId,
				referenceType, actionUrl);
	}

	/*
	 * ========================================================= VALIDATION
	 * =========================================================
	 */

	private void validateRequest(SaasNotificationRequest request) {

		if (request == null) {
			throw new RuntimeException("Notification request is required.");
		}

		if (request.getTenantId() == null) {
			throw new RuntimeException("tenantId is required");
		}

		if (request.getTitle() == null || request.getTitle().isBlank()) {

			throw new RuntimeException("Notification title is required");
		}
	}

	private void requireValidTenantId(Long tenantId) {

		if (tenantId == null || tenantId <= 0) {

			throw new RuntimeException("Valid workspace is required.");
		}
	}

	/*
	 * ========================================================= PATIENT VALIDATION
	 * =========================================================
	 */

	private void validatePatientWorkspaceAssignment(Long tenantId, Long authUserId) {

		if (authUserId == null) {
			throw new RuntimeException("Logged-in user ID not found.");
		}

		patientRepository.findByTenantIdAndAuthUserIdAndActiveTrue(tenantId, authUserId)
				.orElseThrow(() -> new RuntimeException("Patient is not assigned to this workspace."));
	}

	private Long getCurrentAuthUserId() {

		Long authUserId = CurrentUserUtil.getUserId();

		if (authUserId == null) {
			throw new RuntimeException("Logged-in user ID not found.");
		}

		return authUserId;
	}

	private boolean isCurrentUserPatient() {

		String role = CurrentUserUtil.getRole();

		if (role == null) {
			return false;
		}

		String normalized = role.trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", "");

		return "PATIENT".equals(normalized);
	}

	/*
	 * ========================================================= BUILD NOTIFICATION
	 * =========================================================
	 */

	private SaasNotification buildNotification(SaasNotificationRequest request) {

		SaasNotification notification = new SaasNotification();

		notification.setTenantId(request.getTenantId());

		notification.setAuthUserId(request.getAuthUserId());

		notification.setNotificationType(parseNotificationType(request.getNotificationType()));

		notification.setPriority(parsePriority(request.getPriority()));

		notification.setTitle(request.getTitle().trim());

		notification.setMessage(clean(request.getMessage()));

		notification.setReferenceId(request.getReferenceId());

		notification.setReferenceType(clean(request.getReferenceType()));

		notification.setActionUrl(clean(request.getActionUrl()));

		notification.setReadStatus(false);
		notification.setActive(true);

		return notification;
	}

	private SaasNotificationType parseNotificationType(String type) {

		if (type == null || type.isBlank()) {

			return SaasNotificationType.SYSTEM;
		}

		try {

			return SaasNotificationType.valueOf(type.trim().toUpperCase(Locale.ROOT));

		} catch (IllegalArgumentException ex) {

			throw new RuntimeException("Invalid notification type: " + type);
		}
	}

	private SaasNotificationPriority parsePriority(String priority) {

		if (priority == null || priority.isBlank()) {

			return SaasNotificationPriority.MEDIUM;
		}

		try {

			return SaasNotificationPriority.valueOf(priority.trim().toUpperCase(Locale.ROOT));

		} catch (IllegalArgumentException ex) {

			throw new RuntimeException("Invalid notification priority: " + priority);
		}
	}

	/*
	 * ========================================================= RESPONSE
	 * =========================================================
	 */

	private SaasNotificationResponse toResponse(SaasNotification notification) {

		return new SaasNotificationResponse(notification.getId(), notification.getTenantId(),
				notification.getAuthUserId(), notification.getNotificationType().name(),
				notification.getPriority().name(), notification.getTitle(), notification.getMessage(),
				notification.getReferenceId(), notification.getReferenceType(), notification.getActionUrl(),
				notification.getReadStatus(), notification.getReadAt(), notification.getCreatedAt());
	}

	/*
	 * ========================================================= CLEAN STRING
	 * =========================================================
	 */

	private String clean(String value) {

		if (value == null) {
			return null;
		}

		String cleaned = value.trim();

		return cleaned.isBlank() ? null : cleaned;
	}
}