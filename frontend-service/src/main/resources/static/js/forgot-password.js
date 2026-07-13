let forgotPasswordEmail = "";
let forgotPasswordOtpVerified = false;
let forgotOtpResendTimer = null;
let forgotOtpResendSeconds = 0;
let forgotPasswordRequestInProgress = false;

document.addEventListener("DOMContentLoaded", function() {
	showForgotPasswordStep("EMAIL");
});

window.addEventListener("beforeunload", function() {
	clearForgotOtpResendTimer();
});

function toggleForgotPassword(
	inputId,
	button
) {
	const input =
		document.getElementById(inputId);

	if (!input) {
		return;
	}

	const showPassword =
		input.type === "password";

	input.type =
		showPassword
			? "text"
			: "password";

	if (button) {
		button.innerHTML =
			showPassword
				? '<i class="bi bi-eye-slash-fill"></i>'
				: '<i class="bi bi-eye-fill"></i>';
	}
}

function forgotEmailOnEnter(event) {
	if (event.key === "Enter") {
		event.preventDefault();
		sendForgotPasswordOtp();
	}
}

function forgotOtpOnEnter(event) {
	if (event.key === "Enter") {
		event.preventDefault();
		verifyForgotPasswordOtp();
	}
}

function forgotResetOnEnter(event) {
	if (event.key === "Enter") {
		event.preventDefault();
		resetForgotPassword();
	}
}

function sanitizeOtpInput(input) {
	if (!input) {
		return;
	}

	input.value =
		input.value
			.replace(/\D/g, "")
			.slice(0, 6);
}

async function sendForgotPasswordOtp() {
	if (forgotPasswordRequestInProgress) {
		return;
	}

	const email =
		document
			.getElementById("forgotEmail")
			?.value
			.trim() || "";

	if (!validateEmail(email)) {
		showForgotMessage(
			"Please enter a valid registered email address"
		);

		return;
	}

	forgotPasswordRequestInProgress = true;

	setButtonLoading(
		"sendForgotOtpBtn",
		"Sending OTP...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE_URL}/auth/forgot-password/send-otp`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify({
							email: email
						})
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showForgotMessage(
				getErrorMessage(
					result,
					"Unable to send OTP"
				)
			);

			return;
		}

		forgotPasswordEmail = email;
		forgotPasswordOtpVerified = false;

		showForgotPasswordStep("OTP");

		startForgotOtpResendTimer(30);

		showForgotMessage(
			"OTP sent successfully to your email",
			"success"
		);

		window.setTimeout(
			function() {
				document
					.getElementById("forgotOtp")
					?.focus();
			},
			100
		);

	} catch (error) {
		console.error(
			"Send forgot password OTP error:",
			error
		);

		showForgotMessage(
			"Server not reachable. Please check API Gateway."
		);

	} finally {
		forgotPasswordRequestInProgress = false;

		setButtonLoading(
			"sendForgotOtpBtn",
			"Send OTP",
			false
		);
	}
}

async function resendForgotPasswordOtp() {
	if (!forgotPasswordEmail) {
		showForgotMessage(
			"Email is missing. Please restart forgot password process."
		);

		return;
	}

	if (
		forgotOtpResendSeconds > 0 ||
		forgotPasswordRequestInProgress
	) {
		return;
	}

	forgotPasswordRequestInProgress = true;

	setButtonLoading(
		"resendForgotOtpBtn",
		"Sending...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE_URL}/auth/forgot-password/send-otp`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify({
							email:
								forgotPasswordEmail
						})
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showForgotMessage(
				getErrorMessage(
					result,
					"Unable to resend OTP"
				)
			);

			return;
		}

		const otpInput =
			document.getElementById(
				"forgotOtp"
			);

		if (otpInput) {
			otpInput.value = "";
			otpInput.focus();
		}

		startForgotOtpResendTimer(30);

		showForgotMessage(
			"New OTP sent successfully",
			"success"
		);

	} catch (error) {
		console.error(
			"Resend forgot password OTP error:",
			error
		);

		showForgotMessage(
			"Server not reachable. Please check API Gateway."
		);

	} finally {
		forgotPasswordRequestInProgress = false;

		setButtonLoading(
			"resendForgotOtpBtn",
			"Resend OTP",
			false
		);
	}
}

async function verifyForgotPasswordOtp() {
	if (forgotPasswordRequestInProgress) {
		return;
	}

	const otp =
		document
			.getElementById("forgotOtp")
			?.value
			.trim() || "";

	if (!forgotPasswordEmail) {
		showForgotMessage(
			"Email is missing. Please try again."
		);

		return;
	}

	if (
		!otp ||
		otp.length < 4 ||
		!/^\d+$/.test(otp)
	) {
		showForgotMessage(
			"Please enter valid OTP"
		);

		return;
	}

	forgotPasswordRequestInProgress = true;

	setButtonLoading(
		"verifyForgotOtpBtn",
		"Verifying...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE_URL}/auth/forgot-password/verify-otp`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify({
							email:
								forgotPasswordEmail,

							otp:
								otp
						})
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showForgotMessage(
				getErrorMessage(
					result,
					"Invalid OTP"
				)
			);

			return;
		}

		forgotPasswordOtpVerified = true;

		clearForgotOtpResendTimer();

		showForgotPasswordStep("RESET");

		showForgotMessage(
			"OTP verified successfully. Please set new password.",
			"success"
		);

		window.setTimeout(
			function() {
				document
					.getElementById("newPassword")
					?.focus();
			},
			100
		);

	} catch (error) {
		console.error(
			"Verify forgot password OTP error:",
			error
		);

		showForgotMessage(
			"Server not reachable. Please check API Gateway."
		);

	} finally {
		forgotPasswordRequestInProgress = false;

		setButtonLoading(
			"verifyForgotOtpBtn",
			"Verify OTP",
			false
		);
	}
}

async function resetForgotPassword() {
	if (forgotPasswordRequestInProgress) {
		return;
	}

	const newPassword =
		document
			.getElementById("newPassword")
			?.value
			.trim() || "";

	const confirmNewPassword =
		document
			.getElementById("confirmNewPassword")
			?.value
			.trim() || "";

	if (!forgotPasswordEmail) {
		showForgotMessage(
			"Email is missing. Please restart forgot password process."
		);

		return;
	}

	if (!forgotPasswordOtpVerified) {
		showForgotMessage(
			"Please verify OTP first"
		);

		return;
	}

	if (
		!newPassword ||
		newPassword.length < 6
	) {
		showForgotMessage(
			"New password must be at least 6 characters"
		);

		return;
	}

	if (
		newPassword !==
		confirmNewPassword
	) {
		showForgotMessage(
			"New password and confirm password do not match"
		);

		return;
	}

	forgotPasswordRequestInProgress = true;

	setButtonLoading(
		"resetPasswordBtn",
		"Resetting...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE_URL}/auth/forgot-password/reset`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify({
							email:
								forgotPasswordEmail,

							newPassword:
								newPassword
						})
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showForgotMessage(
				getErrorMessage(
					result,
					"Unable to reset password"
				)
			);

			return;
		}

		showForgotMessage(
			"Password reset successfully. Redirecting to login...",
			"success"
		);

		document
			.getElementById("newPassword")
			?.setAttribute(
				"disabled",
				"disabled"
			);

		document
			.getElementById("confirmNewPassword")
			?.setAttribute(
				"disabled",
				"disabled"
			);

		window.setTimeout(
			function() {
				window.location.href = "/";
			},
			1800
		);

	} catch (error) {
		console.error(
			"Reset forgot password error:",
			error
		);

		showForgotMessage(
			"Server not reachable. Please check API Gateway."
		);

	} finally {
		forgotPasswordRequestInProgress = false;

		setButtonLoading(
			"resetPasswordBtn",
			"Reset Password",
			false
		);
	}
}

function restartForgotPassword() {
	forgotPasswordOtpVerified = false;

	clearForgotOtpResendTimer();

	const otpInput =
		document.getElementById(
			"forgotOtp"
		);

	if (otpInput) {
		otpInput.value = "";
	}

	const newPassword =
		document.getElementById(
			"newPassword"
		);

	const confirmPassword =
		document.getElementById(
			"confirmNewPassword"
		);

	if (newPassword) {
		newPassword.value = "";
		newPassword.disabled = false;
	}

	if (confirmPassword) {
		confirmPassword.value = "";
		confirmPassword.disabled = false;
	}

	showForgotPasswordStep("EMAIL");

	window.setTimeout(
		function() {
			document
				.getElementById("forgotEmail")
				?.focus();
		},
		100
	);
}

function showForgotPasswordStep(step) {
	const emailSection =
		document.getElementById(
			"forgotEmailSection"
		);

	const otpSection =
		document.getElementById(
			"forgotOtpSection"
		);

	const resetSection =
		document.getElementById(
			"resetPasswordSection"
		);

	const emailProgress =
		document.getElementById(
			"forgotProgressEmail"
		);

	const otpProgress =
		document.getElementById(
			"forgotProgressOtp"
		);

	const resetProgress =
		document.getElementById(
			"forgotProgressReset"
		);

	[
		emailProgress,
		otpProgress,
		resetProgress
	].forEach(
		function(item) {
			if (item) {
				item.classList.remove(
					"active",
					"completed"
				);
			}
		}
	);

	if (emailSection) {
		emailSection.style.display =
			step === "EMAIL"
				? "block"
				: "none";
	}

	if (otpSection) {
		otpSection.style.display =
			step === "OTP"
				? "block"
				: "none";
	}

	if (resetSection) {
		resetSection.style.display =
			step === "RESET"
				? "block"
				: "none";
	}

	if (step === "EMAIL") {
		emailProgress?.classList.add(
			"active"
		);

		setStepDescription(
			"Enter your registered email to receive a verification OTP."
		);
	}

	if (step === "OTP") {
		emailProgress?.classList.add(
			"completed"
		);

		otpProgress?.classList.add(
			"active"
		);

		setStepDescription(
			"Enter the OTP sent to your registered email address."
		);
	}

	if (step === "RESET") {
		emailProgress?.classList.add(
			"completed"
		);

		otpProgress?.classList.add(
			"completed"
		);

		resetProgress?.classList.add(
			"active"
		);

		setStepDescription(
			"Create a new secure password for your account."
		);
	}
}

function setStepDescription(text) {
	const description =
		document.getElementById(
			"forgotStepDescription"
		);

	if (description) {
		description.innerText = text;
	}
}

function startForgotOtpResendTimer(seconds) {
	clearForgotOtpResendTimer();

	forgotOtpResendSeconds =
		Number(seconds) || 0;

	updateForgotOtpResendButton();

	forgotOtpResendTimer =
		window.setInterval(
			function() {

				forgotOtpResendSeconds -= 1;

				updateForgotOtpResendButton();

				if (
					forgotOtpResendSeconds <= 0
				) {
					clearForgotOtpResendTimer();
					updateForgotOtpResendButton();
				}

			},
			1000
		);
}

function clearForgotOtpResendTimer() {
	if (forgotOtpResendTimer) {
		window.clearInterval(
			forgotOtpResendTimer
		);

		forgotOtpResendTimer = null;
	}

	forgotOtpResendSeconds = 0;
}

function updateForgotOtpResendButton() {
	const button =
		document.getElementById(
			"resendForgotOtpBtn"
		);

	const info =
		document.getElementById(
			"forgotOtpInfo"
		);

	if (!button) {
		return;
	}

	if (forgotOtpResendSeconds > 0) {
		button.disabled = true;

		button.innerText =
			`Resend OTP in ${forgotOtpResendSeconds}s`;

		if (info) {
			info.innerText =
				`You can request a new OTP after ${forgotOtpResendSeconds} seconds.`;
		}

	} else {
		button.disabled = false;
		button.innerText = "Resend OTP";

		if (info) {
			info.innerText =
				"Enter the latest OTP received on your email.";
		}
	}
}

function updateForgotPasswordStrength() {
	const password =
		document
			.getElementById("newPassword")
			?.value || "";

	const strength =
		document.getElementById(
			"forgotPasswordStrength"
		);

	if (!strength) {
		return;
	}

	let level = 0;

	if (password.length >= 6) {
		level += 1;
	}

	if (/[A-Z]/.test(password)) {
		level += 1;
	}

	if (/\d/.test(password)) {
		level += 1;
	}

	if (/[^A-Za-z0-9]/.test(password)) {
		level += 1;
	}

	strength.className =
		"forgot-password-strength" +
		(
			level > 0
				? ` level-${level}`
				: ""
		);
}

function showForgotMessage(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type}">
			${escapeHtml(message)}
		</div>
	`;

	window.setTimeout(
		function() {
			if (msg) {
				msg.innerHTML = "";
			}
		},
		4000
	);
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
		button.dataset.originalHtml =
			button.innerHTML;

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

async function readJsonSafely(response) {
	try {
		return await response.json();
	} catch (error) {
		return null;
	}
}

function getErrorMessage(
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

	if (typeof data === "string") {
		return data;
	}

	return fallback;
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}