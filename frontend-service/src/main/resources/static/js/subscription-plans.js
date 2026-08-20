'use strict';

/* ============================================================
   PLATFORM SUBSCRIPTION PLANS
   MediRevolution

   IMPORTANT:
   This page is PLATFORM level.

   Therefore:
   - tenantId is NEVER sent
   - current subscription = tenantId NULL
   - subscribe request = no tenantId
   - cancellation is handled on current subscription page
============================================================ */


/* ============================================================
   GLOBAL STATE
============================================================ */

let subscriptionPlans = [];

let currentSubscription = null;

let isLoadingSubscriptionPlans = false;
let isLoadingCurrentSubscription = false;
let isSubscribingPlan = false;

let selectedBillingCycle = 'MONTHLY';


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

			showMsg(
				'Login token not found. Please login again.'
			);

			showPlansErrorState(
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
		 * ROLE SUMMARY
		 * --------------------------------------------------------
		 */

		setText(
			'subscriptionRoleSummary',
			normalizeRole(
				localStorage.getItem('role')
			) || '-'
		);


		/*
		 * --------------------------------------------------------
		 * BILLING BUTTONS
		 * --------------------------------------------------------
		 */

		updateBillingCycleButtons();


		/*
		 * --------------------------------------------------------
		 * CURRENT PLATFORM SUBSCRIPTION
		 *
		 * Used only for:
		 *
		 * - current plan badge
		 * - current subscription information
		 *
		 * It must NOT block plans loading.
		 * --------------------------------------------------------
		 */

		await loadCurrentSubscriptionForPlans();


		/*
		 * --------------------------------------------------------
		 * PLAN LIST
		 * --------------------------------------------------------
		 */

		await loadPlans();

	}
);


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
   LOAD CURRENT PLATFORM SUBSCRIPTION
============================================================ */

async function loadCurrentSubscriptionForPlans() {

	if (isLoadingCurrentSubscription) {
		return;
	}


	const token =
		localStorage.getItem('token');


	if (!token) {
		return;
	}


	isLoadingCurrentSubscription = true;


	try {

		/*
		 * IMPORTANT:
		 *
		 * Platform request.
		 *
		 * NO tenantId.
		 *
		 * Backend receives:
		 *
		 * tenantId = null
		 *
		 * and searches:
		 *
		 * s.tenantId IS NULL
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
		 * --------------------------------------------------------
		 * No current platform subscription.
		 * This is perfectly valid on plans page.
		 * --------------------------------------------------------
		 */

		if (!response.ok) {

			currentSubscription =
				null;

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

		} else {

			currentSubscription =
				null;
		}

	} catch (error) {

		console.warn(
			'Unable to load current platform subscription:',
			error
		);

		currentSubscription =
			null;

	} finally {

		isLoadingCurrentSubscription =
			false;
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
   BILLING BUTTON STATE
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


	const token =
		localStorage.getItem('token');


	const role =
		normalizeRole(
			localStorage.getItem('role')
		);


	if (!token) {

		showMsg(
			'Login token not found. Please login again.'
		);

		return;
	}


	if (!role) {

		showMsg(
			'User role not found.'
		);

		return;
	}


	if (!requireSubscriptionRole()) {
		return;
	}


	isLoadingSubscriptionPlans =
		true;


	showPlansLoadingState();


	setButtonLoading(
		'refreshPlansBtn',
		'Refreshing...',
		true
	);


	try {

		/*
		 * Plans are role based.
		 *
		 * No tenantId is required for platform plans.
		 */

		const response =
			await fetch(
				`${API_BASE}/billing/subscriptions/plans/${encodeURIComponent(role)}`,
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

			subscriptionPlans =
				[];


			const message =
				getApiErrorMessage(
					result,
					'Unable to load subscription plans.'
				);


			showMsg(
				message
			);


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
		 * Backend already sends active plans.
		 *
		 * Additional frontend safety.
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


		subscriptionPlans =
			[];


		showMsg(
			'Billing service not reachable.'
		);


		showPlansErrorState(
			'Billing service not reachable.'
		);


		updatePlanSummary();


	} finally {

		isLoadingSubscriptionPlans =
			false;


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

			<div
				class="
					subscription-plans-state
				">

				<div
					class="
						subscription-plans-state-icon
					">

					<i class="
						bi
						bi-inbox-fill
					"></i>

				</div>


				<h5
					class="
						fw-bold
						text-primary
					">

					No plans found

				</h5>


				<p
					class="
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
   RENDER ONE PLAN
============================================================ */

function renderPlanCard(
	plan,
	index
) {

	const planCode =
		getPlanCode(plan);


	const planName =
		getPlanName(plan);


	const planRole =
		getPlanRole(plan);


	const selectedPrice =
		getSelectedPlanPrice(
			plan,
			selectedBillingCycle
		);


	const hasPrice =
		selectedPrice !== null;


	const currentPlan =
		isCurrentPlan(
			planCode
		);


	const cycleText =
		selectedBillingCycle === 'YEARLY'
			? 'year'
			: 'month';


	const actionHtml =
		renderPlanAction(
			plan,
			planCode,
			currentPlan,
			hasPrice,
			selectedPrice
		);


	const currentBadgeHtml =
		currentPlan
			? `

				<span
					class="
						subscription-plan-current-badge
					">

					<i
						class="
							bi
							bi-check-circle-fill
						">
					</i>

					Current

				</span>
			`
			: '';


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


			${currentBadgeHtml}


			<div
				class="
					subscription-plan-header
				">


				<div>

					<h4
						class="
							subscription-plan-name
						">

						${safe(planName)}

					</h4>


					<div
						class="
							subscription-plan-code
						">

						${safe(planCode)}

						•

						${safe(planRole)}

					</div>

				</div>


				<span
					class="
						subscription-plan-cycle
					">

					<i
						class="
							bi
							bi-arrow-repeat
						">
					</i>

					${escapeHtml(
				selectedBillingCycle
			)}

				</span>

			</div>


			<div
				class="
					subscription-plan-price
				">

				${hasPrice
			? `₹${escapeHtml(selectedPrice)}`
			: 'Not configured'
		}


				${hasPrice
			? `
							<small>
								/${escapeHtml(cycleText)}
							</small>
						`
			: ''
		}

			</div>


			<ul
				class="
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


			<div
				class="
					subscription-plan-action
				">

				${actionHtml}

			</div>

		</article>
	`;
}


/* ============================================================
   PLAN ACTION
============================================================ */

function renderPlanAction(
	plan,
	planCode,
	currentPlan,
	hasPrice,
	price
) {

	/*
	 * ----------------------------------------------------------
	 * PRICE NOT AVAILABLE
	 * ----------------------------------------------------------
	 */

	if (!hasPrice) {

		return `

			<button
				type="button"
				class="
					subscription-plan-active-button
				"
				disabled>

				<i
					class="
						bi
						bi-exclamation-triangle-fill
						me-1
					">
				</i>

				Not Available

			</button>


			<div
				class="
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
	 * ----------------------------------------------------------
	 * PLAN AVAILABLE
	 *
	 * INCLUDING CURRENT PLAN
	 * ----------------------------------------------------------
	 */

	const buttonText =
		currentPlan
			? 'Renew / Extend'
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


	const note =
		currentPlan
			? 'Your new subscription period will be scheduled after the current active period.'
			: 'Continue to payment for this platform plan.';


	return `

		<button
			type="button"
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


			<i
				class="
					bi
					bi-credit-card-fill
					me-1
				">
			</i>

			${buttonText}

		</button>


		<div
			class="
				subscription-plan-action-note
			">

			${escapeHtml(note)}

		</div>
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
		currentSubscription.plan_code
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
   PLAN VALUES
============================================================ */

function getPlanCode(
	plan
) {

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


function getPlanName(
	plan
) {

	return (
		plan?.planName
		||
		plan?.plan_name
		||
		'-'
	);
}


function getPlanRole(
	plan
) {

	return (
		plan?.role
		||
		plan?.planRole
		||
		'-'
	);
}


/* ============================================================
   PRICE
============================================================ */

function getSelectedPlanPrice(
	plan,
	billingCycle
) {

	let price;


	if (
		billingCycle ===
		'YEARLY'
	) {

		price =
			plan?.yearlyPrice
			??
			plan?.yearly_price;

	} else {

		price =
			plan?.monthlyPrice
			??
			plan?.monthly_price;
	}


	/*
	 * Cycle-specific price.
	 */

	if (
		price !== null &&
		price !== undefined &&
		Number(price) > 0
	) {

		return Number(
			price
		).toFixed(2);
	}


	/*
	 * Legacy fallback.
	 */

	if (
		plan?.price !== null &&
		plan?.price !== undefined &&
		Number(plan.price) > 0
	) {

		return Number(
			plan.price
		).toFixed(2);
	}


	return null;
}


/* ============================================================
   SUBSCRIBE FROM BUTTON
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
			'Unable to read selected plan:',
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


	const token =
		localStorage.getItem(
			'token'
		);


	/*
	 * ----------------------------------------------------------
	 * TOKEN
	 * ----------------------------------------------------------
	 */

	if (!token) {

		showMsg(
			'Login token not found. Please login again.'
		);

		return;
	}


	/*
	 * ----------------------------------------------------------
	 * PLAN CODE
	 * ----------------------------------------------------------
	 */

	const selectedPlanCode =
		String(
			planCode || ''
		)
			.trim();


	if (
		!selectedPlanCode ||
		selectedPlanCode === '-'
	) {

		showMsg(
			'Invalid plan selected.'
		);

		return;
	}


	/*
	 * ----------------------------------------------------------
	 * BILLING CYCLE
	 * ----------------------------------------------------------
	 */

	const selectedBillingCycle =
		String(
			billingCycle || ''
		)
			.trim()
			.toUpperCase();


	if (
		selectedBillingCycle !== 'MONTHLY'
		&&
		selectedBillingCycle !== 'YEARLY'
	) {

		showMsg(
			'Invalid billing cycle selected.'
		);

		return;
	}


	/*
	 * ----------------------------------------------------------
	 * FIND PLAN
	 * ----------------------------------------------------------
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
	 * ----------------------------------------------------------
	 * PRICE
	 * ----------------------------------------------------------
	 */

	const price =
		getSelectedPlanPrice(
			selectedPlan,
			selectedBillingCycle
		);


	if (price === null) {

		showMsg(
			selectedBillingCycle +
			' pricing is not configured for this plan.'
		);

		return;
	}


	/*
	 * ----------------------------------------------------------
	 * CURRENT PLAN
	 * ----------------------------------------------------------
	 */

	const currentPlan =
		isCurrentPlan(
			selectedPlanCode
		);


	/*
	 * ----------------------------------------------------------
	 * CONFIRM
	 * ----------------------------------------------------------
	 */

	let confirmationMessage;


	if (currentPlan) {

		confirmationMessage =
			'Renew / extend your ' +
			selectedPlanCode +
			' subscription?\n\n' +
			'Billing cycle: ' +
			selectedBillingCycle +
			'\n' +
			'Amount: ₹' +
			price +
			'\n\n' +
			'The new subscription period will be scheduled after your current active period.';

	} else {

		confirmationMessage =
			'Subscribe to ' +
			selectedPlanCode +
			' (' +
			selectedBillingCycle +
			')?\n\n' +
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
	 * ----------------------------------------------------------
	 * START REQUEST
	 * ----------------------------------------------------------
	 */

	isSubscribingPlan =
		true;


	setAllSubscribeButtonsDisabled(
		true
	);


	setElementLoading(
		button,
		currentPlan
			? 'Processing...'
			: 'Processing...',
		true
	);


	try {

		/*
		 * =======================================================
		 * PLATFORM SUBSCRIBE REQUEST
		 *
		 * IMPORTANT:
		 *
		 * tenantId is intentionally NOT included.
		 *
		 * Backend will create:
		 *
		 * UserSubscription.tenantId = NULL
		 * =======================================================
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
					'Unable to initiate subscription payment.'
				)
			);

			return;
		}


		/*
		 * ------------------------------------------------------
		 * PHONEPE REDIRECT
		 * ------------------------------------------------------
		 */

		if (
			result &&
			result.redirectUrl
		) {

			window.location.href =
				result.redirectUrl;

			return;
		}


		/*
		 * ------------------------------------------------------
		 * NO REDIRECT
		 * ------------------------------------------------------
		 */

		showMsg(
			getApiErrorMessage(
				result,
				'Subscription payment initiated successfully.'
			),
			'success'
		);


	} catch (error) {

		console.error(
			'Unable to initiate subscription payment:',
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
			currentPlan
				? 'Renew / Extend'
				: 'Subscribe',
			false
		);


		setAllSubscribeButtonsDisabled(
			false
		);
	}
}


/* ============================================================
   LIMITS
============================================================ */

function getMaxMedicines(
	plan
) {

	return Number(
		plan?.maxMedicines
		??
		plan?.max_medicines
		??
		plan?.maxProducts
		??
		0
	);
}


function getMaxAppointments(
	plan
) {

	return Number(
		plan?.maxAppointments
		??
		plan?.max_appointments
		??
		0
	);
}


function getMaxStaff(
	plan
) {

	return Number(
		plan?.maxStaff
		??
		plan?.max_staff
		??
		plan?.maxDoctors
		??
		0
	);
}


/* ============================================================
   BENEFITS
============================================================ */

function isVideoConsultationAllowed(
	plan
) {

	return Boolean(
		plan?.videoConsultationAllowed
		??
		plan?.video_consultation_allowed
		??
		plan?.onlineConsultationEnabled
		??
		false
	);
}


function isReportsEnabled(
	plan
) {

	return Boolean(
		plan?.reportsEnabled
		??
		plan?.reports_enabled
		??
		false
	);
}


function isPrioritySupportEnabled(
	plan
) {

	return Boolean(
		plan?.prioritySupportEnabled
		??
		plan?.priority_support_enabled
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


	if (
		numberValue <= 0
	) {

		return '';
	}


	return `

		<li
			class="
				subscription-plan-benefit
			">


			<span
				class="
					subscription-plan-benefit-icon
					enabled
				">

				<i
					class="
						bi
						${escapeHtml(icon)}
					">
				</i>

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

		<li
			class="
				subscription-plan-benefit
			">


			<span
				class="
					subscription-plan-benefit-icon
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


/* ============================================================
   DISABLE ALL SUBSCRIBE BUTTONS
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

		<div
			class="
				subscription-plans-state
			">


			<div
				class="
					subscription-plans-state-icon
					subscription-plans-loading
				">

				<i class="
					bi
					bi-gem
				"></i>

			</div>


			<h5
				class="
					fw-bold
					text-primary
				">

				Loading subscription plans

			</h5>


			<p
				class="
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

		<div
			class="
				subscription-plans-state
			">


			<div
				class="
					subscription-plans-state-icon
					bg-danger
				">

				<i
					class="
						bi
						bi-exclamation-triangle-fill
					">
				</i>

			</div>


			<h5
				class="
					fw-bold
					text-danger
				">

				Unable to load plans

			</h5>


			<p
				class="
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
			button.dataset.originalHtml
			||
			button.innerHTML;


		button.disabled =
			false;
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


	function update(
		currentTime
	) {

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