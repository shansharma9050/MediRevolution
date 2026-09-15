"use strict";

/*
 * ============================================================
 * APPOINTMENT LIFECYCLE EXTENSION
 * ============================================================
 *
 * Loaded AFTER saas-appointments.js.
 *
 * Existing booking/filter/modal functionality remains unchanged.
 */


appointmentPermissions.cancel =
	Boolean(
		appointmentPermissions.cancel
	);


/*
 * ============================================================
 * PERMISSIONS
 * ============================================================
 */

async function loadAppointmentPermissions() {

	const results =
		await Promise.all([
			hasSaasPermission(
				"APPOINTMENTS",
				"CREATE"
			),

			hasSaasPermission(
				"APPOINTMENTS",
				"UPDATE"
			),

			hasSaasPermission(
				"APPOINTMENTS",
				"DELETE"
			),

			hasSaasPermission(
				"APPOINTMENTS",
				"APPROVE"
			),

			hasSaasPermission(
				"APPOINTMENTS",
				"CANCEL"
			)
		]);


	appointmentPermissions = {

		create:
			Boolean(
				results[0]
			),

		update:
			Boolean(
				results[1]
			),

		delete:
			Boolean(
				results[2]
			),

		approve:
			Boolean(
				results[3]
			),

		cancel:
			Boolean(
				results[4]
			)
	};


	applyAppointmentButtonPermissions();
}


/*
 * ============================================================
 * ACTION BUTTONS
 * ============================================================
 */

function getActionButtons(
	appointment,
	appointmentId
) {

	if (!appointmentId) {
		return "-";
	}


	const status =
		String(
			appointment.status || ""
		)
			.toUpperCase();


	const appointmentType =
		String(
			appointment.appointmentType || ""
		)
			.toUpperCase();


	const paymentStatus =
		String(
			appointment.paymentStatus || ""
		)
			.toUpperCase();


	const meetingUrl =
		getSafeHttpUrl(
			appointment.meetingUrl
		);


	let html = "";


	/*
	 * =====================================================
	 * REQUESTED / PENDING
	 * =====================================================
	 */

	if (
		status === "REQUESTED" ||
		status === "PENDING"
	) {

		html += `
			<button
				type="button"
				class="btn btn-sm btn-outline-success confirm-appointment-btn"
				onclick="updateStatus(${appointmentId}, 'CONFIRMED')">

				<i class="bi bi-check2-circle me-1"></i>
				Confirm

			</button>

			<button
				type="button"
				class="btn btn-sm btn-outline-warning reject-appointment-btn"
				onclick="updateStatus(${appointmentId}, 'REJECTED')">

				<i class="bi bi-x-circle me-1"></i>
				Reject

			</button>

			<button
				type="button"
				class="btn btn-sm btn-outline-danger cancel-appointment-btn"
				onclick="updateStatus(${appointmentId}, 'CANCELLED')">

				<i class="bi bi-calendar-x me-1"></i>
				Cancel

			</button>
		`;
	}


	/*
	 * =====================================================
	 * PAYMENT PENDING
	 * =====================================================
	 */

	if (
		status === "PAYMENT_PENDING"
	) {

		html += `
			<span class="badge bg-warning text-dark">

				<i class="bi bi-credit-card-fill me-1"></i>
				Payment Pending

			</span>
		`;
	}


	/*
	 * =====================================================
	 * PAYMENT FAILED
	 * =====================================================
	 */

	if (
		status === "PAYMENT_FAILED"
	) {

		html += `
			<span class="badge bg-danger">

				<i class="bi bi-x-circle-fill me-1"></i>
				Payment Failed

			</span>
		`;
	}


	/*
	 * =====================================================
	 * CONFIRMED
	 * =====================================================
	 */

	if (
		status === "CONFIRMED"
	) {

		html += `
			<button
				type="button"
				class="btn btn-sm btn-primary start-consultation-btn"
				onclick="updateStatus(${appointmentId}, 'IN_CONSULTATION')">

				<i class="bi bi-play-circle-fill me-1"></i>
				Start Consultation

			</button>
		`;


		if (
			appointmentType === "ONLINE" &&
			meetingUrl
		) {

			html += `
				<a
					href="${escapeAttribute(meetingUrl)}"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-sm btn-outline-success">

					<i class="bi bi-camera-video-fill me-1"></i>
					Join Meeting

				</a>
			`;
		}


		if (
			appointmentType === "ONLINE" &&
			paymentStatus === "SUCCESS"
		) {

			html += `
				<span
					class="badge bg-light text-muted border"
					title="Refund workflow is required before cancelling a paid online consultation">

					<i class="bi bi-shield-lock-fill me-1"></i>
					Paid

				</span>
			`;


		} else {

			html += `
				<button
					type="button"
					class="btn btn-sm btn-outline-danger cancel-appointment-btn"
					onclick="updateStatus(${appointmentId}, 'CANCELLED')">

					<i class="bi bi-calendar-x me-1"></i>
					Cancel

				</button>
			`;
		}
	}


	/*
	 * =====================================================
	 * IN CONSULTATION
	 * =====================================================
	 */

	if (
		status === "IN_CONSULTATION"
	) {

		if (
			appointmentType === "ONLINE" &&
			meetingUrl
		) {

			html += `
				<a
					href="${escapeAttribute(meetingUrl)}"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-sm btn-primary">

					<i class="bi bi-camera-video-fill me-1"></i>
					Rejoin Meeting

				</a>
			`;
		}


		html += `
			<button
				type="button"
				class="btn btn-sm btn-outline-success complete-appointment-btn"
				onclick="updateStatus(${appointmentId}, 'COMPLETED')">

				<i class="bi bi-clipboard2-check me-1"></i>
				Complete Consultation

			</button>
		`;
	}


	/*
	 * =====================================================
	 * EDIT
	 * =====================================================
	 *
	 * Successfully paid online appointments are not editable
	 * after confirmation because doctor/date changes could make
	 * payment and meeting data inconsistent.
	 */

	const editable =
		status === "REQUESTED" ||
		status === "PENDING" ||
		(
			status === "CONFIRMED" &&
			paymentStatus !== "SUCCESS"
		);


	if (editable) {

		html += `
			<button
				type="button"
				class="btn btn-sm btn-outline-primary edit-appointment-btn"
				onclick="editAppointment(${appointmentId})">

				<i class="bi bi-pencil-square me-1"></i>
				Edit

			</button>
		`;
	}


	return html || "-";
}


/*
 * ============================================================
 * STATUS UPDATE
 * ============================================================
 */

async function updateStatus(
	appointmentId,
	status
) {

	const normalizedStatus =
		String(
			status || ""
		)
			.trim()
			.toUpperCase();


	if (!appointmentId) {

		showMsg(
			"Appointment ID is required."
		);

		return;
	}


	const requiresApproval =
		normalizedStatus === "CONFIRMED" ||
		normalizedStatus === "REJECTED";


	const requiresUpdate =
		normalizedStatus === "IN_CONSULTATION" ||
		normalizedStatus === "COMPLETED";


	const requiresCancel =
		normalizedStatus === "CANCELLED";


	if (
		requiresApproval &&
		!appointmentPermissions.approve
	) {

		showMsg(
			"You do not have approval permission."
		);

		return;
	}


	if (
		requiresUpdate &&
		!appointmentPermissions.update
	) {

		showMsg(
			"You do not have update permission."
		);

		return;
	}


	if (
		requiresCancel &&
		!appointmentPermissions.cancel
	) {

		showMsg(
			"You do not have cancel permission."
		);

		return;
	}


	const actionLabels = {

		CONFIRMED:
			"confirm this appointment",

		REJECTED:
			"reject this appointment",

		IN_CONSULTATION:
			"start this consultation",

		COMPLETED:
			"complete this consultation",

		CANCELLED:
			"cancel this appointment"
	};


	const actionText =
		actionLabels[
			normalizedStatus
		]
		||
		`change appointment status to ${normalizedStatus}`;


	if (
		!window.confirm(
			`Are you sure you want to ${actionText}?`
		)
	) {

		return;
	}


	const token =
		localStorage.getItem(
			"token"
		);


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	if (
		!token ||
		!tenantId
	) {

		showMsg(
			"Login or SaaS workspace is missing."
		);

		return;
	}


	try {

		const query =
			new URLSearchParams({

				tenantId:
					tenantId,

				status:
					normalizedStatus
			});


		const response =
			await fetch(

				`${API_BASE}/saas/appointments/${encodeURIComponent(
					appointmentId
				)}/status?${query.toString()}`,

				{
					method:
						"PUT",

					headers: {

						"Authorization":
							"Bearer " + token,

						"Accept":
							"application/json"
					}
				}
			);


		const result =
			await safeJson(
				response
			);


		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to update appointment status."
				)
			);

			return;
		}


		showMsg(
			getLifecycleSuccessMessage(
				normalizedStatus
			),
			"success"
		);


		await loadAppointments();


	} catch (error) {

		console.error(
			"Appointment lifecycle update failed:",
			error
		);


		showMsg(
			"SaaS appointment service is not reachable."
		);
	}
}


/*
 * ============================================================
 * BUTTON PERMISSIONS
 * ============================================================
 */

function applyAppointmentButtonPermissions() {

	showOrHideById(
		"addAppointmentBtn",
		appointmentPermissions.create
	);


	showOrHideByClass(
		"edit-appointment-btn",
		appointmentPermissions.update
	);


	showOrHideByClass(
		"confirm-appointment-btn",
		appointmentPermissions.approve
	);


	showOrHideByClass(
		"reject-appointment-btn",
		appointmentPermissions.approve
	);


	showOrHideByClass(
		"start-consultation-btn",
		appointmentPermissions.update
	);


	showOrHideByClass(
		"complete-appointment-btn",
		appointmentPermissions.update
	);


	showOrHideByClass(
		"cancel-appointment-btn",
		appointmentPermissions.cancel
	);
}


/*
 * ============================================================
 * SUCCESS MESSAGE
 * ============================================================
 */

function getLifecycleSuccessMessage(
	status
) {

	switch (
		String(
			status || ""
		)
			.toUpperCase()
	) {

		case "CONFIRMED":
			return "Appointment confirmed successfully.";

		case "REJECTED":
			return "Appointment rejected successfully.";

		case "IN_CONSULTATION":
			return "Consultation started successfully.";

		case "COMPLETED":
			return "Consultation completed successfully.";

		case "CANCELLED":
			return "Appointment cancelled successfully.";

		default:
			return "Appointment updated successfully.";
	}
}