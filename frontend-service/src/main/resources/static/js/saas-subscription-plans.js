'use strict';

/* ============================================================
   SAAS SUBSCRIPTION PLANS
   MediRevolution
   Workspace Based Subscription
============================================================ */

let subscriptionPlans = [];

let isLoadingSubscriptionPlans = false;
let isLoadingCurrentSubscription = false;
let isSubscribingPlan = false;

let selectedBillingCycle = 'MONTHLY';

let currentSubscription = null;


/* ============================================================
   PAGE INIT
============================================================ */

document.addEventListener(
	'DOMContentLoaded',
	async function() {

		const tenantId =
			getSelectedTenantId();

		/*
		 * ========================================================
		 * WORKSPACE REQUIRED
		 * ========================================================
		 */

		if (!tenantId) {

			clearPlansPage();

			showWorkspaceRequiredState();

			return;
		}


		/*
		 * ========================================================
		 * TOKEN REQUIRED
		 * ========================================================
		 */

		const token =
			localStorage.getItem('token');

		if (!token) {

			clearPlansPage();

			const message =
				'Login token not found. Please login again.';

			showMsg(message);

			showPlansErrorState(message);

			return;
		}


		/*
		 * ========================================================
		 * ROLE
		 * ========================================================
		 */

		if (!requireSubscriptionRole()) {
			return;
		}


		/*
		 * ========================================================
		 * WORKSPACE CONTEXT
		 * ========================================================
		 */

		renderWorkspaceContext();


		/*
		 * ========================================================
		 * ROLE SUMMARY
		 * ========================================================
		 */

		setText(
			'subscriptionRoleSummary',
			normalizeRole(
				localStorage.getItem('role')
			) || '-'
		);


		/*
		 * ========================================================
		 * CURRENT WORKSPACE SUBSCRIPTION
		 *
		 * Used for:
		 *
		 * 1. Current plan highlighting
		 * 2. Current billing cycle
		 * 3. Expiry warning
		 *
		 * ========================================================
		 */

		await loadCurrentSubscriptionForPlans();


		/*
		 * ========================================================
		 * LOAD PLANS
		 * ========================================================
		 */

		await loadPlans();


		/*
		 * ========================================================
		 * BILLING BUTTON STATE
		 * ========================================================
		 */

		updateBillingCycleButtons();

	}
);


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

	return String(
		role || ''
	)
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


	if (
		!allowedRoles.includes(role)
	) {

		showMsg(
			'Subscription is available only for Wholesaler, Doctor and Hospital.'
		);

		showPlansErrorState(
			'Subscription is not available for your current role.'
		);

		return false;
	}


	return true;
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


	const tenantName =
		localStorage.getItem('tenantName')
		|| 'Selected Workspace';


	if (!tenantId) {

		element.innerHTML =
			'';

		return;
	}


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

	resetPlanSummary();
	clearExpiryWarning();

	const workspaceContext =
		document.getElementById(
			'subscriptionWorkspaceContext'
		);


	if (workspaceContext) {

		workspaceContext.innerHTML = `

			<div
				class="alert alert-warning w-100 mb-0"
				role="alert">

				<i class="
					bi
					bi-building-exclamation
					me-1
				"></i>

				Please select SaaS workspace first.

			</div>
		`;
	}


	const container =
		document.getElementById(
			'plansContainer'
		);


	if (container) {

		container.innerHTML = `

			<div class="
				subscription-plans-state
			">

				<div class="
					subscription-plans-state-icon
					bg-warning
					text-dark
				">

					<i class="
						bi
						bi-building-exclamation
					"></i>

				</div>


				<h5 class="
					fw-bold
					text-primary
				">

					SaaS Workspace Required

				</h5>


				<p class="
					text-muted
					mb-3
				">

					Please select a SaaS workspace
					before viewing subscription plans.

				</p>


				<button
					type="button"
					class="btn btn-medi"
					onclick="switchSaasWorkspace()">

					<i class="
						bi
						bi-arrow-left-right
						me-1
					"></i>

					Switch Workspace

				</button>

			</div>
		`;
	}


	showMsg(
		'Please select SaaS workspace first.',
		'warning'
	);
}


/* ============================================================
   LOAD CURRENT SUBSCRIPTION
   SELECTED WORKSPACE ONLY
============================================================ */

async function loadCurrentSubscriptionForPlans() {

	if (isLoadingCurrentSubscription) {
		return;
	}


	const tenantId =
		getSelectedTenantId();


	const token =
		localStorage.getItem('token');


	if (!tenantId || !token) {
		return;
	}


	isLoadingCurrentSubscription = true;


	try {

		/*
		 * IMPORTANT:
		 *
		 * Current subscription is workspace based.
		 */
		const response =
			await fetch(
				`${API_BASE}/billing/subscriptions/current` +
				`?tenantId=${encodeURIComponent(tenantId)}`,
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
		 * No active subscription is valid.
		 *
		 * Plans page must still load.
		 */
		if (!response.ok) {

			currentSubscription = null;

			clearExpiryWarning();

			return;
		}


		if (
			result &&
			typeof result === 'object' &&
			!Array.isArray(result) &&
			Object.keys(result).length > 0
		) {

			currentSubscription =
				result;

			/*
			 * Show expiry warning for current workspace.
			 */
			renderExpiryWarning(
				currentSubscription
			);

		} else {

			currentSubscription = null;

			clearExpiryWarning();
		}


	} catch (error) {

		console.warn(
			'Unable to load current workspace subscription:',
			error
		);


		currentSubscription = null;

		clearExpiryWarning();


	} finally {

		isLoadingCurrentSubscription =
			false;
	}
}


/* ============================================================
   EXPIRY WARNING
============================================================ */

function renderExpiryWarning(subscription) {

	const container =
		document.getElementById(
			'subscriptionExpiryWarning'
		);


	if (!container) {
		return;
	}


	container.innerHTML = '';


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


	let daysRemaining = null;


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
	 * Show warning during last 7 days.
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


	container.innerHTML = `

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


function calculateDaysRemaining(endDate) {

	if (!endDate) {
		return null;
	}


	const value =
		String(endDate).trim();


	const end =
		new Date(
			value.length === 10
				? `${value}T23:59:59`
				: value
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


function clearExpiryWarning() {

	const container =
		document.getElementById(
			'subscriptionExpiryWarning'
		);


	if (container) {

		container.innerHTML =
			'';
	}
}


/* ============================================================
   BILLING CYCLE
============================================================ */

function setBillingCycle(
	billingCycle
) {

	const normalized =
		String(
			billingCycle || ''
		)
			.trim()
			.toUpperCase();


	if (
		normalized !== 'MONTHLY' &&
		normalized !== 'YEARLY'
	) {

		return;
	}


	selectedBillingCycle =
		normalized;


	updateBillingCycleButtons();

	renderPlans();
}


/* ============================================================
   BILLING CYCLE BUTTONS
============================================================ */

function updateBillingCycleButtons() {

	const monthlyButton =
		document.getElementById(
			'monthlyBillingBtn'
		);


	const yearlyButton =
		document.getElementById(
			'yearlyBillingBtn'
		);


	if (monthlyButton) {

		monthlyButton.classList.toggle(
			'active',
			selectedBillingCycle === 'MONTHLY'
		);
	}


	if (yearlyButton) {

		yearlyButton.classList.toggle(
			'active',
			selectedBillingCycle === 'YEARLY'
		);
	}
}


/* ============================================================
   LOAD PLANS
============================================================ */

async function loadPlans() {

	if (isLoadingSubscriptionPlans) {
		return;
	}


	const tenantId =
		getSelectedTenantId();


	const token =
		localStorage.getItem('token');


	const role =
		normalizeRole(
			localStorage.getItem('role')
		);


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

		showMsg(
			'Login token not found. Please login again.'
		);

		return;
	}


	/*
	 * Role required.
	 */
	if (!role) {

		showMsg(
			'User role not found.'
		);

		return;
	}


	if (!requireSubscriptionRole()) {
		return;
	}


	isLoadingSubscriptionPlans = true;


	showPlansLoadingState();


	setButtonLoading(
		'refreshPlansBtn',
		'Refreshing...',
		true
	);


	try {

		/*
		 * IMPORTANT:
		 *
		 * Plans endpoint is role based.
		 *
		 * DO NOT send tenantId here.
		 *
		 * Backend:
		 *
		 * GET /billing/subscriptions/plans/{role}
		 *
		 */
		const response =
			await fetch(
				`${API_BASE}/billing/subscriptions/plans/` +
				`${encodeURIComponent(role)}`,
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


		if (!response.ok) {

			subscriptionPlans = [];


			const message =
				getApiErrorMessage(
					result,
					'Unable to load subscription plans.'
				);


			showMsg(message);


			showPlansErrorState(
				message
			);


			updatePlanSummary();


			return;
		}


		subscriptionPlans =
			Array.isArray(result)
				? result
				: [];


		/*
		 * Frontend safety.
		 */
		subscriptionPlans =
			subscriptionPlans.filter(
				function(plan) {

					return (
						plan &&
						plan.active !== false
					);
				}
			);


		updatePlanSummary();


		renderPlans();


	} catch (error) {

		console.error(
			'Unable to load subscription plans:',
			error
		);


		subscriptionPlans = [];


		showMsg(
			'Billing service not reachable.'
		);


		showPlansErrorState(
			'Billing service not reachable.'
		);


		updatePlanSummary();


	} finally {

		isLoadingSubscriptionPlans = false;


		setButtonLoading(
			'refreshPlansBtn',
			'Refresh',
			false
		);
	}
}


/* ============================================================
   RENDER PLANS
============================================================ */

function renderPlans() {

	const container =
		document.getElementById(
			'plansContainer'
		);


	if (!container) {
		return;
	}


	if (!subscriptionPlans.length) {

		container.innerHTML = `

			<div class="
				subscription-plans-state
			">

				<div class="
					subscription-plans-state-icon
				">

					<i class="
						bi
						bi-inbox-fill
					"></i>

				</div>


				<h5 class="
					fw-bold
					text-primary
				">

					No plans found

				</h5>


				<p class="
					text-muted
					mb-0
				">

					No subscription plans are
					available for your role.

				</p>

			</div>
		`;

		return;
	}


	container.innerHTML =
		subscriptionPlans
			.map(
				function(
					plan,
					index
				) {

					return renderPlanCard(
						plan,
						index
					);
				}
			)
			.join('');
}


/* ============================================================
   RENDER PLAN CARD
============================================================ */

function renderPlanCard(
	plan,
	index
) {

	const planCode =
		getPlanCode(plan);


	const planName =
		plan.planName || '-';


	const planRole =
		plan.role || '-';


	const price =
		getSelectedPlanPrice(
			plan,
			selectedBillingCycle
		);


	const hasSelectedPrice =
		price !== null;


	const cycleText =
		selectedBillingCycle === 'YEARLY'
			? 'year'
			: 'month';


	const currentPlan =
		isCurrentPlan(
			planCode
		);


	const currentBillingCycle =
		getCurrentBillingCycle();


	const cancellationRequested =
		Boolean(
			currentSubscription?.cancellationRequested
		);


	let actionHtml = '';


	/*
	 * ========================================================
	 * CURRENT PLAN
	 * ========================================================
	 */

	if (
		currentPlan &&
		(
			!currentBillingCycle ||
			currentBillingCycle ===
			selectedBillingCycle
		)
	) {

		actionHtml = `

			<button
				type="button"
				class="
					subscription-plan-active-button
				"
				disabled>

				<i class="
					bi
					bi-check-circle-fill
					me-1
				"></i>

				Current Plan

			</button>


			<div class="
				subscription-plan-action-note
			">

				${cancellationRequested
				? 'Cancellation requested. Current workspace access remains valid until the end date.'
				: 'This workspace is currently subscribed to this plan.'
			}

			</div>
		`;

	}

	/*
	 * ========================================================
	 * PRICE NOT AVAILABLE
	 * ========================================================
	 */

	else if (!hasSelectedPrice) {

		actionHtml = `

			<button
				type="button"
				class="
					subscription-plan-active-button
				"
				disabled>

				<i class="
					bi
					bi-exclamation-triangle-fill
					me-1
				"></i>

				Not Available

			</button>


			<div class="
				subscription-plan-action-note
			">

				${escapeHtml(
			selectedBillingCycle
		)}

				pricing is not configured
				for this plan.

			</div>
		`;

	}

	/*
	 * ========================================================
	 * AVAILABLE
	 * ========================================================
	 */

	else {

		const buttonText =
			currentPlan
				? 'Change Billing Cycle'
				: 'Subscribe';


		const encodedPlan =
			encodeURIComponent(
				JSON.stringify({

					planCode:
						planCode,

					billingCycle:
						selectedBillingCycle
				})
			);


		actionHtml = `

			<button
				type="button"
				id="subscribePlanBtn_${index}"
				class="
					btn
					btn-medi
					w-100
					subscription-plan-subscribe-btn
				"
				data-plan="${encodedPlan}"
				onclick="
					subscribePlanFromButton(this)
				">

				<i class="
					bi
					bi-credit-card-fill
					me-1
				"></i>

				${buttonText}

			</button>
		`;
	}


	return `

		<article
			class="
				subscription-plan-item
				${currentPlan
			? 'current-plan'
			: ''}
			"
			style="
				animation-delay:
				${Math.min(
				index * 70,
				350
			)}ms;
			">


			${currentPlan
			? `
					<span class="
						subscription-plan-current-badge
					">

						<i class="
							bi
							bi-check-circle-fill
						"></i>

						Current

					</span>
				`
			: ''
		}


			<div class="
				subscription-plan-header
			">

				<div>

					<h4 class="
						subscription-plan-name
					">

						${safe(planName)}

					</h4>


					<div class="
						subscription-plan-code
					">

						${safe(planCode)}

						•

						${safe(planRole)}

					</div>

				</div>


				<span class="
					subscription-plan-cycle
				">

					<i class="
						bi
						bi-arrow-repeat
					"></i>

					${escapeHtml(
			selectedBillingCycle
		)}

				</span>

			</div>


			<div class="
				subscription-plan-price
			">

				${hasSelectedPrice
			? `₹${escapeHtml(price)}`
			: 'Not configured'
		}

				${hasSelectedPrice
			? `
						<small>
							/${escapeHtml(cycleText)}
						</small>
					`
			: ''
		}

			</div>


			<ul class="
				subscription-plan-benefits
			">

				${renderLimitBenefit(
			'Max Medicines',
			getMaxMedicines(plan),
			'bi-capsule-pill'
		)}


				${renderLimitBenefit(
			'Max Appointments',
			getMaxAppointments(plan),
			'bi-calendar-check-fill'
		)}


				${renderLimitBenefit(
			'Max Staff',
			getMaxStaff(plan),
			'bi-people-fill'
		)}


				${renderBooleanBenefit(
			'Online Consultation',
			isVideoConsultationAllowed(plan),
			'bi-camera-video-fill'
		)}


				${renderBooleanBenefit(
			'Reports',
			isReportsEnabled(plan),
			'bi-bar-chart-fill'
		)}


				${renderBooleanBenefit(
			'Priority Support',
			isPrioritySupportEnabled(plan),
			'bi-headset'
		)}

			</ul>


			<div class="
				subscription-plan-action
			">

				${actionHtml}

			</div>

		</article>
	`;
}


/* ============================================================
   CURRENT PLAN
============================================================ */

function isCurrentPlan(
	planCode
) {

	if (!currentSubscription) {
		return false;
	}


	const currentPlan =
		currentSubscription.plan &&
			typeof currentSubscription.plan === 'object'
			? currentSubscription.plan
			: {};


	const currentPlanCode =
		currentSubscription.planCode
		||
		currentPlan.planCode
		||
		'';


	return (
		String(currentPlanCode)
			.trim()
			.toUpperCase()
		===
		String(planCode || '')
			.trim()
			.toUpperCase()
	);
}


/* ============================================================
   CURRENT BILLING CYCLE
============================================================ */

function getCurrentBillingCycle() {

	if (!currentSubscription) {
		return '';
	}


	const plan =
		currentSubscription.plan &&
			typeof currentSubscription.plan === 'object'
			? currentSubscription.plan
			: {};


	return String(
		currentSubscription.billingCycle
		||
		plan.billingCycle
		||
		''
	)
		.trim()
		.toUpperCase();
}


/* ============================================================
   SELECTED PLAN PRICE
============================================================ */

function getSelectedPlanPrice(
	plan,
	billingCycle
) {

	let price;


	if (
		billingCycle === 'YEARLY'
	) {

		price =
			plan.yearlyPrice
			??
			plan.yearly_price;

	} else {

		price =
			plan.monthlyPrice
			??
			plan.monthly_price;
	}


	if (
		price === null ||
		price === undefined ||
		Number(price) <= 0
	) {

		/*
		 * Legacy fallback.
		 */
		if (
			plan.price !== null &&
			plan.price !== undefined &&
			Number(plan.price) > 0
		) {

			return Number(
				plan.price
			).toFixed(2);
		}


		return null;
	}


	return Number(
		price
	).toFixed(2);
}


/* ============================================================
   SUBSCRIBE BUTTON
============================================================ */

function subscribePlanFromButton(
	button
) {

	if (!button) {

		showMsg(
			'Invalid plan selected.'
		);

		return;
	}


	const encodedPlan =
		button.getAttribute(
			'data-plan'
		);


	if (!encodedPlan) {

		showMsg(
			'Invalid plan selected.'
		);

		return;
	}


	try {

		const plan =
			JSON.parse(
				decodeURIComponent(
					encodedPlan
				)
			);


		subscribePlan(
			plan.planCode,
			plan.billingCycle,
			button
		);


	} catch (error) {

		console.error(
			'Unable to read selected subscription plan:',
			error
		);


		showMsg(
			'Invalid plan selected.'
		);
	}
}


/* ============================================================
   START SUBSCRIPTION PAYMENT
============================================================ */

async function subscribePlan(
	planCode,
	billingCycle,
	button
) {

	if (isSubscribingPlan) {
		return;
	}


	/*
	 * ========================================================
	 * WORKSPACE
	 * ========================================================
	 */

	const tenantId =
		getSelectedTenantId();


	if (!tenantId) {

		showWorkspaceRequiredState();

		return;
	}


	/*
	 * ========================================================
	 * TOKEN
	 * ========================================================
	 */

	const token =
		localStorage.getItem('token');


	if (!token) {

		showMsg(
			'Login token not found. Please login again.'
		);

		return;
	}


	/*
	 * ========================================================
	 * PLAN VALUES
	 * ========================================================
	 */

	const selectedPlanCode =
		String(
			planCode || ''
		)
			.trim();


	const selectedBillingCycle =
		String(
			billingCycle || ''
		)
			.trim()
			.toUpperCase();


	if (
		!selectedPlanCode ||
		selectedPlanCode === '-'
	) {

		showMsg(
			'Invalid plan selected.'
		);

		return;
	}


	if (
		selectedBillingCycle !== 'MONTHLY' &&
		selectedBillingCycle !== 'YEARLY'
	) {

		showMsg(
			'Invalid billing cycle selected.'
		);

		return;
	}


	/*
	 * ========================================================
	 * VERIFY PLAN STILL EXISTS
	 * ========================================================
	 */

	const selectedPlan =
		subscriptionPlans.find(
			function(plan) {

				return (
					getPlanCode(plan)
						.trim()
						.toUpperCase()
					===
					selectedPlanCode
						.trim()
						.toUpperCase()
				);
			}
		);


	if (!selectedPlan) {

		showMsg(
			'Selected plan is no longer available. Please refresh plans.'
		);

		return;
	}


	/*
	 * ========================================================
	 * PRICE
	 * ========================================================
	 */

	const price =
		getSelectedPlanPrice(
			selectedPlan,
			selectedBillingCycle
		);


	if (price === null) {

		showMsg(
			`${selectedBillingCycle} pricing is not configured for this plan.`
		);

		return;
	}


	/*
	 * ========================================================
	 * CONFIRM
	 * ========================================================
	 */

	const workspaceName =
		localStorage.getItem('tenantName')
		|| 'Selected Workspace';


	const currentPlan =
		isCurrentPlan(
			selectedPlanCode
		);


	const currentCycle =
		getCurrentBillingCycle();


	let confirmationMessage;


	if (
		currentPlan &&
		currentCycle !== selectedBillingCycle
	) {

		confirmationMessage =
			'Change billing cycle for ' +
			selectedPlanCode +
			' to ' +
			selectedBillingCycle +
			'?\n\n' +
			'Workspace: ' +
			workspaceName +
			'\n\n' +
			'Amount: ₹' +
			price;

	} else {

		confirmationMessage =
			'Subscribe this workspace to ' +
			selectedPlanCode +
			' (' +
			selectedBillingCycle +
			')?\n\n' +
			'Workspace: ' +
			workspaceName +
			'\n\n' +
			'Amount: ₹' +
			price;
	}


	if (
		!confirm(
			confirmationMessage
		)
	) {

		return;
	}


	/*
	 * ========================================================
	 * PAYMENT START
	 * ========================================================
	 */

	isSubscribingPlan = true;


	setAllSubscribeButtonsDisabled(
		true
	);


	setElementLoading(
		button,
		'Processing...',
		true
	);


	try {

		/*
		 * IMPORTANT:
		 *
		 * SaaS payment request includes tenantId.
		 *
		 * Backend validates that the authenticated user
		 * can access this tenant.
		 */
		const response =
			await fetch(
				`${API_BASE}/billing/subscriptions/subscribe`,
				{
					method: 'POST',

					headers: {

						'Content-Type':
							'application/json',

						'Authorization':
							'Bearer ' + token,

						'Accept':
							'application/json'
					},

					body:
						JSON.stringify({

							tenantId:
								tenantId,

							planCode:
								selectedPlanCode,

							billingCycle:
								selectedBillingCycle
						})
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
					'Unable to initiate subscription.'
				)
			);

			return;
		}


		/*
		 * ======================================================
		 * PHONEPE
		 * ======================================================
		 */

		if (
			result &&
			result.redirectUrl
		) {

			window.location.href =
				result.redirectUrl;

			return;
		}


		showMsg(
			getApiErrorMessage(
				result,
				'Subscription payment initiated successfully.'
			),
			'success'
		);


	} catch (error) {

		console.error(
			'Unable to initiate workspace subscription:',
			error
		);


		showMsg(
			'Billing service not reachable.'
		);


	} finally {

		isSubscribingPlan =
			false;


		setElementLoading(
			button,
			'Subscribe',
			false
		);


		setAllSubscribeButtonsDisabled(
			false
		);
	}
}


/* ============================================================
   DISABLE SUBSCRIBE BUTTONS
============================================================ */

function setAllSubscribeButtonsDisabled(
	disabled
) {

	document
		.querySelectorAll(
			'.subscription-plan-subscribe-btn'
		)
		.forEach(
			function(button) {

				button.disabled =
					disabled;
			}
		);
}


/* ============================================================
   PLAN CODE
============================================================ */

function getPlanCode(plan) {

	return (
		plan?.planCode
		||
		plan?.plan_code
		||
		plan?.code
		||
		''
	);
}


/* ============================================================
   PLAN LIMITS
============================================================ */

function getMaxMedicines(plan) {

	return Number(
		plan.maxMedicines
		??
		plan.max_medicines
		??
		plan.maxProducts
		??
		0
	);
}


function getMaxAppointments(plan) {

	return Number(
		plan.maxAppointments
		??
		plan.max_appointments
		??
		0
	);
}


function getMaxStaff(plan) {

	return Number(
		plan.maxStaff
		??
		plan.max_staff
		??
		plan.maxDoctors
		??
		0
	);
}


/* ============================================================
   PLAN BENEFITS
============================================================ */

function isVideoConsultationAllowed(plan) {

	return Boolean(
		plan.videoConsultationAllowed
		??
		plan.video_consultation_allowed
		??
		plan.onlineConsultationEnabled
		??
		false
	);
}


function isReportsEnabled(plan) {

	return Boolean(
		plan.reportsEnabled
		??
		plan.reports_enabled
		??
		false
	);
}


function isPrioritySupportEnabled(plan) {

	return Boolean(
		plan.prioritySupportEnabled
		??
		plan.priority_support_enabled
		??
		false
	);
}


/* ============================================================
   LIMIT BENEFIT
============================================================ */

function renderLimitBenefit(
	label,
	value,
	icon
) {

	const numberValue =
		Number(value) || 0;


	if (numberValue <= 0) {
		return '';
	}


	return `

		<li class="subscription-plan-benefit">

			<span class="
				subscription-plan-benefit-icon
				enabled
			">

				<i class="
					bi
					${escapeHtml(icon)}
				"></i>

			</span>

			${escapeHtml(label)}:

			<strong>
				${escapeHtml(numberValue)}
			</strong>

		</li>
	`;
}


/* ============================================================
   BOOLEAN BENEFIT
============================================================ */

function renderBooleanBenefit(
	label,
	enabled,
	icon
) {

	return `

		<li class="subscription-plan-benefit">

			<span class="
				subscription-plan-benefit-icon
				${enabled
			? 'enabled'
			: 'disabled'}
			">

				<i class="
					bi
					${enabled
			? escapeHtml(icon)
			: 'bi-x-lg'}
				"></i>

			</span>

			${escapeHtml(label)}

		</li>
	`;
}


/* ============================================================
   PLAN SUMMARY
============================================================ */

function updatePlanSummary() {

	setAnimatedNumber(
		'availablePlanCount',
		subscriptionPlans.length
	);


	setAnimatedNumber(
		'monthlyPlanCount',
		subscriptionPlans.filter(
			function(plan) {

				return (
					getSelectedPlanPrice(
						plan,
						'MONTHLY'
					) !== null
				);
			}
		).length
	);


	setAnimatedNumber(
		'yearlyPlanCount',
		subscriptionPlans.filter(
			function(plan) {

				return (
					getSelectedPlanPrice(
						plan,
						'YEARLY'
					) !== null
				);
			}
		).length
	);
}


function resetPlanSummary() {

	setText(
		'availablePlanCount',
		'0'
	);

	setText(
		'monthlyPlanCount',
		'0'
	);

	setText(
		'yearlyPlanCount',
		'0'
	);
}


/* ============================================================
   LOADING STATE
============================================================ */

function showPlansLoadingState() {

	const container =
		document.getElementById(
			'plansContainer'
		);


	if (!container) {
		return;
	}


	container.innerHTML = `

		<div class="
			subscription-plans-state
		">

			<div class="
				subscription-plans-state-icon
				subscription-plans-loading
			">

				<i class="bi bi-gem"></i>

			</div>


			<h5 class="
				fw-bold
				text-primary
			">

				Loading subscription plans

			</h5>


			<p class="
				text-muted
				mb-0
			">

				Please wait while we prepare
				available plans for your role.

			</p>

		</div>
	`;
}


/* ============================================================
   ERROR STATE
============================================================ */

function showPlansErrorState(
	message
) {

	const container =
		document.getElementById(
			'plansContainer'
		);


	if (!container) {
		return;
	}


	container.innerHTML = `

		<div class="
			subscription-plans-state
		">

			<div class="
				subscription-plans-state-icon
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

				Unable to load plans

			</h5>


			<p class="
				text-muted
				mb-0
			">

				${escapeHtml(message)}

			</p>

		</div>
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


/* ============================================================
   CLEAR PAGE
============================================================ */

function clearPlansPage() {

	currentSubscription = null;

	subscriptionPlans = [];

	resetPlanSummary();

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


/* ============================================================
   CLEAR MESSAGE
============================================================ */

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

			${escapeHtml(
			loadingText
		)}
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
   ANIMATED NUMBER
============================================================ */

function setAnimatedNumber(
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


	const target =
		Number(value) || 0;


	const start =
		Number(
			element.textContent
		) || 0;


	const difference =
		target - start;


	const duration =
		500;


	const startTime =
		performance.now();


	if (
		difference === 0
		||
		window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches
	) {

		element.textContent =
			target;

		return;
	}


	function update(currentTime) {

		const progress =
			Math.min(
				(
					currentTime -
					startTime
				) / duration,
				1
			);


		const eased =
			1 -
			Math.pow(
				1 - progress,
				3
			);


		element.textContent =
			Math.round(
				start +
				difference * eased
			);


		if (
			progress < 1
		) {

			requestAnimationFrame(
				update
			);
		}
	}


	requestAnimationFrame(
		update
	);
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


	if (element) {

		element.innerText =
			value === null ||
				value === undefined ||
				value === ''
				? '-'
				: value;
	}
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