'use strict';

/* ============================================================
   SAAS CURRENT SUBSCRIPTION
   MediRevolution
   Workspace Based Subscription
============================================================ */

let isLoadingCurrentSubscription = false;
let isCancellingSubscription = false;


/* ============================================================
   PAGE INIT
============================================================ */

document.addEventListener('DOMContentLoaded', async function() {

	const tenantId = getSelectedTenantId();

	/*
	 * SaaS subscription page always requires
	 * a selected workspace.
	 */
	if (!tenantId) {

		clearSubscriptionPage();
		showWorkspaceRequiredState();

		return;
	}

	/*
	 * Authentication token required.
	 */
	const token = localStorage.getItem('token');

	if (!token) {

		clearSubscriptionPage();

		const message =
			'Login token not found. Please login again.';

		showMsg(message);
		renderNoSubscription(message);

		return;
	}

	/*
	 * Only subscription-supported SaaS roles.
	 */
	if (!requireSubscriptionRole()) {
		return;
	}

	/*
	 * Show selected workspace.
	 */
	renderWorkspaceContext();

	/*
	 * Load subscription for selected workspace.
	 */
	await loadCurrentSubscription();

});


/* ============================================================
   SELECTED WORKSPACE
============================================================ */

function getSelectedTenantId() {

	const rawTenantId =
		localStorage.getItem('tenantId');

	if (
		rawTenantId === null ||
		rawTenantId === undefined ||
		String(rawTenantId).trim() === ''
	) {
		return null;
	}

	const tenantId =
		Number(rawTenantId);

	if (
		!Number.isInteger(tenantId) ||
		tenantId <= 0
	) {
		return null;
	}

	return tenantId;
}


/* ============================================================
   ROLE
============================================================ */

function normalizeRole(role) {

	return String(role || '')
		.trim()
		.toUpperCase();
}


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

	if (!allowedRoles.includes(role)) {

		showSubscriptionErrorState(
			'Subscription is not available for your current role.'
		);

		showMsg(
			'Subscription is available only for Wholesaler, Doctor and Hospital.'
		);

		return false;
	}

	return true;
}


/* ============================================================
   LOAD CURRENT SUBSCRIPTION
============================================================ */

async function loadCurrentSubscription() {

	if (isLoadingCurrentSubscription) {
		return;
	}

	const tenantId =
		getSelectedTenantId();

	const token =
		localStorage.getItem('token');

	/*
	 * Workspace required.
	 */
	if (!tenantId) {

		showWorkspaceRequiredState();

		return;
	}

	/*
	 * Token required.
	 */
	if (!token) {

		const message =
			'Login token not found. Please login again.';

		resetSubscriptionSummary();
		renderNoSubscription(message);
		showMsg(message);

		return;
	}

	isLoadingCurrentSubscription = true;

	clearMessage();
	clearExpiryWarning();
	showSubscriptionLoadingState();

	try {

		/*
		 * IMPORTANT:
		 * SaaS current subscription is workspace-specific.
		 */
		const url =
			`${API_BASE}/billing/subscriptions/current` +
			`?tenantId=${encodeURIComponent(tenantId)}`;

		const response =
			await fetch(
				url,
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
		 * No active subscription.
		 */
		if (!response.ok) {

			const message =
				getApiErrorMessage(
					result,
					'No active subscription found for this workspace.'
				);

			resetSubscriptionSummary();
			clearExpiryWarning();

			renderNoSubscription(message);

			return;
		}

		/*
		 * Empty response safety.
		 */
		if (
			!result ||
			typeof result !== 'object' ||
			Array.isArray(result) ||
			Object.keys(result).length === 0
		) {

			resetSubscriptionSummary();
			clearExpiryWarning();

			renderNoSubscription(
				'No active subscription found for this workspace.'
			);

			return;
		}

		/*
		 * Render subscription.
		 */
		renderSubscription(result);

		updateSubscriptionSummary(result);

		/*
		 * Expiry warning.
		 */
		renderExpiryWarning(result);

	} catch (error) {

		console.error(
			'Unable to load SaaS workspace subscription:',
			error
		);

		resetSubscriptionSummary();
		clearExpiryWarning();

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
   WORKSPACE CONTEXT
============================================================ */

function renderWorkspaceContext() {

	const element =
		document.getElementById(
			'subscriptionWorkspaceContext'
		);

	if (!element) {
		return;
	}

	const tenantId =
		getSelectedTenantId();

	if (!tenantId) {

		element.innerHTML = '';

		return;
	}

	const tenantName =
		localStorage.getItem('tenantName') ||
		'Selected Workspace';

	element.innerHTML = `

        <span class="subscription-workspace-badge">

            <i class="bi bi-building-fill"></i>

            SaaS Workspace

        </span>

        <span class="subscription-workspace-name">

            <i class="bi bi-building-check"></i>

            ${escapeHtml(tenantName)}

        </span>

        <span class="subscription-workspace-id">

            <i class="bi bi-hash"></i>

            Workspace ${escapeHtml(tenantId)}

        </span>
    `;
}


/* ============================================================
   WORKSPACE REQUIRED
============================================================ */

function showWorkspaceRequiredState() {

	resetSubscriptionSummary();
	clearExpiryWarning();

	const context =
		document.getElementById(
			'subscriptionWorkspaceContext'
		);

	if (context) {

		context.innerHTML = `

            <div class="alert alert-warning w-100 mb-0"
                 role="alert">

                <i class="bi bi-building-exclamation me-1"></i>

                Please select a SaaS workspace first.

            </div>
        `;
	}

	const subscriptionBox =
		document.getElementById(
			'subscriptionBox'
		);

	if (subscriptionBox) {

		subscriptionBox.innerHTML = `

            <section class="mr-card subscription-current-card">

                <div class="subscription-current-state">

                    <div class="
                        subscription-current-state-icon
                        bg-warning
                        text-dark
                    ">

                        <i class="bi bi-building-exclamation"></i>

                    </div>

                    <h3 class="fw-bold text-primary">

                        SaaS Workspace Required

                    </h3>

                    <p class="text-muted mb-3">

                        Please select a SaaS workspace
                        before accessing subscription details.

                    </p>

                    <button
                        type="button"
                        class="btn btn-medi"
                        onclick="switchSaasWorkspace()">

                        <i class="bi bi-arrow-left-right me-1"></i>

                        Switch Workspace

                    </button>

                </div>

            </section>
        `;
	}

	showMsg(
		'Please select SaaS workspace first.',
		'warning'
	);
}


/* ============================================================
   RENDER SUBSCRIPTION
============================================================ */

function renderSubscription(subscription) {

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

	const billingCycle =
		getSubscriptionValue(
			subscription.billingCycle,
			plan.billingCycle
		);

	const role =
		getSubscriptionValue(
			subscription.role,
			plan.role,
			normalizeRole(
				localStorage.getItem('role')
			)
		);

	const startDate =
		getSubscriptionValue(
			subscription.startDate
		);

	const endDate =
		getSubscriptionValue(
			subscription.endDate
		);

	const status =
		getSubscriptionValue(
			subscription.status,
			subscription.subscriptionStatus,
			'ACTIVE'
		);

	/*
	 * ----------------------------------------------------------
	 * BENEFITS / LIMITS
	 * ----------------------------------------------------------
	 */

	const onlineConsultation =
		Boolean(
			subscription.onlineConsultationEnabled ??
			subscription.videoConsultationAllowed ??
			plan.onlineConsultationEnabled ??
			plan.videoConsultationAllowed ??
			false
		);

	const reportsEnabled =
		Boolean(
			subscription.reportsEnabled ??
			plan.reportsEnabled ??
			false
		);

	const prioritySupport =
		Boolean(
			subscription.prioritySupportEnabled ??
			plan.prioritySupportEnabled ??
			false
		);

	const maxMedicines =
		getPlanLimit(
			subscription,
			plan,
			'maxMedicines'
		);

	const maxAppointments =
		getPlanLimit(
			subscription,
			plan,
			'maxAppointments'
		);

	const maxStaff =
		getPlanLimit(
			subscription,
			plan,
			'maxStaff'
		);

	/*
	 * ----------------------------------------------------------
	 * STATUS
	 * ----------------------------------------------------------
	 */

	const normalizedStatus =
		String(status)
			.trim()
			.toUpperCase();

	const activeStatus =
		normalizedStatus === 'ACTIVE';

	const cancellationRequested =
		Boolean(
			subscription.cancellationRequested
		);

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

	let cancellationButtonHtml = '';

	if (activeStatus) {

		if (cancellationRequested) {

			cancellationButtonHtml = `

                <button
                    type="button"
                    class="btn btn-outline-warning"
                    disabled>

                    <i class="bi bi-hourglass-split me-1"></i>

                    Cancellation Requested

                </button>
            `;

		} else {

			cancellationButtonHtml = `

                <button
                    type="button"
                    id="cancelSubscriptionBtn"
                    class="btn btn-outline-danger"
                    onclick="cancelSubscription()">

                    <i class="bi bi-x-circle-fill me-1"></i>

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

	let cancellationNoticeHtml = '';

	if (
		activeStatus &&
		cancellationRequested
	) {

		cancellationNoticeHtml = `

            <div
                class="alert alert-warning
                       subscription-cancellation-notice mt-4"
                role="alert">

                <div class="d-flex align-items-start gap-2">

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

                        <div class="small mt-1">

                            This workspace subscription
                            remains active until

                            <strong>
                                ${escapeHtml(endDate)}
                            </strong>.

                            Access continues until the
                            paid period ends.

                        </div>

                    </div>

                </div>

            </div>
        `;
	}

	/*
	 * ----------------------------------------------------------
	 * WORKSPACE
	 * ----------------------------------------------------------
	 */

	const tenantName =
		localStorage.getItem('tenantName') ||
		'Selected Workspace';

	const tenantId =
		getSelectedTenantId();

	/*
	 * ----------------------------------------------------------
	 * RENDER
	 * ----------------------------------------------------------
	 */

	subscriptionBox.innerHTML = `

        <section class="subscription-current-card">

            <div class="subscription-current-header">

                <div>

                    <span class="
                        subscription-current-active-badge
                    ">

                        <i class="bi bi-award-fill"></i>

                        Current Plan

                    </span>

                    <h2>
                        ${safe(planName)}
                    </h2>

                    <p>
                        ${safe(planCode)}
                    </p>

                </div>

                <span class="
                    subscription-current-status
                    ${statusClass}
                ">

                    <i class="bi ${statusIcon}"></i>

                    ${escapeHtml(displayStatus)}

                </span>

            </div>


            <div class="subscription-current-info-grid">

                <div class="
                    subscription-current-info-item
                ">

                    <span>
                        Workspace
                    </span>

                    <strong>
                        ${escapeHtml(tenantName)}
                    </strong>

                </div>


                <div class="
                    subscription-current-info-item
                ">

                    <span>
                        Workspace ID
                    </span>

                    <strong>
                        ${escapeHtml(tenantId || '-')}
                    </strong>

                </div>


                <div class="
                    subscription-current-info-item
                ">

                    <span>
                        Role
                    </span>

                    <strong>
                        ${safe(role)}
                    </strong>

                </div>


                <div class="
                    subscription-current-info-item
                ">

                    <span>
                        Billing Cycle
                    </span>

                    <strong>
                        ${safe(billingCycle)}
                    </strong>

                </div>

            </div>


            <div class="
                subscription-current-info-grid
                subscription-current-secondary-info
            ">

                <div class="
                    subscription-current-info-item
                ">

                    <span>
                        Start Date
                    </span>

                    <strong>
                        ${safe(startDate)}
                    </strong>

                </div>


                <div class="
                    subscription-current-info-item
                ">

                    <span>
                        Valid Until
                    </span>

                    <strong>
                        ${safe(endDate)}
                    </strong>

                </div>


                <div class="
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


                <div class="
                    subscription-current-info-item
                ">

                    <span>
                        Max Staff
                    </span>

                    <strong>
                        ${maxStaff > 0
			? escapeHtml(maxStaff)
			: '-'}
                    </strong>

                </div>

            </div>


            <div class="subscription-current-benefits">

                <h5>
                    Plan Benefits
                </h5>

                <div class="subscription-current-benefit-list">

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

                    ${renderBenefitItem(
				'Appointments',
				maxAppointments > 0,
				'bi-calendar-check-fill'
			)}

                </div>

            </div>


            ${cancellationNoticeHtml}


            <div class="
                subscription-current-action-row
            ">

                <a
                    href="/saas/subscription/plans"
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
   PLAN LIMIT
============================================================ */

function getPlanLimit(
	subscription,
	plan,
	fieldName
) {

	const value =
		subscription?.[fieldName]
		??
		plan?.[fieldName]
		??
		0;

	return Number(value) || 0;
}


/* ============================================================
   BENEFIT
============================================================ */

function renderBenefitItem(
	label,
	enabled,
	icon
) {

	return `

        <div class="
            subscription-current-benefit-item
        ">

            <div class="
                subscription-current-benefit-icon
                ${enabled ? 'enabled' : 'disabled'}
            ">

                <i class="
                    bi
                    ${enabled
			? escapeHtml(icon)
			: 'bi-x-lg'}
                "></i>

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

function renderExpiryWarning(subscription) {

	const warningContainer =
		document.getElementById(
			'subscriptionExpiryWarning'
		);

	if (!warningContainer) {
		return;
	}

	warningContainer.innerHTML = '';

	const status =
		String(
			subscription?.status || ''
		)
			.trim()
			.toUpperCase();

	/*
	 * Only current ACTIVE subscription
	 * should display expiry warning.
	 */
	if (status !== 'ACTIVE') {
		return;
	}

	const endDate =
		subscription?.endDate;

	if (!endDate) {
		return;
	}

	const explicitDaysRemaining =
		subscription?.daysRemaining;

	let daysRemaining = null;

	if (
		explicitDaysRemaining !== null &&
		explicitDaysRemaining !== undefined &&
		!Number.isNaN(
			Number(explicitDaysRemaining)
		)
	) {

		daysRemaining =
			Number(explicitDaysRemaining);

	} else {

		daysRemaining =
			calculateDaysRemaining(endDate);
	}

	if (
		daysRemaining === null ||
		daysRemaining < 0
	) {
		return;
	}

	/*
	 * Warning begins 7 days before expiry.
	 */
	if (daysRemaining > 7) {
		return;
	}

	let message = '';

	if (daysRemaining === 0) {

		message = `

            <strong>
                Your workspace subscription expires today.
            </strong>

            <a
                href="/saas/subscription/plans"
                class="alert-link ms-2">

                Renew now

            </a>
        `;

	} else if (daysRemaining === 1) {

		message = `

            <strong>
                Your workspace subscription expires tomorrow.
            </strong>

            <a
                href="/saas/subscription/plans"
                class="alert-link ms-2">

                Renew now

            </a>
        `;

	} else {

		message = `

            <strong>
                Your workspace subscription expires
                in ${escapeHtml(daysRemaining)} days.
            </strong>

            <span class="ms-1">

                Valid until
                <strong>
                    ${escapeHtml(endDate)}
                </strong>.

            </span>

            <a
                href="/saas/subscription/plans"
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

function calculateDaysRemaining(endDate) {

	if (!endDate) {
		return null;
	}

	/*
	 * Backend LocalDate is normally:
	 * YYYY-MM-DD
	 */
	const dateString =
		String(endDate).trim();

	const end =
		new Date(
			dateString.length === 10
				? `${dateString}T23:59:59`
				: dateString
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
   CANCEL CURRENT WORKSPACE SUBSCRIPTION
============================================================ */

async function cancelSubscription() {

	if (isCancellingSubscription) {
		return;
	}

	const tenantId =
		getSelectedTenantId();

	if (!tenantId) {

		showWorkspaceRequiredState();

		return;
	}

	const confirmed =
		confirm(
			'Cancel renewal for this workspace subscription?\n\n' +
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
		 * IMPORTANT:
		 * Cancellation is for selected workspace only.
		 */
		const response =
			await fetch(
				`${API_BASE}/billing/subscriptions/cancel` +
				`?tenantId=${encodeURIComponent(tenantId)}`,
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
					'Unable to cancel workspace subscription.'
				)
			);

			return;
		}

		showMsg(
			'Workspace subscription cancellation requested successfully.',
			'success'
		);

		await loadCurrentSubscription();

	} catch (error) {

		console.error(
			'Unable to cancel workspace subscription:',
			error
		);

		showMsg(
			'Billing service not reachable.'
		);

	} finally {

		isCancellingSubscription = false;
	}
}


/* ============================================================
   SUMMARY
============================================================ */

function updateSubscriptionSummary(subscription) {

	const plan =
		subscription?.plan &&
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
   CLEAR PAGE
============================================================ */

function clearSubscriptionPage() {

	resetSubscriptionSummary();
	clearExpiryWarning();

	const context =
		document.getElementById(
			'subscriptionWorkspaceContext'
		);

	if (context) {
		context.innerHTML = '';
	}

	clearMessage();
}


function clearExpiryWarning() {

	const warning =
		document.getElementById(
			'subscriptionExpiryWarning'
		);

	if (warning) {
		warning.innerHTML = '';
	}
}


/* ============================================================
   NO SUBSCRIPTION
============================================================ */

function renderNoSubscription(message) {

	const subscriptionBox =
		document.getElementById(
			'subscriptionBox'
		);

	if (!subscriptionBox) {
		return;
	}

	subscriptionBox.innerHTML = `

        <section class="
            mr-card
            subscription-current-card
        ">

            <div class="
                subscription-current-state
            ">

                <div class="
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
		'Please choose a plan for this workspace to continue.'
	)}

                </p>

                <a
                    href="/saas/subscription/plans"
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
   LOADING
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

        <section class="
            mr-card
            subscription-current-card
        ">

            <div class="
                subscription-current-state
            ">

                <div class="
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
                    your workspace subscription details.

                </p>

            </div>

        </section>
    `;
}


/* ============================================================
   ERROR
============================================================ */

function showSubscriptionErrorState(message) {

	const subscriptionBox =
		document.getElementById(
			'subscriptionBox'
		);

	if (!subscriptionBox) {
		return;
	}

	subscriptionBox.innerHTML = `

        <section class="
            mr-card
            subscription-current-card
        ">

            <div class="
                subscription-current-state
            ">

                <div class="
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

async function safeJson(response) {

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


function clearMessage() {

	const msg =
		document.getElementById(
			'msg'
		);

	if (msg) {
		msg.innerHTML = '';
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

            ${escapeHtml(loadingText)}
        `;

		button.disabled = true;

	} else {

		button.innerHTML =
			button.dataset.originalHtml ||
			button.innerHTML;

		button.disabled = false;
	}
}


/* ============================================================
   VALUE HELPERS
============================================================ */

function getSubscriptionValue(...values) {

	for (const value of values) {

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
   TEXT
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
   SAFE HTML
============================================================ */

function safe(value) {

	return (
		value === null ||
		value === undefined ||
		value === ''
	)
		? '-'
		: escapeHtml(value);
}


function escapeHtml(value) {

	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}