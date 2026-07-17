let subscriptionPlans = [];

let isLoadingSubscriptionPlans = false;
let isSubscribingPlan = false;

document.addEventListener("DOMContentLoaded", async function() {

	const allowed =
		requireSubscriptionRole();

	if (!allowed) {
		return;
	}

	setText(
		"subscriptionRoleSummary",
		localStorage.getItem("role") || "-"
	);

	await loadPlans();
});


function requireSubscriptionRole() {

	const role =
		localStorage.getItem("role");

	const allowedRoles = [
		"WHOLESALER",
		"DOCTOR",
		"HOSPITAL"
	];

	if (!allowedRoles.includes(role)) {

		alert(
			"Subscription is available only for Wholesaler, Doctor and Hospital."
		);

		window.location.href = "/dashboard";

		return false;
	}

	return true;
}


async function loadPlans() {

	if (isLoadingSubscriptionPlans) {
		return;
	}

	isLoadingSubscriptionPlans = true;

	const token =
		localStorage.getItem("token");

	const role =
		localStorage.getItem("role");

	showPlansLoadingState();

	setButtonLoading(
		"refreshPlansBtn",
		"Refreshing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/billing/subscriptions/plans/${encodeURIComponent(role)}`,
			{
				method: "GET",

				headers: {
					"Authorization":
						"Bearer " + token,

					"Accept":
						"application/json"
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
					"Unable to load subscription plans."
				);

			showMsg(message);
			showPlansErrorState(message);
			updatePlanSummary();

			return;
		}

		subscriptionPlans =
			Array.isArray(result)
				? result
				: [];

		renderPlans();
		updatePlanSummary();

	} catch (error) {

		console.error(
			"Unable to load subscription plans:",
			error
		);

		subscriptionPlans = [];

		showMsg(
			"Billing service not reachable."
		);

		showPlansErrorState(
			"Billing service not reachable."
		);

		updatePlanSummary();

	} finally {

		isLoadingSubscriptionPlans = false;

		setButtonLoading(
			"refreshPlansBtn",
			"Refresh",
			false
		);
	}
}


function renderPlans() {

	const container =
		document.getElementById(
			"plansContainer"
		);

	if (!container) {
		return;
	}

	if (!subscriptionPlans.length) {

		container.innerHTML = `
			<div class="subscription-plans-state">

				<div class="subscription-plans-state-icon">
					<i class="bi bi-inbox-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">
					No plans found
				</h5>

				<p class="text-muted mb-0">
					No subscription plans are available for your role.
				</p>

			</div>
		`;

		return;
	}

	container.innerHTML =
		subscriptionPlans.map(
			function(plan, index) {

				const planCode =
					getPlanCode(plan);

				const billingCycle =
					getBillingCycle(plan);

				const price =
					getPlanPrice(plan);

				const cycleText =
					billingCycle === "YEARLY"
						? "year"
						: "month";

				const planData =
					encodeURIComponent(
						JSON.stringify({
							planCode: planCode,
							billingCycle: billingCycle
						})
					);

				return `
					<article class="subscription-plan-item"
							 style="animation-delay:${Math.min(index * 70, 350)}ms">

						<div class="subscription-plan-header">

							<div>

								<h4 class="subscription-plan-name">
									${safe(plan.planName)}
								</h4>

								<div class="subscription-plan-code">
									${safe(planCode)} • ${safe(plan.role)}
								</div>

							</div>

							<span class="subscription-plan-cycle">
								<i class="bi bi-arrow-repeat"></i>
								${safe(billingCycle)}
							</span>

						</div>

						<div class="subscription-plan-price">
							₹${escapeHtml(price)}
							<small>/${escapeHtml(cycleText)}</small>
						</div>

						<ul class="subscription-plan-benefits">

							${renderLimitBenefit(
					"Max Medicines",
					getMaxMedicines(plan),
					"bi-capsule-pill"
				)}

							${renderLimitBenefit(
					"Max Appointments",
					getMaxAppointments(plan),
					"bi-calendar-check-fill"
				)}

							${renderLimitBenefit(
					"Max Staff",
					getMaxStaff(plan),
					"bi-people-fill"
				)}

							${renderBooleanBenefit(
					"Online Consultation",
					isVideoConsultationAllowed(plan),
					"bi-camera-video-fill"
				)}

							${renderBooleanBenefit(
					"Reports",
					isReportsEnabled(plan),
					"bi-bar-chart-fill"
				)}

							${renderBooleanBenefit(
					"Priority Support",
					isPrioritySupportEnabled(plan),
					"bi-headset"
				)}

						</ul>

						<div class="subscription-plan-action">

							<button type="button"
									id="subscribePlanBtn_${index}"
									class="btn btn-medi w-100"
									data-plan="${planData}"
									onclick="subscribePlanFromButton(this)">

								<i class="bi bi-credit-card-fill me-1"></i>
								Subscribe
							</button>

						</div>

					</article>
				`;
			}
		).join("");
}


function renderLimitBenefit(
	label,
	value,
	icon
) {

	const numberValue =
		Number(value) || 0;

	if (numberValue <= 0) {
		return "";
	}

	return `
		<li class="subscription-plan-benefit">

			<span class="subscription-plan-benefit-icon enabled">
				<i class="bi ${escapeHtml(icon)}"></i>
			</span>

			${escapeHtml(label)}:
			<strong>${escapeHtml(numberValue)}</strong>

		</li>
	`;
}


function renderBooleanBenefit(
	label,
	enabled,
	icon
) {

	return `
		<li class="subscription-plan-benefit">

			<span class="subscription-plan-benefit-icon ${enabled ? "enabled" : "disabled"}">
				<i class="bi ${enabled ? escapeHtml(icon) : "bi-x-lg"}"></i>
			</span>

			${escapeHtml(label)}

		</li>
	`;
}


function subscribePlanFromButton(button) {

	if (!button) {

		showMsg(
			"Invalid plan selected."
		);

		return;
	}

	const encodedPlan =
		button.getAttribute(
			"data-plan"
		);

	if (!encodedPlan) {

		showMsg(
			"Invalid plan selected."
		);

		return;
	}

	try {

		const plan =
			JSON.parse(
				decodeURIComponent(encodedPlan)
			);

		subscribePlan(
			plan.planCode,
			plan.billingCycle,
			button
		);

	} catch (error) {

		console.error(
			"Unable to read selected subscription plan:",
			error
		);

		showMsg(
			"Invalid plan selected."
		);
	}
}


async function subscribePlan(
	planCode,
	billingCycle,
	button
) {

	if (isSubscribingPlan) {
		return;
	}

	const token =
		localStorage.getItem("token");

	const selectedPlanCode =
		String(
			planCode || ""
		).trim();

	const selectedBillingCycle =
		String(
			billingCycle || ""
		).trim();

	if (
		!selectedPlanCode ||
		selectedPlanCode === "-"
	) {

		showMsg(
			"Invalid plan selected."
		);

		return;
	}

	if (!selectedBillingCycle) {

		showMsg(
			"Invalid billing cycle selected."
		);

		return;
	}

	if (
		!confirm(
			"Subscribe to " +
			selectedPlanCode +
			"?"
		)
	) {
		return;
	}

	isSubscribingPlan = true;

	setElementLoading(
		button,
		"Processing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/billing/subscriptions/subscribe`,
			{
				method: "POST",

				headers: {
					"Content-Type":
						"application/json",

					"Authorization":
						"Bearer " + token,

					"Accept":
						"application/json"
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
			await safeJson(response);

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to initiate subscription."
				)
			);

			return;
		}

		if (result.redirectUrl) {

			window.location.href =
				result.redirectUrl;

			return;
		}

		showMsg(
			"Subscription initiated successfully.",
			"success"
		);

	} catch (error) {

		console.error(
			"Unable to initiate subscription:",
			error
		);

		showMsg(
			"Billing service not reachable."
		);

	} finally {

		isSubscribingPlan = false;

		setElementLoading(
			button,
			"Subscribe",
			false
		);
	}
}


function getPlanCode(plan) {

	return (
		plan?.planCode ||
		plan?.plan_code ||
		plan?.code ||
		""
	);
}


function getBillingCycle(plan) {

	const code =
		getPlanCode(plan)
			.toUpperCase();

	if (plan?.billingCycle) {

		return String(
			plan.billingCycle
		).toUpperCase();
	}

	if (code.includes("YEARLY")) {
		return "YEARLY";
	}

	return "MONTHLY";
}


function getPlanPrice(plan) {

	const billingCycle =
		getBillingCycle(plan);

	let price;

	if (billingCycle === "YEARLY") {

		price =
			plan.yearlyPrice ??
			plan.yearly_price ??
			plan.price ??
			0;

	} else {

		price =
			plan.monthlyPrice ??
			plan.monthly_price ??
			plan.price ??
			0;
	}

	return Number(
		price || 0
	).toFixed(2);
}


function getMaxMedicines(plan) {

	return Number(
		plan.maxMedicines ??
		plan.max_medicines ??
		plan.maxProducts ??
		0
	);
}


function getMaxAppointments(plan) {

	return Number(
		plan.maxAppointments ??
		plan.max_appointments ??
		0
	);
}


function getMaxStaff(plan) {

	return Number(
		plan.maxStaff ??
		plan.max_staff ??
		plan.maxDoctors ??
		0
	);
}


function isVideoConsultationAllowed(plan) {

	return Boolean(
		plan.videoConsultationAllowed ??
		plan.video_consultation_allowed ??
		plan.onlineConsultationEnabled ??
		false
	);
}


function isReportsEnabled(plan) {

	return Boolean(
		plan.reportsEnabled ??
		plan.reports_enabled ??
		false
	);
}


function isPrioritySupportEnabled(plan) {

	return Boolean(
		plan.prioritySupportEnabled ??
		plan.priority_support_enabled ??
		false
	);
}


function updatePlanSummary() {

	setAnimatedNumber(
		"availablePlanCount",
		subscriptionPlans.length
	);

	setAnimatedNumber(
		"monthlyPlanCount",
		subscriptionPlans.filter(
			function(plan) {
				return (
					getBillingCycle(plan) === "MONTHLY"
				);
			}
		).length
	);

	setAnimatedNumber(
		"yearlyPlanCount",
		subscriptionPlans.filter(
			function(plan) {
				return (
					getBillingCycle(plan) === "YEARLY"
				);
			}
		).length
	);
}


function showPlansLoadingState() {

	const container =
		document.getElementById(
			"plansContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="subscription-plans-state">

			<div class="subscription-plans-state-icon subscription-plans-loading">
				<i class="bi bi-gem"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading subscription plans
			</h5>

			<p class="text-muted mb-0">
				Please wait while we prepare available plans for your role.
			</p>

		</div>
	`;
}


function showPlansErrorState(message) {

	const container =
		document.getElementById(
			"plansContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="subscription-plans-state">

			<div class="subscription-plans-state-icon bg-danger">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">
				Unable to load plans
			</h5>

			<p class="text-muted mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}


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


function getApiErrorMessage(data, fallback) {

	if (!data) {
		return fallback;
	}

	if (data.message) {
		return data.message;
	}

	if (data.error) {
		return data.error;
	}

	if (typeof data === "string") {
		return data;
	}

	return fallback;
}


function showMsg(
	message,
	type = "danger"
) {

	const msg =
		document.getElementById("msg");

	if (!msg) {
		alert(message);
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show"
			 role="alert">

			${escapeHtml(message)}

			<button type="button"
					class="btn-close"
					data-bs-dismiss="alert"
					aria-label="Close"></button>

		</div>
	`;
}


function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {

	const button =
		document.getElementById(buttonId);

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
			<span class="spinner-border spinner-border-sm me-2"
				  role="status"
				  aria-hidden="true"></span>

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


function setAnimatedNumber(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	const target =
		Number(value) || 0;

	const start =
		Number(element.textContent) || 0;

	const difference =
		target - start;

	const duration = 500;

	const startTime =
		performance.now();

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {
		element.textContent = target;
		return;
	}

	function update(currentTime) {

		const progress =
			Math.min(
				(currentTime - startTime) /
				duration,
				1
			);

		const eased =
			1 - Math.pow(1 - progress, 3);

		element.textContent =
			Math.round(
				start +
				difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}


function setText(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value === null ||
				value === undefined ||
				value === ""
				? "-"
				: value;
	}
}


function safe(value) {

	return value === null ||
		value === undefined ||
		value === ""
		? "-"
		: escapeHtml(value);
}


function escapeHtml(value) {

	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}