let isLoadingCurrentSubscription = false;
let isCancellingSubscription = false;

document.addEventListener("DOMContentLoaded", async function() {

	await loadCurrentSubscription();
});


async function loadCurrentSubscription() {

	if (isLoadingCurrentSubscription) {
		return;
	}

	isLoadingCurrentSubscription = true;

	const token =
		localStorage.getItem("token");

	clearMessage();
	showSubscriptionLoadingState();

	if (!token) {

		renderNoSubscription(
			"Login token not found. Please login again."
		);

		showMsg(
			"Login token not found. Please login again."
		);

		isLoadingCurrentSubscription = false;

		return;
	}

	try {

		const response = await fetch(
			`${API_BASE}/billing/subscriptions/current`,
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

			renderNoSubscription(
				getApiErrorMessage(
					result,
					"No active subscription found."
				)
			);

			resetSubscriptionSummary();

			return;
		}

		if (
			!result ||
			Object.keys(result).length === 0
		) {

			renderNoSubscription(
				"No active subscription found."
			);

			resetSubscriptionSummary();

			return;
		}

		renderSubscription(result);
		updateSubscriptionSummary(result);

	} catch (error) {

		console.error(
			"Unable to load current subscription:",
			error
		);

		showSubscriptionErrorState(
			"Billing service not reachable."
		);

		showMsg(
			"Billing service not reachable."
		);

		resetSubscriptionSummary();

	} finally {

		isLoadingCurrentSubscription = false;
	}
}


function renderSubscription(subscription) {

	const subscriptionBox =
		document.getElementById(
			"subscriptionBox"
		);

	if (!subscriptionBox) {
		return;
	}

	const planName =
		getSubscriptionValue(
			subscription.planName,
			subscription.plan?.planName
		);

	const planCode =
		getSubscriptionValue(
			subscription.planCode,
			subscription.plan?.planCode
		);

	const status =
		getSubscriptionValue(
			subscription.status,
			subscription.subscriptionStatus,
			"ACTIVE"
		);

	const billingCycle =
		getSubscriptionValue(
			subscription.billingCycle,
			subscription.plan?.billingCycle
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
			subscription.plan?.role,
			localStorage.getItem("role")
		);

	const onlineConsultation =
		subscription.onlineConsultationEnabled ??
		subscription.videoConsultationAllowed ??
		subscription.plan?.onlineConsultationEnabled ??
		subscription.plan?.videoConsultationAllowed ??
		false;

	const reportsEnabled =
		subscription.reportsEnabled ??
		subscription.plan?.reportsEnabled ??
		false;

	const prioritySupport =
		subscription.prioritySupportEnabled ??
		subscription.plan?.prioritySupportEnabled ??
		false;

	const activeStatus =
		String(status).toUpperCase() === "ACTIVE";

	subscriptionBox.innerHTML = `
		<section class="subscription-current-card">

			<div class="subscription-current-header">

				<div>

					<span class="subscription-current-active-badge">
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

				<span class="subscription-current-status ${activeStatus ? "active" : "inactive"}">

					<i class="bi ${activeStatus ? "bi-check-circle-fill" : "bi-x-circle-fill"}"></i>
					${safe(status)}
				</span>

			</div>

			<div class="subscription-current-info-grid">

				<div class="subscription-current-info-item">
					<span>Role</span>
					<strong>${safe(role)}</strong>
				</div>

				<div class="subscription-current-info-item">
					<span>Billing Cycle</span>
					<strong>${safe(billingCycle)}</strong>
				</div>

				<div class="subscription-current-info-item">
					<span>Start Date</span>
					<strong>${safe(startDate)}</strong>
				</div>

				<div class="subscription-current-info-item">
					<span>End Date</span>
					<strong>${safe(endDate)}</strong>
				</div>

			</div>

			<div class="subscription-current-benefits">

				<h5>
					Plan Benefits
				</h5>

				<div class="subscription-current-benefit-list">

					${renderBenefitItem(
		"Online Consultation",
		onlineConsultation,
		"bi-camera-video-fill"
	)}

					${renderBenefitItem(
		"Reports",
		reportsEnabled,
		"bi-bar-chart-fill"
	)}

					${renderBenefitItem(
		"Priority Support",
		prioritySupport,
		"bi-headset"
	)}

				</div>

			</div>

			<div class="subscription-current-action-row">

				<a href="/subscription/plans"
				   class="btn btn-medi">

					<i class="bi bi-arrow-up-circle-fill me-1"></i>
					Upgrade / Change Plan
				</a>

				<button type="button"
						id="cancelSubscriptionBtn"
						class="btn btn-outline-danger"
						onclick="cancelSubscription()">

					<i class="bi bi-x-circle-fill me-1"></i>
					Cancel Subscription
				</button>

			</div>

		</section>
	`;
}


function renderBenefitItem(
	label,
	enabled,
	icon
) {

	return `
		<div class="subscription-current-benefit-item">

			<div class="subscription-current-benefit-icon ${enabled ? "enabled" : "disabled"}">
				<i class="bi ${enabled ? icon : "bi-x-lg"}"></i>
			</div>

			<span>
				${escapeHtml(label)}
			</span>

		</div>
	`;
}


function renderNoSubscription(message) {

	const subscriptionBox =
		document.getElementById(
			"subscriptionBox"
		);

	if (!subscriptionBox) {
		return;
	}

	subscriptionBox.innerHTML = `
		<section class="mr-card subscription-current-card">

			<div class="subscription-current-state">

				<div class="subscription-current-state-icon">
					<i class="bi bi-credit-card-2-front-fill"></i>
				</div>

				<h3 class="fw-bold text-primary">
					No Active Subscription
				</h3>

				<p class="text-muted mb-3">
					${escapeHtml(
		message ||
		"Please choose a plan to continue using premium features."
	)}
				</p>

				<a href="/subscription/plans"
				   class="btn btn-medi">

					<i class="bi bi-grid-fill me-1"></i>
					Choose Plan
				</a>

			</div>

		</section>
	`;
}


async function cancelSubscription() {

	if (isCancellingSubscription) {
		return;
	}

	if (
		!confirm(
			"Cancel your current subscription?"
		)
	) {
		return;
	}

	const token =
		localStorage.getItem("token");

	if (!token) {

		showMsg(
			"Login token not found. Please login again."
		);

		return;
	}

	isCancellingSubscription = true;

	setButtonLoading(
		"cancelSubscriptionBtn",
		"Cancelling...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/billing/subscriptions/cancel`,
			{
				method: "PUT",

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

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to cancel subscription."
				)
			);

			return;
		}

		showMsg(
			getApiErrorMessage(
				result,
				"Subscription cancelled successfully."
			),
			"success"
		);

		await loadCurrentSubscription();

	} catch (error) {

		console.error(
			"Unable to cancel subscription:",
			error
		);

		showMsg(
			"Billing service not reachable."
		);

	} finally {

		isCancellingSubscription = false;

		setButtonLoading(
			"cancelSubscriptionBtn",
			"Cancel Subscription",
			false
		);
	}
}


function updateSubscriptionSummary(subscription) {

	const planName =
		getSubscriptionValue(
			subscription.planName,
			subscription.plan?.planName
		);

	const status =
		getSubscriptionValue(
			subscription.status,
			subscription.subscriptionStatus,
			"ACTIVE"
		);

	const billingCycle =
		getSubscriptionValue(
			subscription.billingCycle,
			subscription.plan?.billingCycle
		);

	const endDate =
		getSubscriptionValue(
			subscription.endDate
		);

	setText(
		"currentPlanSummary",
		planName
	);

	setText(
		"subscriptionStatusSummary",
		status
	);

	setText(
		"billingCycleSummary",
		billingCycle
	);

	setText(
		"subscriptionEndDateSummary",
		endDate
	);
}


function resetSubscriptionSummary() {

	setText(
		"currentPlanSummary",
		"-"
	);

	setText(
		"subscriptionStatusSummary",
		"-"
	);

	setText(
		"billingCycleSummary",
		"-"
	);

	setText(
		"subscriptionEndDateSummary",
		"-"
	);
}


function showSubscriptionLoadingState() {

	const subscriptionBox =
		document.getElementById(
			"subscriptionBox"
		);

	if (!subscriptionBox) {
		return;
	}

	subscriptionBox.innerHTML = `
		<section class="mr-card subscription-current-card">

			<div class="subscription-current-state">

				<div class="subscription-current-state-icon subscription-current-loading">
					<i class="bi bi-credit-card-fill"></i>
				</div>

				<h5 class="fw-bold text-primary">
					Loading current subscription
				</h5>

				<p class="text-muted mb-0">
					Please wait while we prepare your subscription details.
				</p>

			</div>

		</section>
	`;
}


function showSubscriptionErrorState(message) {

	const subscriptionBox =
		document.getElementById(
			"subscriptionBox"
		);

	if (!subscriptionBox) {
		return;
	}

	subscriptionBox.innerHTML = `
		<section class="mr-card subscription-current-card">

			<div class="subscription-current-state">

				<div class="subscription-current-state-icon bg-danger">
					<i class="bi bi-exclamation-triangle-fill"></i>
				</div>

				<h5 class="fw-bold text-danger">
					Unable to load subscription
				</h5>

				<p class="text-muted mb-0">
					${escapeHtml(message)}
				</p>

			</div>

		</section>
	`;
}


function getSubscriptionValue(
	...values
) {

	for (const value of values) {

		if (
			value !== null &&
			value !== undefined &&
			value !== ""
		) {
			return value;
		}
	}

	return "-";
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


function clearMessage() {

	const msg =
		document.getElementById("msg");

	if (msg) {
		msg.innerHTML = "";
	}
}


function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {

	const button =
		document.getElementById(buttonId);

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