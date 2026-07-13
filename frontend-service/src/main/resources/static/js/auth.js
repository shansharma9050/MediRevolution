/* const API_BASE_URL = "https://medirevolution-api-gateway.onrender.com"; */

const API_BASE_URL = "http://localhost:8080";

let emailVerified = false;
let verifiedEmail = "";

function showMessage(message, type = "danger") {
	const msg = document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

	setTimeout(() => {
		if (msg) {
			msg.innerHTML = "";
		}
	}, 5000);
}

function validateEmail(email) {
	return Boolean(
		email &&
		email.includes("@") &&
		email.includes(".")
	);
}

function validateMobile(mobile) {
	return /^[0-9]{10}$/.test(mobile);
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
		button.dataset.originalText =
			button.innerHTML;

		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2"
				  role="status"
				  aria-hidden="true">
			</span>
			${escapeHtml(loadingText)}
		`;

		button.disabled = true;

	} else {
		button.innerHTML =
			button.dataset.originalText ||
			button.innerHTML;

		button.disabled = false;
	}
}

function markStepActive(stepId) {
	document
		.querySelectorAll(".register-steps .step")
		.forEach(step => {
			step.classList.remove("active");
		});

	const step =
		document.getElementById(stepId);

	if (step) {
		step.classList.add("active");
	}
}

function markStepCompleted(stepId) {
	const step =
		document.getElementById(stepId);

	if (step) {
		step.classList.remove("active");
		step.classList.add("completed");
	}
}

function allowOnlyTenDigits(input) {
	if (!input) {
		return;
	}

	input.value =
		input.value
			.replace(/[^0-9]/g, "")
			.slice(0, 10);
}

async function sendEmailOtp() {
	const emailInput =
		document.getElementById("email");

	const email =
		emailInput
			? emailInput.value.trim()
			: "";

	if (!validateEmail(email)) {
		showMessage(
			"Please enter a valid email address"
		);

		return;
	}

	setButtonLoading(
		"sendEmailOtpBtn",
		"Sending...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE_URL}/auth/send-email-otp`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify({ email })
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMessage(
				getErrorMessage(
					result,
					"Unable to send email OTP"
				)
			);

			return;
		}

		const emailOtpBox =
			document.getElementById(
				"emailOtpBox"
			);

		if (emailOtpBox) {
			emailOtpBox.style.display =
				"block";
		}

		showMessage(
			"Email OTP sent successfully",
			"success"
		);

	} catch (error) {
		showMessage(
			"Server not reachable. Please check API Gateway."
		);

		console.error(error);

	} finally {
		setButtonLoading(
			"sendEmailOtpBtn",
			"Send OTP",
			false
		);
	}
}

async function verifyEmailOtp() {
	const email =
		document
			.getElementById("email")
			?.value
			.trim() || "";

	const otp =
		document
			.getElementById("emailOtp")
			?.value
			.trim() || "";

	if (!validateEmail(email)) {
		showMessage(
			"Please enter a valid email address"
		);

		return;
	}

	if (!otp || otp.length < 4) {
		showMessage(
			"Please enter valid email OTP"
		);

		return;
	}

	setButtonLoading(
		"verifyEmailOtpBtn",
		"Verifying...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE_URL}/auth/verify-email-otp`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify({
							email,
							otp
						})
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMessage(
				getErrorMessage(
					result,
					"Invalid email OTP"
				)
			);

			return;
		}

		emailVerified = true;
		verifiedEmail = email;

		const emailSection =
			document.getElementById(
				"emailSection"
			);

		const accountSection =
			document.getElementById(
				"accountSection"
			);

		if (emailSection) {
			emailSection.style.display =
				"none";
		}

		if (accountSection) {
			accountSection.style.display =
				"block";
		}

		markStepCompleted("stepEmail");
		markStepActive("stepAccount");

		showMessage(
			"Email verified successfully",
			"success"
		);

	} catch (error) {
		showMessage(
			"Server not reachable. Please check API Gateway."
		);

		console.error(error);

	} finally {
		setButtonLoading(
			"verifyEmailOtpBtn",
			"Verify",
			false
		);
	}
}

function checkPasswordStrength() {
	const password =
		document
			.getElementById("password")
			?.value || "";

	const bar =
		document.getElementById(
			"passwordStrengthBar"
		);

	const text =
		document.getElementById(
			"passwordStrengthText"
		);

	if (!bar || !text) {
		return;
	}

	let strength = 0;

	if (password.length >= 6) {
		strength++;
	}

	if (/[A-Z]/.test(password)) {
		strength++;
	}

	if (/[0-9]/.test(password)) {
		strength++;
	}

	if (/[^A-Za-z0-9]/.test(password)) {
		strength++;
	}

	bar.className = "";

	if (!password) {
		bar.style.width = "0%";
		text.innerHTML =
			"Password must be at least 6 characters.";

		return;
	}

	if (strength <= 1) {
		bar.style.width = "30%";
		bar.classList.add("weak");
		text.innerHTML = "Weak password";

	} else if (
		strength === 2 ||
		strength === 3
	) {
		bar.style.width = "65%";
		bar.classList.add("medium");
		text.innerHTML = "Medium password";

	} else {
		bar.style.width = "100%";
		bar.classList.add("strong");
		text.innerHTML = "Strong password";
	}
}

async function register() {
	const fullName =
		document
			.getElementById("fullName")
			?.value
			.trim() || "";

	const countryCode =
		document
			.getElementById("countryCode")
			?.value || "";

	const mobile =
		document
			.getElementById("mobile")
			?.value
			.trim() || "";

	const password =
		document
			.getElementById("password")
			?.value
			.trim() || "";

	const confirmPassword =
		document
			.getElementById("confirmPassword")
			?.value
			.trim() || "";

	const role =
		document
			.getElementById("role")
			?.value || "";

	if (!emailVerified) {
		showMessage(
			"Please verify your email first"
		);

		return;
	}

	if (!fullName) {
		showMessage(
			"Full name or business name is required"
		);

		return;
	}

	if (!countryCode) {
		showMessage(
			"Please select country code"
		);

		return;
	}

	if (!validateMobile(mobile)) {
		showMessage(
			"Please enter exactly 10 digit mobile number"
		);

		return;
	}

	if (!role) {
		showMessage(
			"Please select role"
		);

		return;
	}

	if (
		!password ||
		password.length < 6
	) {
		showMessage(
			"Password must be at least 6 characters"
		);

		return;
	}

	if (password !== confirmPassword) {
		showMessage(
			"Password and re-enter password do not match"
		);

		return;
	}

	setButtonLoading(
		"registerBtn",
		"Creating Account...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE_URL}/auth/register`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify({
							fullName: fullName,
							email: verifiedEmail,
							countryCode: countryCode,
							mobile: mobile,
							fullMobileNumber:
								countryCode + mobile,
							password: password,
							role: role,
							emailVerified: true,
							mobileVerified: false
						})
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMessage(
				getErrorMessage(
					result,
					"Registration failed"
				)
			);

			return;
		}

		markStepCompleted("stepAccount");

		if (role === "PATIENT") {
			showMessage(
				"Patient registration successful. You can login now.",
				"success"
			);
		} else {
			showMessage(
				"Registration successful. Please wait for admin approval.",
				"success"
			);
		}

		setTimeout(() => {
			window.location.href = "/";
		}, 2500);

	} catch (error) {
		showMessage(
			"Server not reachable. Please check API Gateway."
		);

		console.error(error);

	} finally {
		setButtonLoading(
			"registerBtn",
			"Create My Account",
			false
		);
	}
}

async function login() {
	const email =
		document
			.getElementById("email")
			?.value
			.trim() || "";

	const password =
		document
			.getElementById("password")
			?.value
			.trim() || "";

	const rememberPassword =
		document
			.getElementById("rememberPassword")
			?.checked;

	if (!validateEmail(email)) {
		showMessage(
			"Please enter a valid email address"
		);

		return;
	}

	if (!password) {
		showMessage(
			"Password is required"
		);

		return;
	}

	setButtonLoading(
		"loginBtn",
		"Signing In...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE_URL}/auth/login`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json"
					},

					body:
						JSON.stringify({
							email,
							password
						})
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMessage(
				getErrorMessage(
					result,
					"Login failed"
				)
			);

			return;
		}

		localStorage.setItem(
			"token",
			result.token
		);

		localStorage.setItem(
			"email",
			result.email || email
		);

		localStorage.setItem(
			"role",
			result.role || ""
		);

		localStorage.setItem(
			"userId",
			result.userId || ""
		);

		localStorage.setItem(
			"fullName",
			result.fullName ||
			result.userName ||
			""
		);

		localStorage.removeItem(
			"activeModule"
		);

		localStorage.removeItem(
			"saasMode"
		);

		localStorage.removeItem(
			"tenantId"
		);

		localStorage.removeItem(
			"tenantName"
		);

		localStorage.removeItem(
			"saasMemberRole"
		);

		localStorage.removeItem(
			"saasOwnerOrAdmin"
		);

		localStorage.removeItem(
			"saasPermissions"
		);

		if (rememberPassword) {
			localStorage.setItem(
				"rememberedEmail",
				email
			);

			localStorage.setItem(
				"rememberedPassword",
				password
			);

		} else {
			localStorage.removeItem(
				"rememberedEmail"
			);

			localStorage.removeItem(
				"rememberedPassword"
			);
		}

		window.location.replace(
			"/module-selection"
		);

	} catch (error) {
		showMessage(
			"Server not reachable. Please check API Gateway."
		);

		console.error(error);

	} finally {
		setButtonLoading(
			"loginBtn",
			"Login to Dashboard",
			false
		);
	}
}

function togglePassword() {
	const passwordInput =
		document.getElementById("password");

	const icon =
		document.getElementById(
			"passwordToggleIcon"
		);

	if (!passwordInput) {
		return;
	}

	const showPassword =
		passwordInput.type === "password";

	passwordInput.type =
		showPassword
			? "text"
			: "password";

	if (icon) {
		icon.className =
			showPassword
				? "bi bi-eye-slash-fill"
				: "bi bi-eye-fill";
	}
}

function toggleRegisterPassword(
	inputId,
	iconId
) {
	const input =
		document.getElementById(inputId);

	const icon =
		document.getElementById(iconId);

	if (!input) {
		return;
	}

	const showPassword =
		input.type === "password";

	input.type =
		showPassword
			? "text"
			: "password";

	if (icon) {
		icon.className =
			showPassword
				? "bi bi-eye-slash-fill"
				: "bi bi-eye-fill";
	}
}

function loadRememberedLogin() {
	const rememberedEmail =
		localStorage.getItem(
			"rememberedEmail"
		);

	const rememberedPassword =
		localStorage.getItem(
			"rememberedPassword"
		);

	const emailInput =
		document.getElementById("email");

	const passwordInput =
		document.getElementById("password");

	const rememberCheckbox =
		document.getElementById(
			"rememberPassword"
		);

	if (
		rememberedEmail &&
		emailInput
	) {
		emailInput.value =
			rememberedEmail;
	}

	if (
		rememberedPassword &&
		passwordInput
	) {
		passwordInput.value =
			rememberedPassword;
	}

	if (
		rememberedEmail &&
		rememberedPassword &&
		rememberCheckbox
	) {
		rememberCheckbox.checked = true;
	}
}

function handleAuthEnterKey(event) {
	if (event.key !== "Enter") {
		return;
	}

	const loginButton =
		document.getElementById("loginBtn");

	if (
		loginButton &&
		!loginButton.disabled
	) {
		login();
		return;
	}

	const emailOtpBox =
		document.getElementById("emailOtpBox");

	const verifyButton =
		document.getElementById(
			"verifyEmailOtpBtn"
		);

	if (
		emailOtpBox &&
		emailOtpBox.style.display !== "none" &&
		verifyButton &&
		!verifyButton.disabled
	) {
		verifyEmailOtp();
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

document.addEventListener(
	"DOMContentLoaded",
	function() {
		loadRememberedLogin();

		document.addEventListener(
			"keydown",
			handleAuthEnterKey
		);
	}
);