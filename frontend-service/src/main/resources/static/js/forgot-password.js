let forgotPasswordEmail = "";
let forgotPasswordOtpVerified = false;

function toggleForgotPassword(inputId) {
	const input = document.getElementById(inputId);

	if (!input) {
		return;
	}

	input.type = input.type === "password" ? "text" : "password";
}

async function sendForgotPasswordOtp() {
	const email = document.getElementById("forgotEmail").value.trim();

	if (!validateEmail(email)) {
		showMessage("Please enter a valid registered email address");
		return;
	}

	setButtonLoading("sendForgotOtpBtn", "Sending OTP...", true);

	try {
		const response = await fetch(`${API_BASE_URL}/auth/forgot-password/send-otp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email })
		});

		const result = await response.json();

		if (!response.ok) {
			showMessage(result.message || "Unable to send OTP");
			return;
		}

		forgotPasswordEmail = email;

		document.getElementById("forgotEmailSection").style.display = "none";
		document.getElementById("forgotOtpSection").style.display = "block";

		showMessage("OTP sent successfully to your email", "success");

	} catch (error) {
		showMessage("Server not reachable. Please check API Gateway.");
		console.error(error);
	} finally {
		setButtonLoading("sendForgotOtpBtn", "Send OTP", false);
	}
}

async function verifyForgotPasswordOtp() {
	const otp = document.getElementById("forgotOtp").value.trim();

	if (!forgotPasswordEmail) {
		showMessage("Email is missing. Please try again.");
		return;
	}

	if (!otp || otp.length < 4) {
		showMessage("Please enter valid OTP");
		return;
	}

	setButtonLoading("verifyForgotOtpBtn", "Verifying...", true);

	try {
		const response = await fetch(`${API_BASE_URL}/auth/forgot-password/verify-otp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: forgotPasswordEmail,
				otp: otp
			})
		});

		const result = await response.json();

		if (!response.ok) {
			showMessage(result.message || "Invalid OTP");
			return;
		}

		forgotPasswordOtpVerified = true;

		document.getElementById("forgotOtpSection").style.display = "none";
		document.getElementById("resetPasswordSection").style.display = "block";

		showMessage("OTP verified successfully. Please set new password.", "success");

	} catch (error) {
		showMessage("Server not reachable. Please check API Gateway.");
		console.error(error);
	} finally {
		setButtonLoading("verifyForgotOtpBtn", "Verify OTP", false);
	}
}

async function resetForgotPassword() {
	const newPassword = document.getElementById("newPassword").value.trim();
	const confirmNewPassword = document.getElementById("confirmNewPassword").value.trim();

	if (!forgotPasswordEmail) {
		showMessage("Email is missing. Please restart forgot password process.");
		return;
	}

	if (!forgotPasswordOtpVerified) {
		showMessage("Please verify OTP first");
		return;
	}

	if (!newPassword || newPassword.length < 6) {
		showMessage("New password must be at least 6 characters");
		return;
	}

	if (newPassword !== confirmNewPassword) {
		showMessage("New password and confirm password do not match");
		return;
	}

	setButtonLoading("resetPasswordBtn", "Resetting...", true);

	try {
		const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: forgotPasswordEmail,
				newPassword: newPassword
			})
		});

		const result = await response.json();

		if (!response.ok) {
			showMessage(result.message || "Unable to reset password");
			return;
		}

		showMessage("Password reset successfully. Redirecting to login...", "success");

		setTimeout(() => {
			window.location.href = "/";
		}, 2000);

	} catch (error) {
		showMessage("Server not reachable. Please check API Gateway.");
		console.error(error);
	} finally {
		setButtonLoading("resetPasswordBtn", "Reset Password", false);
	}
}