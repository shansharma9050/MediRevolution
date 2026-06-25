/*const API_BASE_URL = "https://medirevolution-api-gateway.onrender.com";*/

const API_BASE_URL = "http://localhost:8080";

let emailVerified = false;
let verifiedEmail = "";

function showMessage(message, type = "danger") {
	const msg = document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML = `<div class="alert alert-${type}">${message}</div>`;

	setTimeout(() => {
		msg.innerHTML = "";
	}, 5000);
}

function validateEmail(email) {
	return email && email.includes("@") && email.includes(".");
}

function validateMobile(mobile) {
	return /^[0-9]{10}$/.test(mobile);
}

function setButtonLoading(buttonId, loadingText, isLoading) {
	const button = document.getElementById(buttonId);

	if (!button) {
		return;
	}

	if (isLoading) {
		button.dataset.originalText = button.innerHTML;
		button.innerHTML = loadingText;
		button.disabled = true;
	} else {
		button.innerHTML = button.dataset.originalText || button.innerHTML;
		button.disabled = false;
	}
}

function markStepActive(stepId) {
	document.querySelectorAll(".register-steps .step").forEach(step => {
		step.classList.remove("active");
	});

	const step = document.getElementById(stepId);

	if (step) {
		step.classList.add("active");
	}
}

function markStepCompleted(stepId) {
	const step = document.getElementById(stepId);

	if (step) {
		step.classList.remove("active");
		step.classList.add("completed");
	}
}

function allowOnlyTenDigits(input) {
	input.value = input.value.replace(/[^0-9]/g, "").slice(0, 10);
}

async function sendEmailOtp() {
	const email = document.getElementById("email").value.trim();

	if (!validateEmail(email)) {
		showMessage("Please enter a valid email address");
		return;
	}

	setButtonLoading("sendEmailOtpBtn", "Sending...", true);

	try {
		const response = await fetch(`${API_BASE_URL}/auth/send-email-otp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email })
		});

		const result = await response.json();

		if (!response.ok) {
			showMessage(result.message || "Unable to send email OTP");
			return;
		}

		document.getElementById("emailOtpBox").style.display = "block";
		showMessage("Email OTP sent successfully", "success");

	} catch (error) {
		showMessage("Server not reachable. Please check API Gateway.");
		console.error(error);
	} finally {
		setButtonLoading("sendEmailOtpBtn", "Send OTP", false);
	}
}

async function verifyEmailOtp() {
	const email = document.getElementById("email").value.trim();
	const otp = document.getElementById("emailOtp").value.trim();

	if (!validateEmail(email)) {
		showMessage("Please enter a valid email address");
		return;
	}

	if (!otp || otp.length < 4) {
		showMessage("Please enter valid email OTP");
		return;
	}

	try {
		const response = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, otp })
		});

		const result = await response.json();

		if (!response.ok) {
			showMessage(result.message || "Invalid email OTP");
			return;
		}

		emailVerified = true;
		verifiedEmail = email;

		document.getElementById("emailSection").style.display = "none";
		document.getElementById("accountSection").style.display = "block";

		markStepCompleted("stepEmail");
		markStepActive("stepAccount");

		showMessage("Email verified successfully", "success");

	} catch (error) {
		showMessage("Server not reachable. Please check API Gateway.");
		console.error(error);
	}
}

function checkPasswordStrength() {
	const password = document.getElementById("password").value;
	const bar = document.getElementById("passwordStrengthBar");
	const text = document.getElementById("passwordStrengthText");

	if (!bar || !text) {
		return;
	}

	let strength = 0;

	if (password.length >= 6) strength++;
	if (/[A-Z]/.test(password)) strength++;
	if (/[0-9]/.test(password)) strength++;
	if (/[^A-Za-z0-9]/.test(password)) strength++;

	bar.className = "";

	if (!password) {
		bar.style.width = "0%";
		text.innerHTML = "Password must be at least 6 characters.";
		return;
	}

	if (strength <= 1) {
		bar.style.width = "30%";
		bar.classList.add("weak");
		text.innerHTML = "Weak password";
	} else if (strength === 2 || strength === 3) {
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
	const fullName = document.getElementById("fullName").value.trim();
	const countryCode = document.getElementById("countryCode").value;
	const mobile = document.getElementById("mobile").value.trim();
	const password = document.getElementById("password").value.trim();
	const confirmPassword = document.getElementById("confirmPassword").value.trim();
	const role = document.getElementById("role").value;

	if (!emailVerified) {
		showMessage("Please verify your email first");
		return;
	}

	if (!fullName) {
		showMessage("Full name or business name is required");
		return;
	}

	if (!countryCode) {
		showMessage("Please select country code");
		return;
	}

	if (!validateMobile(mobile)) {
		showMessage("Please enter exactly 10 digit mobile number");
		return;
	}

	if (!role) {
		showMessage("Please select role");
		return;
	}

	if (!password || password.length < 6) {
		showMessage("Password must be at least 6 characters");
		return;
	}

	if (password !== confirmPassword) {
		showMessage("Password and re-enter password do not match");
		return;
	}

	setButtonLoading("registerBtn", "Creating Account...", true);

	try {
		const response = await fetch(`${API_BASE_URL}/auth/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				fullName: fullName,
				email: verifiedEmail,
				countryCode: countryCode,
				mobile: mobile,
				fullMobileNumber: countryCode + mobile,
				password: password,
				role: role,
				emailVerified: true,
				mobileVerified: false
			})
		});

		const result = await response.json();

		if (!response.ok) {
			showMessage(result.message || "Registration failed");
			return;
		}

		markStepCompleted("stepAccount");

		if (role === "PATIENT") {
			showMessage("Patient registration successful. You can login now.", "success");
		} else {
			showMessage("Registration successful. Please wait for admin approval.", "success");
		}

		setTimeout(() => {
			window.location.href = "/";
		}, 2500);

	} catch (error) {
		showMessage("Server not reachable. Please check API Gateway.");
		console.error(error);
	} finally {
		setButtonLoading("registerBtn", "Create My Account", false);
	}
}

async function login() {
	const email = document.getElementById("email").value.trim();
	const password = document.getElementById("password").value.trim();
	const rememberPassword = document.getElementById("rememberPassword")?.checked;

	if (!validateEmail(email)) {
		showMessage("Please enter a valid email address");
		return;
	}

	if (!password) {
		showMessage("Password is required");
		return;
	}

	try {
		const response = await fetch(`${API_BASE_URL}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password })
		});

		const result = await response.json();

		if (!response.ok) {
			showMessage(result.message || "Login failed");
			return;
		}

		localStorage.setItem("token", result.token);
		localStorage.setItem("email", result.email);
		localStorage.setItem("role", result.role);
		localStorage.setItem("userId", result.userId);
		localStorage.setItem("fullName", result.fullName || result.userName || "");

		if (rememberPassword) {
			localStorage.setItem("rememberedEmail", email);
			localStorage.setItem("rememberedPassword", password);
		} else {
			localStorage.removeItem("rememberedEmail");
			localStorage.removeItem("rememberedPassword");
		}

		window.location.href = "/dashboard";

	} catch (error) {
		showMessage("Server not reachable. Please check API Gateway.");
		console.error(error);
	}
}

function togglePassword() {
	const passwordInput = document.getElementById("password");

	if (!passwordInput) {
		return;
	}

	passwordInput.type = passwordInput.type === "password" ? "text" : "password";
}

function loadRememberedLogin() {
	const rememberedEmail = localStorage.getItem("rememberedEmail");
	const rememberedPassword = localStorage.getItem("rememberedPassword");

	const emailInput = document.getElementById("email");
	const passwordInput = document.getElementById("password");
	const rememberCheckbox = document.getElementById("rememberPassword");

	if (rememberedEmail && emailInput) {
		emailInput.value = rememberedEmail;
	}

	if (rememberedPassword && passwordInput) {
		passwordInput.value = rememberedPassword;
	}

	if (rememberedEmail && rememberedPassword && rememberCheckbox) {
		rememberCheckbox.checked = true;
	}
}

document.addEventListener("DOMContentLoaded", function () {
	loadRememberedLogin();
});