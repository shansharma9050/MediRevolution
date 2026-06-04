let doctorReportRows = [];

document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	loadDoctorReports();
});

function requireDoctorRole() {
	if (localStorage.getItem("role") !== "DOCTOR") {
		alert("Access denied. Only DOCTOR can access this page.");
		window.location.href = "/dashboard";
	}
}

async function loadDoctorReports() {
	const token = localStorage.getItem("token");

	try {
		const [patientsRes, prescriptionsRes, appointmentsRes] = await Promise.all([
			fetch(`${API_BASE}/doctor/patients`, { headers: { "Authorization": "Bearer " + token } }),
			fetch(`${API_BASE}/doctor/prescriptions`, { headers: { "Authorization": "Bearer " + token } }),
			fetch(`${API_BASE}/doctor/appointments`, { headers: { "Authorization": "Bearer " + token } })
		]);

		const patients = patientsRes.ok ? await patientsRes.json() : [];
		const prescriptions = prescriptionsRes.ok ? await prescriptionsRes.json() : [];
		const appointments = appointmentsRes.ok ? await appointmentsRes.json() : [];

		document.getElementById("reportPatients").innerText = patients.length;
		document.getElementById("reportPrescriptions").innerText = prescriptions.length;
		document.getElementById("reportCompleted").innerText =
			appointments.filter(a => a.status === "COMPLETED").length;
		document.getElementById("reportCancelled").innerText =
			appointments.filter(a => a.status === "CANCELLED").length;

		renderAppointmentReport(appointments);

	} catch (e) {
		document.getElementById("msg").innerHTML =
			`<div class="alert alert-danger">Doctor service not reachable.</div>`;
	}
}

function renderAppointmentReport(appointments) {
	const table = document.getElementById("doctorReportTable");

	doctorReportRows = appointments.map(a => ({
		patient: a.patient ? a.patient.patientName : "",
		date: a.appointmentDate,
		time: a.appointmentTime,
		purpose: a.purpose,
		status: a.status
	}));

	if (!appointments.length) {
		table.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No appointment data found</td></tr>`;
		return;
	}

	let html = "";

	appointments.forEach((a, index) => {
		const patient = a.patient || {};

		html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${safe(patient.patientName)}</strong></td>
                <td>${safe(a.appointmentDate)}</td>
                <td>${safe(a.appointmentTime)}</td>
                <td>${safe(a.purpose)}</td>
                <td>${safe(a.status)}</td>
            </tr>
        `;
	});

	table.innerHTML = html;
}

function exportDoctorReportCsv() {
	if (!doctorReportRows.length) {
		alert("No data to export");
		return;
	}

	const headers = Object.keys(doctorReportRows[0]);
	const csv = [
		headers.join(","),
		...doctorReportRows.map(row => headers.map(h => `"${safe(row[h])}"`).join(","))
	].join("\n");

	const blob = new Blob([csv], { type: "text/csv" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = "doctor-report.csv";
	a.click();

	URL.revokeObjectURL(url);
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}