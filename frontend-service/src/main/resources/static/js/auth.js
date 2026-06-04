const API_BASE_URL = "http://localhost:8080";

function showMessage(message, type = "danger") {
	document.getElementById("msg").innerHTML =
		`<div class="alert alert-${type}">${message}</div>`;
}

function validateEmail(email) {
	return email && email.includes("@") && email.includes(".");
}

async function login() {
	const email = document.getElementById("email").value.trim();
	const password = document.getElementById("password").value.trim();

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

		window.location.href = "/dashboard";

	} catch (error) {
		showMessage("Server not reachable. Please check API Gateway.");
		console.error(error);
	}
}

async function register() {
	const fullName = document.getElementById("fullName").value.trim();
	const email = document.getElementById("email").value.trim();
	const mobile = document.getElementById("mobile").value.trim();
	const password = document.getElementById("password").value.trim();
	const role = document.getElementById("role").value;

	if (!fullName) {
		showMessage("Name is required");
		return;
	}

	if (!validateEmail(email)) {
		showMessage("Please enter a valid email address");
		return;
	}

	if (!mobile || mobile.length < 10) {
		showMessage("Please enter a valid mobile number");
		return;
	}

	if (!password || password.length < 6) {
		showMessage("Password must be at least 6 characters");
		return;
	}

	if (!role) {
		showMessage("Please select role");
		return;
	}

	try {
		const response = await fetch(`${API_BASE_URL}/auth/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				fullName,
				email,
				mobile,
				password,
				role
			})
		});

		const result = await response.json();

		if (!response.ok) {
			showMessage(result.message || "Registration failed");
			return;
		}

		if (role === "PATIENT") {
			showMessage("Patient registration successful. You can login now.", "success");
		} else {
			showMessage("Registration successful. Please wait for admin approval.", "success");
		}


		setTimeout(() => {
			window.location.href = "/";
		}, 2200);

	} catch (error) {
		showMessage("Server not reachable. Please check API Gateway.");
		console.error(error);
	}
}