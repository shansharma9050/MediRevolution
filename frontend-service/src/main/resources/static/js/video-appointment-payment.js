async function bookVideoAppointmentWithPayment() {
	const token = localStorage.getItem("token");

	const payload = {
		doctorAuthUserId: document.getElementById("doctorAuthUserId").value,
		appointmentDate: document.getElementById("appointmentDate").value,
		appointmentTime: document.getElementById("appointmentTime").value,
		patientName: localStorage.getItem("fullName"),
		patientMobile: document.getElementById("patientMobile").value,
		symptoms: document.getElementById("symptoms").value
	};

	if (!payload.doctorAuthUserId) {
		alert("Please select doctor");
		return;
	}

	if (!payload.appointmentDate || !payload.appointmentTime) {
		alert("Please select appointment date and time");
		return;
	}

	try {
		const response = await fetch(`${API_BASE}/doctor/payments/video-appointment`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payload)
		});

		const result = await response.json();

		if (!response.ok) {
			alert(result.message || "Unable to start payment");
			return;
		}

		window.location.href = result.redirectUrl;

	} catch (e) {
		console.error(e);
		alert("Payment service not reachable");
	}
}