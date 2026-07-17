let isVerifyingSubscriptionPayment = false;

document.addEventListener("DOMContentLoaded", async function() {

	await verifySubscriptionPayment();
});


async function verifySubscriptionPayment() {

	if (isVerifyingSubscriptionPayment) {
		return;
	}

	const params =
		new URLSearchParams(
			window.location.search
		);

	const paymentId =
		params.get("paymentId");

	const merchantOrderId =
		params.get("merchantOrderId");

	const token =
		localStorage.getItem("token");

	setText(
		"paymentIdText",
		paymentId || "-"
	);

	setText(
		"merchantOrderIdText",
		merchantOrderId || "-"
	);

	if (!paymentId || !merchantOrderId) {

		setPaymentStatus(
			"FAILED",
			"Payment Verification Failed",
			"Payment response is missing required payment details.",
			"Payment details are missing in the redirect URL."
		);

		return;
	}

	if (!token) {

		setPaymentStatus(
			"FAILED",
			"Login Required",
			"Please login again to verify your subscription payment.",
			"Login token not found. Please login again."
		);

		return;
	}

	isVerifyingSubscriptionPayment = true;

	setPaymentStatus(
		"PENDING",
		"Verifying Payment...",
		"Please wait while we verify your subscription payment.",
		"Payment verification is in progress."
	);

	try {

		const response = await fetch(
			`${API_BASE}/billing/subscriptions/payments/verify` +
			`?paymentId=${encodeURIComponent(paymentId)}` +
			`&merchantOrderId=${encodeURIComponent(merchantOrderId)}`,
			{
				method: "POST",

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

			setPaymentStatus(
				"FAILED",
				"Payment Verification Failed",
				"Unable to verify your subscription payment.",
				getApiErrorMessage(
					result,
					"Payment verification failed."
				)
			);

			return;
		}

		if (result.success === true) {

			showPaymentSuccess(result);

			return;
		}

		const status =
			String(
				result.status ||
				result.paymentStatus ||
				result.state ||
				""
			).toUpperCase();

		if (
			status === "SUCCESS" ||
			status === "COMPLETED" ||
			status === "ACTIVE"
		) {

			showPaymentSuccess(result);

			return;
		}

		if (
			status === "FAILED" ||
			status === "PAYMENT_FAILED" ||
			result.success === false
		) {

			setPaymentStatus(
				"FAILED",
				"Payment Failed",
				"Your subscription payment could not be verified.",
				getApiErrorMessage(
					result,
					"Payment failed. Please try again."
				)
			);

			return;
		}

		setPaymentStatus(
			"PENDING",
			"Payment Pending",
			"Your subscription payment is still being processed.",
			getApiErrorMessage(
				result,
				"Payment verification is pending."
			)
		);

	} catch (error) {

		console.error(
			"Subscription payment verification error:",
			error
		);

		setPaymentStatus(
			"FAILED",
			"Verification Error",
			"Something went wrong while verifying your subscription payment.",
			"Billing service not reachable."
		);

	} finally {

		isVerifyingSubscriptionPayment = false;
	}
}


function showPaymentSuccess(result) {

	setPaymentStatus(
		"SUCCESS",
		"Payment Successful",
		"Your subscription payment has been verified and your subscription is now active.",
		getApiErrorMessage(
			result,
			"Subscription activated successfully."
		)
	);

	showPaymentDetails(result);
}


function setPaymentStatus(
	type,
	title,
	subtitle,
	message
) {

	const normalizedType =
		String(type || "PENDING")
			.toUpperCase();

	const statusIcon =
		document.getElementById("statusIcon");

	const statusIconClass =
		document.getElementById("statusIconClass");

	const messageBox =
		document.getElementById("messageBox");

	if (
		!statusIcon ||
		!statusIconClass ||
		!messageBox
	) {
		return;
	}

	statusIcon.className =
		"subscription-payment-status-icon";

	messageBox.className =
		"subscription-payment-message";

	if (normalizedType === "SUCCESS") {

		statusIcon.classList.add("success");

		statusIconClass.className =
			"bi bi-check-lg";

		messageBox.classList.add("success");

	} else if (normalizedType === "FAILED") {

		statusIcon.classList.add("failed");

		statusIconClass.className =
			"bi bi-x-lg";

		messageBox.classList.add("failed");

	} else {

		statusIcon.classList.add("pending");

		statusIconClass.className =
			"bi bi-arrow-repeat subscription-payment-spin";

		messageBox.classList.add("pending");
	}

	setText(
		"pageTitle",
		title
	);

	setText(
		"pageSubtitle",
		subtitle
	);

	setText(
		"messageBox",
		message
	);
}


function showPaymentDetails(result) {

	const detailsBox =
		document.getElementById("detailsBox");

	if (!detailsBox) {
		return;
	}

	detailsBox.classList.remove("d-none");

	setText(
		"planName",
		result.planName ||
		result.plan?.planName ||
		"-"
	);

	setText(
		"planCode",
		result.planCode ||
		result.plan?.planCode ||
		"-"
	);

	setText(
		"startDate",
		result.startDate || "-"
	);

	setText(
		"endDate",
		result.endDate || "-"
	);

	if (result.merchantOrderId) {

		setText(
			"merchantOrderIdText",
			result.merchantOrderId
		);
	}
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