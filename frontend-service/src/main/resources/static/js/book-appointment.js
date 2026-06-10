let doctors = [];
let hospitals = [];
let hospitalDoctorsMap = {};

let selectedType = "DOCTOR";
let consultationType = "OFFLINE";

let selectedDoctor = null;
let selectedHospital = null;
let selectedHospitalDoctor = null;
let selectedSlot = null;

document.addEventListener("DOMContentLoaded", function () {
	requirePatientRole();
	loadPatientInfo();
	loadDoctorsAndHospitals();
	switchConsultationType();
});

function requirePatientRole() {
	if (localStorage.getItem("role") !== "PATIENT") {
		alert("Only PATIENT can book appointment.");
		window.location.href = "/dashboard";
	}
}

function loadPatientInfo() {
	document.getElementById("patientName").value =
		localStorage.getItem("fullName") || "";

	document.getElementById("patientMobile").value =
		localStorage.getItem("mobile") || "";
}

async function loadDoctorsAndHospitals() {
	const token = localStorage.getItem("token");

	try {
		const [doctorRes, hospitalRes] = await Promise.all([
			fetch(`${API_BASE}/users/profiles/doctors`, {
				headers: {
					"Authorization": "Bearer " + token
				}
			}),
			fetch(`${API_BASE}/users/profiles/hospitals`, {
				headers: {
					"Authorization": "Bearer " + token
				}
			})
		]);

		doctors = doctorRes.ok ? await doctorRes.json() : [];
		hospitals = hospitalRes.ok ? await hospitalRes.json() : [];

		renderProfileCards();

	} catch (error) {
		console.error(error);
		showMsg("Unable to load doctors/hospitals. Please check user-service.");
	}
}

function switchBookingType() {
	selectedType = document.getElementById("bookingType").value;

	selectedDoctor = null;
	selectedHospital = null;
	selectedHospitalDoctor = null;
	selectedSlot = null;

	document.getElementById("selectedTime").value = "";
	document.getElementById("selectedInfo").style.display = "none";

	document.getElementById("cardSectionTitle").innerText =
		selectedType === "DOCTOR" ? "Select Doctor" : "Select Hospital";

	document.getElementById("slotContainer").innerHTML =
		`<span class="text-muted">Select doctor/hospital and date to view slots.</span>`;

	renderProfileCards();
}

function switchConsultationType() {
	consultationType = document.getElementById("consultationType").value;

	const button = document.getElementById("bookAppointmentBtn");

	if (!button) {
		return;
	}

	if (consultationType === "ONLINE") {
		button.innerText = "Pay & Book Video Consultation";
	} else {
		button.innerText = "Book Offline Appointment";
	}
}

function filterCards() {
	renderProfileCards();
}

function renderProfileCards() {
	const container = document.getElementById("profileCards");
	const keyword = document.getElementById("searchKeyword").value.toLowerCase();

	let html = "";

	if (selectedType === "DOCTOR") {

		const filteredDoctors = doctors.filter(d =>
			JSON.stringify(d).toLowerCase().includes(keyword)
		);

		if (!filteredDoctors.length) {
			container.innerHTML =
				`<div class="col-12 text-center text-muted py-4">No doctors found.</div>`;
			return;
		}

		filteredDoctors.forEach(d => {

			const doctorId = getAuthUserId(d);

			const selectedClass =
				selectedDoctor && getAuthUserId(selectedDoctor) === doctorId
					? "selected"
					: "";

			html += `
                <div class="col-xl-4 col-md-6">
                    <div class="appointment-profile-card ${selectedClass}">
                        <div class="d-flex gap-3 align-items-start">
                            <div class="profile-avatar-circle">👨‍⚕️</div>

                            <div>
                                <h5 class="fw-bold text-primary mb-1">
                                    ${safe(d.doctorName)}
                                </h5>

                                <div class="text-muted small">
                                    ${safe(d.specialization)}
                                </div>

                                <div class="text-muted small">
                                    ${safe(d.hospitalName)}
                                </div>

                                <div class="mt-2">
                                    <span class="badge bg-info text-dark">
                                        ${safe(d.experienceYears)} Years Exp.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <hr>

                        <div class="small text-muted mb-2">
                            ${safe(d.address)}, ${safe(d.district)}, ${safe(d.state)}
                        </div>

                        <button class="btn btn-medi"
                                onclick="selectDoctor(${doctorId})">
                            Select Doctor
                        </button>
                    </div>
                </div>
            `;
		});

		container.innerHTML = html;
		return;
	}

	if (selectedType === "HOSPITAL") {

		const filteredHospitals = hospitals.filter(h =>
			JSON.stringify(h).toLowerCase().includes(keyword)
		);

		if (!filteredHospitals.length) {
			container.innerHTML =
				`<div class="col-12 text-center text-muted py-4">
                    No hospitals found. Please create hospital profile first.
                </div>`;
			return;
		}

		filteredHospitals.forEach(h => {

			const hospitalId = getAuthUserId(h);

			if (!hospitalId) {
				return;
			}

			const selectedClass =
				selectedHospital && getAuthUserId(selectedHospital) === hospitalId
					? "selected"
					: "";

			html += `
                <div class="col-xl-4 col-md-6">
                    <div class="appointment-profile-card ${selectedClass}">

                        <div class="d-flex gap-3 align-items-start">
                            <div class="profile-avatar-circle">🏥</div>

                            <div>
                                <h5 class="fw-bold text-primary mb-1">
                                    ${safe(h.hospitalName)}
                                </h5>

                                <div class="text-muted small">
                                    ${safe(h.hospitalType)}
                                </div>

                                <div class="mt-2">
                                    <span class="badge bg-info text-dark">
                                        Beds: ${safe(h.bedCapacity)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <hr>

                        <div class="small text-muted mb-2">
                            ${safe(h.address)}, ${safe(h.district)}, ${safe(h.state)}
                        </div>

                        <div class="mb-3">
                            <label class="form-label small">Select Doctor</label>

                            <select id="hospitalDoctor_${hospitalId}" class="form-select">
                                <option value="">Loading doctors...</option>
                            </select>
                        </div>

                        <button class="btn btn-medi"
                                onclick="selectHospital(${hospitalId})">
                            Select Hospital Doctor
                        </button>

                    </div>
                </div>
            `;
		});

		container.innerHTML = html;
		loadDoctorsForVisibleHospitals();
	}
}

async function loadDoctorsForVisibleHospitals() {
	const token = localStorage.getItem("token");

	for (const hospital of hospitals) {

		const hospitalId = getAuthUserId(hospital);

		if (!hospitalId) {
			continue;
		}

		const dropdown = document.getElementById("hospitalDoctor_" + hospitalId);

		if (!dropdown) {
			continue;
		}

		try {
			const response = await fetch(`${API_BASE}/hospital/doctors/hospital/${hospitalId}`, {
				headers: {
					"Authorization": "Bearer " + token
				}
			});

			const hospitalDoctorList = response.ok ? await response.json() : [];

			hospitalDoctorsMap[hospitalId] = hospitalDoctorList;

			if (!hospitalDoctorList.length) {
				dropdown.innerHTML =
					`<option value="">No doctors added</option>`;
				continue;
			}

			let options =
				`<option value="">Select Doctor</option>`;

			hospitalDoctorList.forEach(d => {
				options += `
                    <option value="${d.id}">
                        ${safe(d.doctorName)} - ${safe(d.department)}
                    </option>
                `;
			});

			dropdown.innerHTML = options;

		} catch (e) {
			dropdown.innerHTML =
				`<option value="">Unable to load doctors</option>`;
		}
	}
}

function selectDoctor(doctorId) {
	selectedDoctor = doctors.find(d => getAuthUserId(d) === doctorId);

	if (!selectedDoctor) {
		showMsg("Selected doctor not found");
		return;
	}

	selectedHospital = null;
	selectedHospitalDoctor = null;
	selectedSlot = null;

	document.getElementById("selectedTime").value = "";

	document.getElementById("selectedInfo").style.display = "block";
	document.getElementById("selectedInfo").innerHTML =
		`<strong>Selected Doctor:</strong> ${safe(selectedDoctor.doctorName)}
         | ${safe(selectedDoctor.specialization)}`;

	renderProfileCards();
	loadSlots();
}

function selectHospital(hospitalId) {
	const doctorSelect = document.getElementById("hospitalDoctor_" + hospitalId);

	if (!doctorSelect || !doctorSelect.value) {
		showMsg("Please select hospital doctor");
		return;
	}

	const hospitalDoctorId = Number(doctorSelect.value);

	const doctorList = hospitalDoctorsMap[hospitalId] || [];

	const hospitalDoctor = doctorList.find(d => d.id === hospitalDoctorId);

	if (!hospitalDoctor) {
		showMsg("Selected hospital doctor not found");
		return;
	}

	selectedHospital = hospitals.find(h => getAuthUserId(h) === hospitalId);

	if (!selectedHospital) {
		showMsg("Selected hospital not found");
		return;
	}

	selectedHospitalDoctor = hospitalDoctor;
	selectedDoctor = null;
	selectedSlot = null;

	document.getElementById("selectedTime").value = "";

	document.getElementById("selectedInfo").style.display = "block";
	document.getElementById("selectedInfo").innerHTML =
		`<strong>Selected Hospital:</strong> ${safe(selectedHospital.hospitalName)}
         | <strong>Doctor:</strong> ${safe(hospitalDoctor.doctorName)}
         | <strong>Department:</strong> ${safe(hospitalDoctor.department)}`;

	renderProfileCards();
	loadSlots();
}

function reloadSlotsIfSelected() {
	if (selectedType === "DOCTOR" && selectedDoctor) {
		loadSlots();
	}

	if (selectedType === "HOSPITAL" && selectedHospital && selectedHospitalDoctor) {
		loadSlots();
	}
}

async function loadSlots() {
	const date = document.getElementById("appointmentDate").value;

	if (!date) {
		showMsg("Please select appointment date");
		return;
	}

	const token = localStorage.getItem("token");

	let url = "";

	if (selectedType === "DOCTOR") {

		if (!selectedDoctor) {
			showMsg("Please select doctor");
			return;
		}

		const doctorId = getAuthUserId(selectedDoctor);

		if (!doctorId || Number.isNaN(doctorId)) {
			showMsg("Doctor ID not found. Please check doctor profile authUserId.");
			console.log("Selected Doctor Object:", selectedDoctor);
			return;
		}

		url = `${API_BASE}/doctor/available-slots/${doctorId}?date=${date}`;
	}

	if (selectedType === "HOSPITAL") {

		if (!selectedHospital || !selectedHospitalDoctor) {
			showMsg("Please select hospital doctor");
			return;
		}

		const hospitalId = getAuthUserId(selectedHospital);

		if (!hospitalId || Number.isNaN(hospitalId)) {
			showMsg("Hospital ID not found. Please check hospital profile authUserId.");
			console.log("Selected Hospital Object:", selectedHospital);
			return;
		}

		url =
			`${API_BASE}/hospital/available-slots` +
			`?hospitalId=${hospitalId}` +
			`&hospitalDoctorId=${selectedHospitalDoctor.id}` +
			`&date=${date}`;
	}

	console.log("Loading slots URL:", url);

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		let result = null;

		try {
			result = await response.json();
		} catch (e) {
			result = null;
		}

		if (!response.ok) {
			console.error("Slot API failed:", response.status, result);
			showMsg(
				(result && result.message)
					? result.message
					: `Unable to load slots. HTTP Status: ${response.status}`
			);
			return;
		}

		renderSlots(result || []);

	} catch (error) {
		console.error("Slot API network error:", error);
		showMsg("Appointment service not reachable. Check backend service/API_BASE/CORS/security.");
	}
}

function renderSlots(slots) {
	const container = document.getElementById("slotContainer");

	selectedSlot = null;
	document.getElementById("selectedTime").value = "";

	if (!slots || !slots.length) {
		container.innerHTML =
			`<span class="text-muted">No slots available for selected date.</span>`;
		return;
	}

	let html = "";

	slots.forEach(slot => {
		html += `
            <button class="btn ${slot.booked ? 'btn-secondary' : 'btn-outline-primary'}"
                    ${slot.booked ? 'disabled' : ''}
                    onclick="selectSlot('${slot.time}', this)">
                ${slot.time}
            </button>
        `;
	});

	container.innerHTML = html;
}

function selectSlot(time, button) {
	selectedSlot = time;
	document.getElementById("selectedTime").value = time;

	document.querySelectorAll("#slotContainer button").forEach(btn => {
		btn.classList.remove("slot-btn-selected");
	});

	button.classList.add("slot-btn-selected");
}

async function bookAppointment() {
	const payloadData = buildAppointmentPayload();

	if (!payloadData) {
		return;
	}

	if (consultationType === "OFFLINE") {
		await bookOfflineAppointment(payloadData);
		return;
	}

	if (consultationType === "ONLINE") {
		await bookOnlineAppointmentWithPayment(payloadData);
	}
}

function buildAppointmentPayload() {
	const date = document.getElementById("appointmentDate").value;

	if (!selectedSlot) {
		showMsg("Please select available slot");
		return null;
	}

	const patientName = document.getElementById("patientName").value.trim();
	const patientMobile = document.getElementById("patientMobile").value.trim();
	const symptoms = document.getElementById("symptoms").value.trim();

	if (!patientName || !patientMobile || !symptoms) {
		showMsg("Patient name, mobile and symptoms are required");
		return null;
	}

	if (selectedType === "DOCTOR") {

		if (!selectedDoctor) {
			showMsg("Please select doctor");
			return null;
		}

		return {
			url: `${API_BASE}/doctor/appointments/book`,
			paymentUrl: `${API_BASE}/doctor/payments/video-appointment`,
			payload: {
				bookingFor: "DOCTOR",
				consultationType: consultationType,
				doctorAuthUserId: getAuthUserId(selectedDoctor),
				patientName: patientName,
				patientMobile: patientMobile,
				appointmentDate: date,
				appointmentTime: selectedSlot,
				symptoms: symptoms
			}
		};
	}

	if (selectedType === "HOSPITAL") {

		if (!selectedHospital || !selectedHospitalDoctor) {
			showMsg("Please select hospital doctor");
			return null;
		}

		return {
			url: `${API_BASE}/hospital/appointments/book`,
			paymentUrl: `${API_BASE}/hospital/payments/video-appointment`,
			payload: {
				bookingFor: "HOSPITAL",
				consultationType: consultationType,
				hospitalAuthUserId: getAuthUserId(selectedHospital),
				hospitalDoctorId: selectedHospitalDoctor.id,
				patientName: patientName,
				patientMobile: patientMobile,
				appointmentDate: date,
				appointmentTime: selectedSlot,
				symptoms: symptoms
			}
		};
	}

	showMsg("Invalid booking type");
	return null;
}

async function bookOfflineAppointment(payloadData) {
	const token = localStorage.getItem("token");

	setButtonLoading("bookAppointmentBtn", "Booking...", true);

	try {
		const response = await fetch(payloadData.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payloadData.payload)
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to book appointment");
			return;
		}

		showMsg("Offline appointment booked successfully. Status: PENDING", "success");

		setTimeout(() => {
			window.location.href = "/appointments/my";
		}, 1500);

	} catch (error) {
		console.error(error);
		showMsg("Appointment service not reachable.");
	} finally {
		setButtonLoading("bookAppointmentBtn", "Book Offline Appointment", false);
	}
}

async function bookOnlineAppointmentWithPayment(payloadData) {
	const token = localStorage.getItem("token");

	setButtonLoading("bookAppointmentBtn", "Starting Payment...", true);

	try {
		const response = await fetch(payloadData.paymentUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + token
			},
			body: JSON.stringify(payloadData.payload)
		});

		const result = await response.json();

		if (!response.ok) {
			showMsg(result.message || "Unable to start payment");
			return;
		}

		if (!result.redirectUrl) {
			showMsg("Payment redirect URL not received");
			return;
		}

		window.location.href = result.redirectUrl;

	} catch (error) {
		console.error(error);
		showMsg("Payment service not reachable.");
	} finally {
		setButtonLoading("bookAppointmentBtn", "Pay & Book Video Consultation", false);
	}
}

function getAuthUserId(obj) {
	if (!obj) {
		return null;
	}

	const id =
		obj.authUserId ||
		obj.hospitalAuthUserId ||
		obj.doctorAuthUserId ||
		obj.userId ||
		obj.id;

	const numberId = Number(id);

	return Number.isNaN(numberId) ? null : numberId;
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

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML =
		`<div class="alert alert-${type}">${message}</div>`;

	setTimeout(() => {
		document.getElementById("msg").innerHTML = "";
	}, 4000);
}

function safe(value) {
	return value === null || value === undefined || value === "" ? "-" : value;
}