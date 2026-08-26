"use strict";

/*
===========================================================
 GLOBAL STATE
===========================================================
*/

let isVerifyingSaasAppointmentPayment = false;


/*
===========================================================
 PAGE LOAD
===========================================================
*/

document.addEventListener(
	"DOMContentLoaded",
	async function() {

		await verifySaasAppointmentPayment();

	}
);


/*
===========================================================
 VERIFY SAAS APPOINTMENT PAYMENT
===========================================================
*/

async function verifySaasAppointmentPayment() {

	if (isVerifyingSaasAppointmentPayment) {
		return;
	}

	const params =
		new URLSearchParams(
			window.location.search
		);


	/*
	-------------------------------------------------------
	Read redirect parameters
	-------------------------------------------------------
	*/

	const appointmentId =
		params.get("appointmentId");

	const merchantOrderId =
		params.get("merchantOrderId");


	/*
	-------------------------------------------------------
	Token
	-------------------------------------------------------
	*/

	const token =
		localStorage.getItem("token");


	/*
	-------------------------------------------------------
	Show initial values
	-------------------------------------------------------
	*/

	setText(
		"appointmentIdText",
		appointmentId || "-"
	);

	setText(
		"merchantOrderIdText",
		merchantOrderId || "-"
	);


	/*
	-------------------------------------------------------
	Validate redirect parameters
	-------------------------------------------------------
	*/

	if (
		!appointmentId ||
		!merchantOrderId
	) {

		setPaymentStatus(
			"FAILED",
			"Payment Verification Failed",
			"Appointment payment details are missing.",
			"Appointment ID or merchant order ID is missing."
		);

		showFailedActions();

		return;
	}


	/*
	-------------------------------------------------------
	Validate login
	-------------------------------------------------------
	*/

	if (!token) {

		setPaymentStatus(
			"FAILED",
			"Login Required",
			"Please login again to verify your appointment payment.",
			"Login token was not found."
		);

		showFailedActions();

		return;
	}


	/*
	-------------------------------------------------------
	Start verification
	-------------------------------------------------------
	*/

	isVerifyingSaasAppointmentPayment = true;


	setPaymentStatus(
		"PENDING",
		"Verifying Payment...",
		"Please wait while we verify your appointment payment.",
		"Appointment payment verification is in progress."
	);


	try {

		/*
		---------------------------------------------------
		IMPORTANT:
		This is the SaaS endpoint only.
		It does NOT call /doctor/payments/verify
		---------------------------------------------------
		*/

		const response =
			await fetch(
				`${API_BASE}/saas/appointments/payment/verify` +
				`?appointmentId=${encodeURIComponent(appointmentId)}` +
				`&merchantOrderId=${encodeURIComponent(merchantOrderId)}`,
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


		console.log(
			"SaaS appointment payment verification result:",
			result
		);


		/*
		---------------------------------------------------
		HTTP ERROR
		---------------------------------------------------
		*/

		if (!response.ok) {

			setPaymentStatus(
				"FAILED",
				"Payment Verification Failed",
				"Unable to verify your appointment payment.",
				getApiErrorMessage(
					result,
					"Appointment payment verification failed."
				)
			);

			showFailedActions();

			return;
		}


		/*
		---------------------------------------------------
		Normalize payment / appointment status
		---------------------------------------------------
		*/

		const appointmentStatus =
			String(
				result.status ||
				""
			)
				.trim()
				.toUpperCase();


		const paymentStatus =
			String(
				result.paymentStatus ||
				""
			)
				.trim()
				.toUpperCase();


		const state =
			String(
				result.state ||
				""
			)
				.trim()
				.toUpperCase();


		/*
		---------------------------------------------------
		SUCCESS
		---------------------------------------------------
		*/

		if (
			result.success === true ||

			appointmentStatus ===
			"CONFIRMED" ||

			paymentStatus ===
			"SUCCESS" ||

			state ===
			"SUCCESS" ||

			state ===
			"COMPLETED"
		) {

			showSaasAppointmentPaymentSuccess(
				result
			);

			return;
		}


		/*
		---------------------------------------------------
		FAILED
		---------------------------------------------------
		*/

		if (
			appointmentStatus ===
			"PAYMENT_FAILED" ||

			paymentStatus ===
			"FAILED" ||

			state ===
			"FAILED" ||

			state ===
			"PAYMENT_FAILED"
		) {

			setPaymentStatus(
				"FAILED",
				"Payment Failed",
				"Your appointment payment could not be completed.",
				getApiErrorMessage(
					result,
					"Appointment payment failed."
				)
			);

			showFailedActions();

			return;
		}


		/*
		---------------------------------------------------
		PENDING
		---------------------------------------------------
		*/

		setPaymentStatus(
			"PENDING",
			"Payment Pending",
			"Your appointment payment is still being processed.",
			getApiErrorMessage(
				result,
				"Payment verification is still pending."
			)
		);

	} catch (error) {

		console.error(
			"SaaS appointment payment verification error:",
			error
		);


		setPaymentStatus(
			"FAILED",
			"Verification Error",
			"Something went wrong while verifying your payment.",
			"SaaS appointment payment service is not reachable."
		);


		showFailedActions();

	} finally {

		isVerifyingSaasAppointmentPayment = false;

	}
}


/*
===========================================================
 SUCCESS
===========================================================
*/

function showSaasAppointmentPaymentSuccess(
	result
) {

	setPaymentStatus(
		"SUCCESS",
		"Appointment Confirmed",
		"Your online consultation payment has been verified successfully.",
		getApiErrorMessage(
			result,
			"Appointment confirmed successfully."
		)
	);


	showSaasAppointmentPaymentDetails(
		result
	);


	showSuccessActions();
}


/*
===========================================================
 APPOINTMENT DETAILS
===========================================================
*/

function showSaasAppointmentPaymentDetails(
	result
) {

	const detailsBox =
		document.getElementById(
			"detailsBox"
		);


	if (!detailsBox) {
		return;
	}


	detailsBox.classList.remove(
		"hidden"
	);


	/*
	-------------------------------------------------------
	Appointment ID
	-------------------------------------------------------
	*/

	setText(
		"appointmentIdText",
		result.id ||
		result.appointmentId ||
		"-"
	);


	/*
	-------------------------------------------------------
	Doctor
	-------------------------------------------------------
	*/

	setText(
		"doctorNameText",
		result.doctorName ||
		"-"
	);


	/*
	-------------------------------------------------------
	Date
	-------------------------------------------------------
	*/

	setText(
		"appointmentDateText",
		result.appointmentDate ||
		"-"
	);


	/*
	-------------------------------------------------------
	Time
	-------------------------------------------------------
	*/

	setText(
		"appointmentTimeText",
		result.appointmentTime ||
		"-"
	);


	/*
	-------------------------------------------------------
	Type
	-------------------------------------------------------
	*/

	setText(
		"appointmentTypeText",
		result.appointmentType ||
		"ONLINE"
	);


	/*
	-------------------------------------------------------
	Appointment status
	-------------------------------------------------------
	*/

	setText(
		"appointmentStatusText",
		result.status ||
		"CONFIRMED"
	);


	/*
	-------------------------------------------------------
	Payment status
	-------------------------------------------------------
	*/

	setText(
		"paymentStatusText",
		result.paymentStatus ||
		"SUCCESS"
	);


	/*
	-------------------------------------------------------
	Merchant order
	-------------------------------------------------------
	*/

	setText(
		"merchantOrderIdText",
		result.paymentOrderId ||
		result.merchantOrderId ||
		"-"
	);


	/*
	-------------------------------------------------------
	Meeting URL
	-------------------------------------------------------
	*/

	const meetingUrl =
		result.meetingUrl ||
		"-";


	const meetingElement =
		document.getElementById(
			"meetingUrlText"
		);


	if (meetingElement) {

		if (
			meetingUrl &&
			meetingUrl !== "-"
		) {

			const safeUrl =
				getSafeHttpUrl(
					meetingUrl
				);


			if (safeUrl) {

				meetingElement.innerHTML = `
                    <a
                        href="${escapeAttribute(safeUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-sm btn-success">

                        <i class="bi bi-camera-video-fill me-1"></i>

                        Join Meeting

                    </a>
                `;

			} else {

				meetingElement.textContent =
					"-";

			}

		} else {

			meetingElement.textContent =
				"-";

		}

	}
}


/*
===========================================================
 PAYMENT STATUS UI
===========================================================
*/

function setPaymentStatus(
	type,
	title,
	subtitle,
	message
) {

	const normalizedType =
		String(
			type ||
			"PENDING"
		)
			.trim()
			.toUpperCase();


	const statusIcon =
		document.getElementById(
			"statusIcon"
		);


	const statusIconClass =
		document.getElementById(
			"statusIconClass"
		);


	const messageBox =
		document.getElementById(
			"messageBox"
		);


	if (
		!statusIcon ||
		!statusIconClass ||
		!messageBox
	) {
		return;
	}


	/*
	-------------------------------------------------------
	Reset
	-------------------------------------------------------
	*/

	statusIcon.className =
		"payment-status-icon";


	messageBox.className =
		"subscription-payment-message";


	/*
	-------------------------------------------------------
	SUCCESS
	-------------------------------------------------------
	*/

	if (
		normalizedType ===
		"SUCCESS"
	) {

		statusIcon.classList.add(
			"success"
		);


		statusIconClass.className =
			"bi bi-check-lg";


		messageBox.classList.add(
			"success"
		);

	}


	/*
	-------------------------------------------------------
	FAILED
	-------------------------------------------------------
	*/

	else if (
		normalizedType ===
		"FAILED"
	) {

		statusIcon.classList.add(
			"failed"
		);


		statusIconClass.className =
			"bi bi-x-lg";


		messageBox.classList.add(
			"failed"
		);

	}


	/*
	-------------------------------------------------------
	PENDING
	-------------------------------------------------------
	*/

	else {

		statusIcon.classList.add(
			"pending"
		);


		statusIconClass.className =
			"bi bi-arrow-repeat subscription-payment-spin";


		messageBox.classList.add(
			"pending"
		);

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


/*
===========================================================
 SUCCESS ACTIONS
===========================================================
*/

function showSuccessActions() {

	const successActions =
		document.getElementById(
			"successActions"
		);


	const failedActions =
		document.getElementById(
			"failedActions"
		);


	if (successActions) {

		successActions.classList.remove(
			"hidden"
		);

	}


	if (failedActions) {

		failedActions.classList.add(
			"hidden"
		);

	}
}


/*
===========================================================
 FAILED ACTIONS
===========================================================
*/

function showFailedActions() {

	const successActions =
		document.getElementById(
			"successActions"
		);


	const failedActions =
		document.getElementById(
			"failedActions"
		);


	if (successActions) {

		successActions.classList.add(
			"hidden"
		);

	}


	if (failedActions) {

		failedActions.classList.remove(
			"hidden"
		);

	}
}


/*
===========================================================
 JSON HELPER
===========================================================
*/

async function safeJson(
	response
) {

	try {

		const text =
			await response.text();


		if (
			!text ||
			!text.trim()
		) {
			return {};
		}


		try {

			return JSON.parse(
				text
			);

		} catch (error) {

			return {
				rawBody: text
			};

		}

	} catch (error) {

		return {};

	}
}


/*
===========================================================
 ERROR MESSAGE
===========================================================
*/

function getApiErrorMessage(
	data,
	fallback
) {

	if (!data) {
		return fallback;
	}


	if (
		typeof data ===
		"string"
	) {

		return data;

	}


	if (data.message) {

		return data.message;

	}


	if (data.error) {

		return data.error;

	}


	if (data.rawBody) {

		return data.rawBody;

	}


	return fallback;
}


/*
===========================================================
 TEXT HELPER
===========================================================
*/

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


	element.textContent =
		value === null ||
			value === undefined ||
			value === ""
			? "-"
			: value;
}


/*
===========================================================
 SAFE HTTP URL
===========================================================
*/

function getSafeHttpUrl(
	value
) {

	if (!value) {
		return null;
	}


	try {

		const url =
			new URL(
				String(value),
				window.location.origin
			);


		if (
			url.protocol !== "http:" &&
			url.protocol !== "https:"
		) {
			return null;
		}


		return url.href;

	} catch (error) {

		return null;

	}
}


/*
===========================================================
 ATTRIBUTE ESCAPE
===========================================================
*/

function escapeAttribute(
	value
) {

	return String(
		value ?? ""
	)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}