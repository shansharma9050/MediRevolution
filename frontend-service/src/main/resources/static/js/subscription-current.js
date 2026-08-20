'use strict';

/* ============================================================
   PLATFORM CURRENT SUBSCRIPTION
   MediRevolution
   Platform-Level Subscription
============================================================ */

let isLoadingCurrentSubscription = false;
let isCancellingSubscription = false;


/* ============================================================
   PAGE INIT
============================================================ */

document.addEventListener(
	'DOMContentLoaded',
	async function() {

		/*
		 * --------------------------------------------------------
		 * TOKEN
		 * --------------------------------------------------------
		 */

		const token =
			localStorage.getItem('token');


		if (!token) {

			resetSubscriptionSummary();

			clearSubscriptionExpiryWarning();

			renderNoSubscription(
				'Login token not found. Please login again.'
			);

			showMsg(
				'Login token not found. Please login again.'
			);

			return;
		}


		/*
		 * --------------------------------------------------------
		 * ROLE
		 * --------------------------------------------------------
		 */

		if (!requireSubscriptionRole()) {
			return;
		}


		/*
		 * --------------------------------------------------------
		 * LOAD CURRENT PLATFORM SUBSCRIPTION
		 * --------------------------------------------------------
		 */

		await loadCurrentSubscription();

	}
);


/* ============================================================
   ROLE VALIDATION
============================================================ */

function requireSubscriptionRole() {

	const role =
		normalizeRole(
			localStorage.getItem('role')
		);


	const allowedRoles = [
		'WHOLESALER',
		'DOCTOR',
		'HOSPITAL'
	];


	if (
		!allowedRoles.includes(role)
	) {

		showMsg(
			'Subscription is available only for Wholesaler, Doctor and Hospital.'
		);


		showSubscriptionErrorState(
			'Subscription is not available for your current role.'
		);


		return false;
	}


	return true;
}


/* ============================================================
   NORMALIZE ROLE
============================================================ */

function normalizeRole(role) {

	return String(
		role || ''
	)
		.trim()
		.toUpperCase();
}


/* ============================================================
   LOAD CURRENT PLATFORM SUBSCRIPTION
============================================================ */

async function loadCurrentSubscription() {

	if (isLoadingCurrentSubscription) {
		return;
	}


	isLoadingCurrentSubscription = true;


	const token =
		localStorage.getItem('token');


	clearMessage();

	clearSubscriptionExpiryWarning();

	showSubscriptionLoadingState();


	if (!token) {

		const message =
			'Login token not found. Please login again.';


		resetSubscriptionSummary();

		renderNoSubscription(
			message
		);

		showMsg(
			message
		);


		isLoadingCurrentSubscription = false;

		return;
	}


	try {

		/*
		 * =======================================================
		 * IMPORTANT:
		 *
		 * Platform subscription request.
		 *
		 * DO NOT send tenantId.
		 *
		 * Backend receives:
		 *
		 * tenantId = null
		 *
		 * Therefore repository searches:
		 *
		 * s.tenantId IS NULL
		 *
		 * =======================================================
		 */

		const response =
			await fetch(
				`${API_BASE}/billing/subscriptions/current`,
				{
					method: 'GET',

					headers: {

						'Authorization':
							'Bearer ' + token,

						'Accept':
							'application/json'
					}
				}
			);


		const result =
			await safeJson(response);


		/*
		 * -------------------------------------------------------
		 * NO ACTIVE SUBSCRIPTION
		 * -------------------------------------------------------
		 */

		if (!response.ok) {

			const message =
				getApiErrorMessage(
					result,
					'No active subscription found.'
				);


			resetSubscriptionSummary();

			clearSubscriptionExpiryWarning();


			renderNoSubscription(
				message
			);


			return;
		}


		/*
		 * -------------------------------------------------------
		 * INVALID / EMPTY RESPONSE
		 * -------------------------------------------------------
		 */

		if (
			!result ||
			typeof result !== 'object' ||
			Array.isArray(result) ||
			Object.keys(result).length === 0
		) {

			resetSubscriptionSummary();

			clearSubscriptionExpiryWarning();


			renderNoSubscription(
				'No active subscription found.'
			);


			return;
		}


		/*
		 * -------------------------------------------------------
		 * RENDER
		 * -------------------------------------------------------
		 */

		renderSubscription(
			result
		);


		updateSubscriptionSummary(
			result
		);


		/*
		 * -------------------------------------------------------
		 * EXPIRY WARNING
		 * -------------------------------------------------------
		 */

		renderSubscriptionExpiryWarning(
			result
		);


	} catch (error) {

		console.error(
			'Unable to load platform subscription:',
			error
		);


		resetSubscriptionSummary();

		clearSubscriptionExpiryWarning();


		showSubscriptionErrorState(
			'Billing service not reachable.'
		);


		showMsg(
			'Billing service not reachable.'
		);


	} finally {

		isLoadingCurrentSubscription = false;
	}
}


/* ============================================================
   RENDER CURRENT SUBSCRIPTION
============================================================ */

function renderSubscription(
	subscription
) {

	const subscriptionBox =
		document.getElementById(
			'subscriptionBox'
		);


	if (!subscriptionBox) {
		return;
	}


	const plan =
		subscription.plan &&
			typeof subscription.plan === 'object'
			? subscription.plan
			: {};


	/*
	 * ----------------------------------------------------------
	 * VALUES
	 * ----------------------------------------------------------
	 */

	const planName =
		getSubscriptionValue(
			subscription.planName,
			plan.planName
		);


	const planCode =
		getSubscriptionValue(
			subscription.planCode,
			plan.planCode
		);


	const status =
		getSubscriptionValue(
			subscription.status,
			subscription.subscriptionStatus,
			'ACTIVE'
		);


	const billingCycle =
		getSubscriptionValue(
			subscription.billingCycle,
			plan.billingCycle
		);


	const startDate =
		getSubscriptionValue(
			subscription.startDate
		);


	const endDate =
		getSubscriptionValue(
			subscription.endDate
		);


	const role =
		getSubscriptionValue(
			subscription.role,
			plan.role,
			normalizeRole(
				localStorage.getItem('role')
			)
		);


	/*
	 * ----------------------------------------------------------
	 * BENEFITS
	 * ----------------------------------------------------------
	 */

	const onlineConsultation =
		subscription.onlineConsultationEnabled ??
		subscription.videoConsultationAllowed ??
		plan.onlineConsultationEnabled ??
		plan.videoConsultationAllowed ??
		false;


	const reportsEnabled =
		subscription.reportsEnabled ??
		plan.reportsEnabled ??
		false;


	const prioritySupport =
		subscription.prioritySupportEnabled ??
		plan.prioritySupportEnabled ??
		false;


	/*
	 * ----------------------------------------------------------
	 * CANCELLATION
	 * ----------------------------------------------------------
	 */

	const cancellationRequested =
		Boolean(
			subscription.cancellationRequested
		);


	/*
	 * ----------------------------------------------------------
	 * NORMALIZED STATUS
	 * ----------------------------------------------------------
	 */

	const normalizedStatus =
		String(status)
			.trim()
			.toUpperCase();


	const activeStatus =
		normalizedStatus === 'ACTIVE';


	let displayStatus =
		normalizedStatus;


	let statusClass =
		activeStatus
			? 'active'
			: 'inactive';


	let statusIcon =
		activeStatus
			? 'bi-check-circle-fill'
			: 'bi-x-circle-fill';


	/*
	 * ----------------------------------------------------------
	 * CANCELLATION REQUESTED
	 * ----------------------------------------------------------
	 */

	if (
		activeStatus &&
		cancellationRequested
	) {

		displayStatus =
			'CANCELLATION REQUESTED';


		statusClass =
			'warning';


		statusIcon =
			'bi-hourglass-split';
	}


	/*
	 * ----------------------------------------------------------
	 * CANCELLATION BUTTON
	 * ----------------------------------------------------------
	 */

	let cancellationButtonHtml =
		'';


	if (activeStatus) {

		if (cancellationRequested) {

			cancellationButtonHtml = `

				<button
					type="button"
					class="
						btn
						btn-outline-warning
					"
					disabled>

					<i class="
						bi
						bi-hourglass-split
						me-1
					"></i>

					Cancellation Requested

				</button>
			`;

		} else {

			cancellationButtonHtml = `

				<button
					type="button"
					id="cancelSubscriptionBtn"
					class="
						btn
						btn-outline-danger
					"
					onclick="cancelSubscription()">

					<i class="
						bi
						bi-x-circle-fill
						me-1
					"></i>

					Cancel Subscription

				</button>
			`;
		}
	}


	/*
	 * ----------------------------------------------------------
	 * CANCELLATION NOTICE
	 * ----------------------------------------------------------
	 */

	let cancellationNoticeHtml =
		'';


	if (
		activeStatus &&
		cancellationRequested
	) {

		cancellationNoticeHtml = `

			<div
				class="
					alert
					alert-warning
					subscription-cancellation-notice
				"
				role="alert">

				<div
					class="
						d-flex
						align-items-start
						gap-2
					">

					<i class="
						bi
						bi-info-circle-fill
						flex-shrink-0
						mt-1
					"></i>


					<div>

						<strong>
							Cancellation requested
						</strong>


						<div class="
							small
							mt-1
						">

							Your current subscription
							remains active until

							<strong>
								${escapeHtml(endDate)}
							</strong>.

							You can continue using your
							current plan until that date.

						</div>

					</div>

				</div>

			</div>
		`;
	}


	/*
	 * ----------------------------------------------------------
	 * PLATFORM INFORMATION
	 * ----------------------------------------------------------
	 */

	const platformScope =
		'Platform Subscription';


	/*
	 * ----------------------------------------------------------
	 * LIMITS
	 * ----------------------------------------------------------
	 */

	const maxMedicines =
		getPlanLimit(
			subscription,
			plan,
			'maxMedicines',
			'max_medicines'
		);


	const maxAppointments =
		getPlanLimit(
			subscription,
			plan,
			'maxAppointments',
			'max_appointments'
		);


	const maxStaff =
		getPlanLimit(
			subscription,
			plan,
			'maxStaff',
			'max_staff'
		);


	/*
	 * ----------------------------------------------------------
	 * FINAL HTML
	 * ----------------------------------------------------------
	 */

	subscriptionBox.innerHTML = `

		<section
			class="
				subscription-current-card
			">


			<!-- ================================================
			     HEADER
			================================================= -->

			<div
				class="
					subscription-current-header
				">


				<div>

					<span
						class="
							subscription-current-active-badge
						">

						<i class="
							bi
							bi-award-fill
						"></i>

						Current Plan

					</span>


					<h2>
						${safe(planName)}
					</h2>


					<p>
						${safe(planCode)}
					</p>

				</div>


				<span
					class="
						subscription-current-status
						${statusClass}
					">

					<i class="
						bi
						${statusIcon}
					"></i>

					${escapeHtml(displayStatus)}

				</span>

			</div>


			<!-- ================================================
			     INFORMATION
			================================================= -->

			<div
				class="
					subscription-current-info-grid
				">


				<div
					class="
						subscription-current-info-item
					">

					<span>
						Subscription Scope
					</span>

					<strong>
						${escapeHtml(platformScope)}
					</strong>

				</div>


				<div
					class="
						subscription-current-info-item
					">

					<span>
						Role
					</span>

					<strong>
						${safe(role)}
					</strong>

				</div>


				<div
					class="
						subscription-current-info-item
					">

					<span>
						Billing Cycle
					</span>

					<strong>
						${safe(billingCycle)}
					</strong>

				</div>


				<div
					class="
						subscription-current-info-item
					">

					<span>
						Valid Until
					</span>

					<strong>
						${safe(endDate)}
					</strong>

				</div>

			</div>


			<!-- ================================================
			     SECONDARY INFORMATION
			================================================= -->

			<div
				class="
					subscription-current-info-grid
				">


				<div
					class="
						subscription-current-info-item
					">

					<span>
						Start Date
					</span>

					<strong>
						${safe(startDate)}
					</strong>

				</div>


				<div
					class="
						subscription-current-info-item
					">

					<span>
						Status
					</span>

					<strong>
						${escapeHtml(displayStatus)}
					</strong>

				</div>


				<div
					class="
						subscription-current-info-item
					">

					<span>
						Max Medicines
					</span>

					<strong>
						${maxMedicines > 0
			? escapeHtml(maxMedicines)
			: '-'}
					</strong>

				</div>


				<div
					class="
						subscription-current-info-item
					">

					<span>
						Max Appointments
					</span>

					<strong>
						${maxAppointments > 0
			? escapeHtml(maxAppointments)
			: '-'}
					</strong>

				</div>

			</div>


			<!-- ================================================
			     BENEFITS
			================================================= -->

			<div
				class="
					subscription-current-benefits
				">

				<h5>
					Plan Benefits
				</h5>


				<div
					class="
						subscription-current-benefit-list
					">


					${renderBenefitItem(
				'Online Consultation',
				onlineConsultation,
				'bi-camera-video-fill'
			)}


					${renderBenefitItem(
				'Reports',
				reportsEnabled,
				'bi-bar-chart-fill'
			)}


					${renderBenefitItem(
				'Priority Support',
				prioritySupport,
				'bi-headset'
			)}

				</div>

			</div>


			<!-- ================================================
			     CANCELLATION NOTICE
			================================================= -->

			${cancellationNoticeHtml}


			<!-- ================================================
			     ACTIONS
			================================================= -->

			<div
				class="
					subscription-current-action-row
				">


				<a
					href="/subscription/plans"
					class="btn btn-medi">

					<i class="
						bi
						bi-arrow-up-circle-fill
						me-1
					"></i>

					Upgrade / Change Plan

				</a>


				${cancellationButtonHtml}

			</div>


		</section>
	`;
}


/* ============================================================
   PLAN LIMIT HELPER
============================================================ */

function getPlanLimit(
	subscription,
	plan,
	camelCaseKey,
	snakeCaseKey
) {

	const value =
		subscription[camelCaseKey]
		??
		subscription[snakeCaseKey]
		??
		plan[camelCaseKey]
		??
		plan[snakeCaseKey]
		??
		0;


	return Number(value) || 0;
}


/* ============================================================
   BENEFIT ITEM
============================================================ */

function renderBenefitItem(
	label,
	enabled,
	icon
) {

	return `

		<div
			class="
				subscription-current-benefit-item
			">


			<div
				class="
					subscription-current-benefit-icon
					${enabled
			? 'enabled'
			: 'disabled'}
				">


				<i
					class="
						bi
						${enabled
			? escapeHtml(icon)
			: 'bi-x-lg'}
					">
				</i>

			</div>


			<span>
				${escapeHtml(label)}
			</span>

		</div>
	`;
}


/* ============================================================
   EXPIRY WARNING
============================================================ */

function renderSubscriptionExpiryWarning(
	subscription
) {

	const warningContainer =
		document.getElementById(
			'subscriptionExpiryWarning'
		);


	if (!warningContainer) {
		return;
	}


	warningContainer.innerHTML =
		'';


	if (!subscription) {
		return;
	}


	const status =
		String(
			subscription.status || ''
		)
			.trim()
			.toUpperCase();


	if (status !== 'ACTIVE') {
		return;
	}


	const endDate =
		subscription.endDate;


	if (!endDate) {
		return;
	}


	const explicitDaysRemaining =
		subscription.daysRemaining;


	let daysRemaining =
		null;


	if (
		explicitDaysRemaining !== null &&
		explicitDaysRemaining !== undefined &&
		!Number.isNaN(
			Number(explicitDaysRemaining)
		)
	) {

		daysRemaining =
			Number(
				explicitDaysRemaining
			);

	} else {

		daysRemaining =
			calculateDaysRemaining(
				endDate
			);
	}


	if (
		daysRemaining === null ||
		daysRemaining < 0
	) {

		return;
	}


	/*
	 * Warning starts 7 days before expiry.
	 */

	if (daysRemaining > 7) {
		return;
	}


	let message;


	if (daysRemaining === 0) {

		message = `

			<strong>
				Your platform subscription expires today.
			</strong>

			<a
				href="/subscription/plans"
				class="alert-link ms-2">

				Renew now

			</a>
		`;

	} else if (daysRemaining === 1) {

		message = `

			<strong>
				Your platform subscription expires tomorrow.
			</strong>

			<a
				href="/subscription/plans"
				class="alert-link ms-2">

				Renew now

			</a>
		`;

	} else {

		message = `

			<strong>
				Your platform subscription expires
				in ${escapeHtml(daysRemaining)} days.
			</strong>

			<span class="ms-1">

				Valid until
				<strong>
					${escapeHtml(endDate)}
				</strong>.

			</span>

			<a
				href="/subscription/plans"
				class="alert-link ms-2">

				Renew / Change Plan

			</a>
		`;
	}


	warningContainer.innerHTML = `

		<div
			class="
				alert
				alert-warning
				alert-dismissible
				fade
				show
			"
			role="alert">

			<i class="
				bi
				bi-exclamation-triangle-fill
				me-1
			"></i>

			${message}


			<button
				type="button"
				class="btn-close"
				data-bs-dismiss="alert"
				aria-label="Close">
			</button>

		</div>
	`;
}


/* ============================================================
   DAYS REMAINING
============================================================ */

function calculateDaysRemaining(
	endDate
) {

	if (!endDate) {
		return null;
	}


	const normalizedDate =
		String(endDate).trim();


	const end =
		new Date(
			normalizedDate.length === 10
				? `${normalizedDate}T23:59:59`
				: normalizedDate
		);


	if (
		Number.isNaN(
			end.getTime()
		)
	) {

		return null;
	}


	const now =
		new Date();


	const todayStart =
		new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		);


	const endStart =
		new Date(
			end.getFullYear(),
			end.getMonth(),
			end.getDate()
		);


	const millisecondsPerDay =
		24 * 60 * 60 * 1000;


	return Math.ceil(
		(
			endStart.getTime() -
			todayStart.getTime()
		) /
		millisecondsPerDay
	);
}


/* ============================================================
   CLEAR EXPIRY WARNING
============================================================ */

function clearSubscriptionExpiryWarning() {

	const warningContainer =
		document.getElementById(
			'subscriptionExpiryWarning'
		);


	if (warningContainer) {

		warningContainer.innerHTML =
			'';
	}
}


/* ============================================================
   CANCEL PLATFORM SUBSCRIPTION
============================================================ */

async function cancelSubscription() {

	if (isCancellingSubscription) {
		return;
	}


	const confirmed =
		confirm(
			'Cancel renewal for your current subscription?\n\n' +
			'Your current plan will remain usable until its end date.'
		);


	if (!confirmed) {
		return;
	}


	const token =
		localStorage.getItem('token');


	if (!token) {

		showMsg(
			'Login token not found. Please login again.'
		);

		return;
	}


	isCancellingSubscription = true;


	setButtonLoading(
		'cancelSubscriptionBtn',
		'Cancelling...',
		true
	);


	try {

		/*
		 * =======================================================
		 * IMPORTANT:
		 *
		 * Platform cancellation.
		 *
		 * DO NOT send tenantId.
		 *
		 * Backend gets:
		 *
		 * tenantId = null
		 *
		 * therefore only platform subscription is cancelled.
		 * =======================================================
		 */

		const response =
			await fetch(
				`${API_BASE}/billing/subscriptions/cancel`,
				{
					method: 'PUT',

					headers: {

						'Authorization':
							'Bearer ' + token,

						'Accept':
							'application/json'
					}
				}
			);


		const result =
			await safeJson(response);


		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					'Unable to cancel subscription.'
				)
			);

			return;
		}


		showMsg(
			getApiErrorMessage(
				result,
				'Subscription cancellation requested successfully.'
			),
			'success'
		);


		await loadCurrentSubscription();


	} catch (error) {

		console.error(
			'Unable to cancel platform subscription:',
			error
		);


		showMsg(
			'Billing service not reachable.'
		);


	} finally {

		isCancellingSubscription =
			false;
	}
}


/* ============================================================
   UPDATE SUMMARY
============================================================ */

function updateSubscriptionSummary(
	subscription
) {

	const plan =
		subscription.plan &&
			typeof subscription.plan === 'object'
			? subscription.plan
			: {};


	const planName =
		getSubscriptionValue(
			subscription.planName,
			plan.planName
		);


	const status =
		getSubscriptionValue(
			subscription.status,
			subscription.subscriptionStatus,
			'ACTIVE'
		);


	const billingCycle =
		getSubscriptionValue(
			subscription.billingCycle,
			plan.billingCycle
		);


	const endDate =
		getSubscriptionValue(
			subscription.endDate
		);


	let displayStatus =
		status;


	if (
		String(status)
			.trim()
			.toUpperCase() === 'ACTIVE'
		&&
		Boolean(
			subscription.cancellationRequested
		)
	) {

		displayStatus =
			'CANCELLATION REQUESTED';
	}


	setText(
		'currentPlanSummary',
		planName
	);


	setText(
		'subscriptionStatusSummary',
		displayStatus
	);


	setText(
		'billingCycleSummary',
		billingCycle
	);


	setText(
		'subscriptionEndDateSummary',
		endDate
	);
}


/* ============================================================
   RESET SUMMARY
============================================================ */

function resetSubscriptionSummary() {

	setText(
		'currentPlanSummary',
		'-'
	);


	setText(
		'subscriptionStatusSummary',
		'-'
	);


	setText(
		'billingCycleSummary',
		'-'
	);


	setText(
		'subscriptionEndDateSummary',
		'-'
	);
}


/* ============================================================
   NO SUBSCRIPTION
============================================================ */

function renderNoSubscription(
	message
) {

	const subscriptionBox =
		document.getElementById(
			'subscriptionBox'
		);


	if (!subscriptionBox) {
		return;
	}


	subscriptionBox.innerHTML = `

		<section
			class="
				mr-card
				subscription-current-card
			">


			<div
				class="
					subscription-current-state
				">


				<div
					class="
						subscription-current-state-icon
					">

					<i class="
						bi
						bi-credit-card-2-front-fill
					"></i>

				</div>


				<h3 class="
					fw-bold
					text-primary
				">

					No Active Subscription

				</h3>


				<p class="
					text-muted
					mb-3
				">

					${escapeHtml(
		message ||
		'Please choose a plan to continue.'
	)}

				</p>


				<a
					href="/subscription/plans"
					class="btn btn-medi">

					<i class="
						bi
						bi-grid-fill
						me-1
					"></i>

					Choose Plan

				</a>

			</div>

		</section>
	`;
}


/* ============================================================
   LOADING STATE
============================================================ */

function showSubscriptionLoadingState() {

	const subscriptionBox =
		document.getElementById(
			'subscriptionBox'
		);


	if (!subscriptionBox) {
		return;
	}


	subscriptionBox.innerHTML = `

		<section
			class="
				mr-card
				subscription-current-card
			">


			<div
				class="
					subscription-current-state
				">


				<div
					class="
						subscription-current-state-icon
						subscription-current-loading
					">

					<i class="
						bi
						bi-credit-card-fill
					"></i>

				</div>


				<h5 class="
					fw-bold
					text-primary
				">

					Loading current subscription

				</h5>


				<p class="
					text-muted
					mb-0
				">

					Please wait while we prepare
					your subscription details.

				</p>

			</div>

		</section>
	`;
}


/* ============================================================
   ERROR STATE
============================================================ */

function showSubscriptionErrorState(
	message
) {

	const subscriptionBox =
		document.getElementById(
			'subscriptionBox'
		);


	if (!subscriptionBox) {
		return;
	}


	subscriptionBox.innerHTML = `

		<section
			class="
				mr-card
				subscription-current-card
			">


			<div
				class="
					subscription-current-state
				">


				<div
					class="
						subscription-current-state-icon
						bg-danger
					">

					<i class="
						bi
						bi-exclamation-triangle-fill
					"></i>

				</div>


				<h5 class="
					fw-bold
					text-danger
				">

					Unable to load subscription

				</h5>


				<p class="
					text-muted
					mb-0
				">

					${escapeHtml(message)}

				</p>

			</div>

		</section>
	`;
}


/* ============================================================
   SAFE JSON
============================================================ */

async function safeJson(
	response
) {

	try {

		const text =
			await response.text();


		if (!text.trim()) {
			return {};
		}


		try {

			return JSON.parse(text);

		} catch (error) {

			return {};
		}


	} catch (error) {

		return {};
	}
}


/* ============================================================
   API ERROR
============================================================ */

function getApiErrorMessage(
	data,
	fallback
) {

	if (!data) {
		return fallback;
	}


	if (data.message) {
		return data.message;
	}


	if (data.error) {
		return data.error;
	}


	if (data.detail) {
		return data.detail;
	}


	if (typeof data === 'string') {
		return data;
	}


	return fallback;
}


/* ============================================================
   MESSAGE
============================================================ */

function showMsg(
	message,
	type = 'danger'
) {

	const msg =
		document.getElementById(
			'msg'
		);


	if (!msg) {

		alert(message);

		return;
	}


	msg.innerHTML = `

		<div
			class="
				alert
				alert-${type}
				alert-dismissible
				fade
				show
			"
			role="alert">

			${escapeHtml(message)}


			<button
				type="button"
				class="btn-close"
				data-bs-dismiss="alert"
				aria-label="Close">
			</button>

		</div>
	`;
}


/* ============================================================
   CLEAR MESSAGE
============================================================ */

function clearMessage() {

	const msg =
		document.getElementById(
			'msg'
		);


	if (msg) {

		msg.innerHTML =
			'';
	}
}


/* ============================================================
   BUTTON LOADING
============================================================ */

function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {

	const button =
		document.getElementById(
			buttonId
		);


	setElementLoading(
		button,
		loadingText,
		isLoading
	);
}


function setElementLoading(
	button,
	loadingText,
	isLoading
) {

	if (!button) {
		return;
	}


	if (isLoading) {

		if (!button.dataset.originalHtml) {

			button.dataset.originalHtml =
				button.innerHTML;
		}


		button.innerHTML = `

			<span
				class="
					spinner-border
					spinner-border-sm
					me-2
				"
				role="status"
				aria-hidden="true">
			</span>

			${escapeHtml(
			loadingText
		)}
		`;


		button.disabled =
			true;


	} else {

		button.innerHTML =
			button.dataset.originalHtml ||
			button.innerHTML;


		button.disabled =
			false;
	}
}


/* ============================================================
   VALUE HELPERS
============================================================ */

function getSubscriptionValue(
	...values
) {

	for (
		const value of values
	) {

		if (
			value !== null &&
			value !== undefined &&
			value !== ''
		) {

			return value;
		}
	}


	return '-';
}


/* ============================================================
   SET TEXT
============================================================ */

function setText(
	id,
	value
) {

	const element =
		document.getElementById(
			id
		);


	if (!element) {
		return;
	}


	element.innerText =
		value === null ||
			value === undefined ||
			value === ''
			? '-'
			: value;
}


/* ============================================================
   SAFE VALUE
============================================================ */

function safe(
	value
) {

	return (
		value === null ||
		value === undefined ||
		value === ''
	)
		? '-'
		: escapeHtml(value);
}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHtml(
	value
) {

	return String(
		value ?? ''
	)
		.replace(
			/&/g,
			'&amp;'
		)
		.replace(
			/</g,
			'&lt;'
		)
		.replace(
			/>/g,
			'&gt;'
		)
		.replace(
			/"/g,
			'&quot;'
		)
		.replace(
			/'/g,
			'&#039;'
		);
}