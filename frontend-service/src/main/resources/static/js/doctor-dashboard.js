document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	loadDoctorDashboard();
});

function requireDoctorRole() {
	const role = localStorage.getItem("role");

	if (role !== "DOCTOR") {
		alert("Access denied. Only DOCTOR can access this page.");
		window.location.href = "/dashboard";
	}
}

async function loadDoctorDashboard() {
	const token = localStorage.getItem("token");

	try {
		const [patientsRes, prescriptionsRes, appointmentsRes] = await Promise.all([
			fetch(`${API_BASE}/doctor/patients`, {
				headers: { "Authorization": "Bearer " + token }
			}),
			fetch(`${API_BASE}/doctor/prescriptions`, {
				headers: { "Authorization": "Bearer " + token }
			}),
			fetch(`${API_BASE}/doctor/appointments`, {
				headers: { "Authorization": "Bearer " + token }
			})
		]);

		const patients = patientsRes.ok ? await patientsRes.json() : [];
		const prescriptions = prescriptionsRes.ok ? await prescriptionsRes.json() : [];
		const appointments = appointmentsRes.ok ? await appointmentsRes.json() : [];

		document.getElementById("patientsCount").innerText = patients.length;
		document.getElementById("prescriptionsCount").innerText = prescriptions.length;
		document.getElementById("appointmentsCount").innerText = appointments.length;
		document.getElementById("requestedCount").innerText =
			appointments.filter(a => a.status === "REQUESTED").length;

	} catch (e) {
		showDoctorMessage("Doctor service not reachable.");
	}
}

function showDoctorMessage(message, type = "danger") {
	document.getElementById("msg").innerHTML =
		`<div class="alert alert-${type}">${message}</div>`;
}