"use strict";

let patientProfile = null;

let doctors = [];

let selectedDoctor = null;

let selectedSlot = null;

let isBooking = false;

document.addEventListener("DOMContentLoaded", async function() {

	const allowed =
		getNormalizedLoginRole() === "PATIENT";

	if (!allowed) {

		alert(
			"Only PATIENT can access this page."
		);

		window.location.href = "/dashboard";

		return;
	}

	const tenantId =
		localStorage.getItem("tenantId");

	if (!tenantId) {

		alert(
			"Please select SaaS workspace first."
		);

		window.location.href =
			"/saas/workspaces";

		return;
	}

	setText(
		"tenantNameText",
		localStorage.getItem("tenantName")
		|| "Your Workspace"
	);

	setAppointmentDateLimits();

	await loadPatientProfile();

	await loadDoctors();

	handleConsultationTypeChange();
});

/* =========================================================
   PATIENT PROFILE
========================================================= */

async function loadPatientProfile() {

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	try {

		const response = await fetch(
			`${API_BASE}/saas/patients/me?tenantId=${encodeURIComponent(tenantId)}`,
			{
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

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load patient profile."
				)
			);

			return;
		}

		patientProfile = result;

		setText(
			"patientNameText",
			patientProfile.patientName
			|| "-"
		);

		setText(
			"patientEmailText",
			patientProfile.email
			|| "-"
		);

		setText(
			"patientMobileText",
			patientProfile.mobile
			|| "-"
		);

	} catch (error) {

		console.error(
			"Patient profile error:",
			error
		);

		showMsg(
			"Unable to load your patient profile."
		);
	}
}

/* =========================================================
   DOCTORS
========================================================= */

async function loadDoctors() {

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const container =
		document.getElementById(
			"doctorContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary"></div>
            <div class="mt-3 text-muted">
                Loading doctors...
            </div>
        </div>
    `;

	try {

		const response = await fetch(
			`${API_BASE}/saas/staff/doctors/for-appointments?tenantId=${encodeURIComponent(tenantId)}`,
			{
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

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load doctors."
				)
			);

			container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        Unable to load doctors.
                    </div>
                </div>
            `;

			return;
		}

		doctors =
			Array.isArray(result)
				? result
				: [];

		renderDoctors();

	} catch (error) {

		console.error(
			"Doctor loading error:",
			error
		);

		container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    SaaS doctor service is not reachable.
                </div>
            </div>
        `;
	}
}

function renderDoctors() {

	const container =
		document.getElementById(
			"doctorContainer"
		);

	const keyword =
		String(
			document.getElementById(
				"doctorSearch"
			)?.value || ""
		)
			.trim()
			.toLowerCase();

	const filtered =
		doctors.filter(
			function(doctor) {

				const text = [
					doctor.staffName,
					doctor.department,
					doctor.specialization
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return !keyword ||
					text.includes(keyword);
			}
		);

	if (!filtered.length) {

		container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    No doctors found in your workspace.
                </div>
            </div>
        `;

		return;
	}

	container.innerHTML =
		filtered.map(
			function(doctor) {

				const doctorId =
					Number(doctor.id);

				const selected =
					selectedDoctor &&
					Number(selectedDoctor.id)
					=== doctorId;

				return `
                    <div class="col-xl-4 col-md-6">

                        <div
                            class="provider-card ${selected
						? "selected"
						: ""
					}">

                            <div class="provider-icon">

                                <i class="bi bi-person-badge-fill"></i>

                            </div>

                            <h5 class="fw-bold text-primary">

                                ${safe(
						doctor.staffName
						|| "Doctor"
					)}

                            </h5>

                            <div class="text-muted small">

                                ${safe(
						doctor.department
					)}

                            </div>

                            <div class="text-muted small">

                                ${safe(
						doctor.specialization
					)}

                            </div>

                            ${doctor.consultationFee != null
						? `
                                    <div class="mt-2">
                                        <span class="badge bg-info text-dark">
                                            Offline Fee:
                                            ₹${formatMoney(
							doctor.consultationFee
						)}
                                        </span>
                                    </div>
                                    `
						: ""
					}

                            ${doctor.onlineConsultationFee != null
						? `
                                    <div class="mt-2">
                                        <span class="badge bg-success">
                                            Online Fee:
                                            ₹${formatMoney(
							doctor.onlineConsultationFee
						)}
                                        </span>
                                    </div>
                                    `
						: ""
					}

                            <button
                                type="button"
                                class="btn btn-medi w-100 mt-3"
                                onclick="selectDoctor(${doctorId})">

                                ${selected
						? "Doctor Selected"
						: "Select Doctor"
					}

                            </button>

                        </div>

                    </div>
                `;
			}
		)
			.join("");
}

function filterDoctors() {
	renderDoctors();
}

function selectDoctor(doctorId) {

	selectedDoctor =
		doctors.find(
			doctor =>
				Number(doctor.id)
				=== Number(doctorId)
		);

	if (!selectedDoctor) {

		showMsg(
			"Selected doctor not found."
		);

		return;
	}

	selectedSlot = null;

	setValue(
		"selectedTime",
		""
	);

	renderDoctors();

	loadSlots();
}

/* =========================================================
   CONSULTATION TYPE
========================================================= */

function handleConsultationTypeChange() {

	const type =
		getValue(
			"consultationType"
		);

	const paymentInfo =
		document.getElementById(
			"onlinePaymentInfo"
		);

	const button =
		document.getElementById(
			"bookAppointmentBtn"
		);

	if (type === "ONLINE") {

		if (paymentInfo) {

			paymentInfo.style.display =
				"block";
		}

		if (button) {

			button.innerHTML = `
                <i class="bi bi-credit-card-fill me-1"></i>
                Pay & Book Video Consultation
            `;
		}

	} else {

		if (paymentInfo) {

			paymentInfo.style.display =
				"none";
		}

		if (button) {

			button.innerHTML = `
                <i class="bi bi-calendar-check-fill me-1"></i>
                Book Offline Appointment
            `;
		}
	}

	selectedSlot = null;

	setValue(
		"selectedTime",
		""
	);

	resetSlots();
}

/* =========================================================
   DATE
========================================================= */

function setAppointmentDateLimits() {

	const input =
		document.getElementById(
			"appointmentDate"
		);

	if (!input) {
		return;
	}

	input.min =
		getLocalDateText(
			new Date()
		);
}

/* =========================================================
   SLOTS
========================================================= */

async function loadSlots() {

	if (!selectedDoctor) {

		resetSlots();

		return;
	}

	const date =
		getValue(
			"appointmentDate"
		);

	if (!date) {

		resetSlots();

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const doctorAuthUserId =
		selectedDoctor.authUserId;

	if (!doctorAuthUserId) {

		showMsg(
			"Selected doctor login ID is missing."
		);

		return;
	}

	const container =
		document.getElementById(
			"slotContainer"
		);

	container.innerHTML = `
        <div class="w-100 text-muted">
            Loading available slots...
        </div>
    `;

	try {

		const query =
			new URLSearchParams({
				tenantId:
					tenantId,
				doctorAuthUserId:
					doctorAuthUserId,
				date:
					date
			});

		const response =
			await fetch(
				`${API_BASE}/saas/doctor-availability/slots?${query}`,
				{
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

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load available slots."
				)
			);

			resetSlots();

			return;
		}

		renderSlots(
			Array.isArray(result)
				? result
				: []
		);

	} catch (error) {

		console.error(
			"Slots error:",
			error
		);

		showMsg(
			"Unable to load doctor availability."
		);

		resetSlots();
	}
}

function renderSlots(slots) {

	const container =
		document.getElementById(
			"slotContainer"
		);

	selectedSlot = null;

	setValue(
		"selectedTime",
		""
	);

	if (!slots.length) {

		container.innerHTML = `
            <div class="text-muted">
                No available slots for this date.
            </div>
        `;

		return;
	}

	container.innerHTML =
		slots.map(
			function(slot) {

				const time =
					normalizeTime(
						slot.startTime
						|| slot.time
					);

				const booked =
					slot.booked === true ||
					slot.available === false;

				return `
                    <button
                        type="button"
                        class="btn ${booked
						? "btn-secondary"
						: "btn-outline-primary"
					} slot-button"
                        ${booked
						? "disabled"
						: ""
					}
                        onclick="selectSlot('${time}', this)">

                        ${slot.label
					|| formatTime(time)
					}

                        ${booked
						? " - Booked"
						: ""
					}

                    </button>
                `;
			}
		)
			.join("");
}

function selectSlot(
	time,
	button
) {

	selectedSlot =
		normalizeTime(time);

	setValue(
		"selectedTime",
		formatTime(selectedSlot)
	);

	document
		.querySelectorAll(
			"#slotContainer .slot-button"
		)
		.forEach(
			function(element) {

				element.classList.remove(
					"selected"
				);
			}
		);

	button.classList.add(
		"selected"
	);
}

function resetSlots() {

	const container =
		document.getElementById(
			"slotContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
        <div class="text-muted">
            Select doctor and date first.
        </div>
    `;
}

/* =========================================================
   BOOK
========================================================= */

async function bookAppointment() {

	if (isBooking) {
		return;
	}

	if (!patientProfile) {

		showMsg(
			"Patient profile is not loaded yet."
		);

		return;
	}

	if (!selectedDoctor) {

		showMsg(
			"Please select doctor."
		);

		return;
	}

	const date =
		getValue(
			"appointmentDate"
		);

	if (!date) {

		showMsg(
			"Please select appointment date."
		);

		return;
	}

	if (!selectedSlot) {

		showMsg(
			"Please select available slot."
		);

		return;
	}

	const symptoms =
		getValue(
			"symptoms"
		);

	if (!symptoms) {

		showMsg(
			"Please enter symptoms."
		);

		return;
	}

	const consultationType =
		getValue(
			"consultationType"
		);

	/*
	 * SaaS appointmentType:
	 *
	 * OFFLINE -> OPD
	 * ONLINE  -> ONLINE
	 */

	const appointmentType =
		consultationType === "ONLINE"
			? "ONLINE"
			: "OPD";

	const tenantId =
		localStorage.getItem("tenantId");

	if (!tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);
		return;
	}

	const payload = {

		tenantId:
			Number(tenantId),

		doctorStaffId:
			Number(selectedDoctor.id),

		appointmentType:
			appointmentType,

		appointmentDate:
			date,

		appointmentTime:
			selectedSlot,

		symptoms:
			symptoms
	};

	if (consultationType === "ONLINE") {

		await startOnlinePayment(
			payload
		);

	} else {

		await createOfflineAppointment(
			payload
		);
	}
}

/* =========================================================
   OFFLINE
========================================================= */

async function createOfflineAppointment(
	payload
) {

	const token =
		localStorage.getItem("token");

	setBookingLoading(
		"Booking..."
	);

	try {

		const response =
			await fetch(
				`${API_BASE}/saas/appointments`,
				{
					method: "POST",

					headers: {
						"Authorization":
							"Bearer " + token,

						"Content-Type":
							"application/json",

						"Accept":
							"application/json"
					},

					body:
						JSON.stringify(
							payload
						)
				}
			);

		const result =
			await safeJson(response);

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to book appointment."
				)
			);

			return;
		}

		showMsg(
			"Offline appointment booked successfully. Doctor will review your request.",
			"success"
		);

		setTimeout(
			function() {

				window.location.href =
					"/saas/patient/appointments";

			},
			1200
		);

	} catch (error) {

		console.error(
			"Offline booking error:",
			error
		);

		showMsg(
			"SaaS appointment service is not reachable."
		);

	} finally {

		restoreBookingButton();
	}
}

/* =========================================================
   ONLINE PAYMENT
========================================================= */

async function startOnlinePayment(
	payload
) {

	const token =
		localStorage.getItem("token");

	setBookingLoading(
		"Starting Payment..."
	);

	try {

		const response =
			await fetch(
				`${API_BASE}/saas/appointments/online-payment`,
				{
					method: "POST",

					headers: {
						"Authorization":
							"Bearer " + token,

						"Content-Type":
							"application/json",

						"Accept":
							"application/json"
					},

					body:
						JSON.stringify(
							payload
						)
				}
			);

		const result =
			await safeJson(response);

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to start payment."
				)
			);

			return;
		}

		if (!result.redirectUrl) {

			showMsg(
				"Payment redirect URL was not received."
			);

			return;
		}

		window.location.href =
			result.redirectUrl;

	} catch (error) {

		console.error(
			"Online payment error:",
			error
		);

		showMsg(
			"Payment service is not reachable."
		);

	} finally {

		restoreBookingButton();
	}
}

/* =========================================================
   HELPERS
========================================================= */

function setBookingLoading(
	text
) {

	const button =
		document.getElementById(
			"bookAppointmentBtn"
		);

	if (!button) {
		return;
	}

	if (!button.dataset.originalHtml) {

		button.dataset.originalHtml =
			button.innerHTML;
	}

	button.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        ${escapeHtml(text)}
    `;

	button.disabled = true;
}

function restoreBookingButton() {

	const button =
		document.getElementById(
			"bookAppointmentBtn"
		);

	if (!button) {
		return;
	}

	button.innerHTML =
		button.dataset.originalHtml
		|| "Book Appointment";

	button.disabled = false;
}

function getNormalizedLoginRole() {

	return String(
		localStorage.getItem("role")
		|| ""
	)
		.trim()
		.toUpperCase()
		.replace(/^ROLE_/, "");
}

function getValue(id) {

	const element =
		document.getElementById(id);

	return element
		? String(
			element.value || ""
		).trim()
		: "";
}

function setValue(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.value =
			value == null
				? ""
				: String(value);
	}
}

function setText(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.textContent =
			value ?? "";
	}
}

async function safeJson(
	response
) {

	try {

		const text =
			await response.text();

		if (!text.trim()) {
			return {};
		}

		return JSON.parse(text);

	} catch (error) {

		return {};
	}
}

function getApiErrorMessage(
	data,
	fallback
) {

	if (!data) {
		return fallback;
	}

	if (typeof data === "string") {
		return data;
	}

	return data.message
		|| data.error
		|| fallback;
}

function showMsg(
	message,
	type = "danger"
) {

	const msg =
		document.getElementById(
			"msg"
		);

	if (!msg) {

		alert(message);

		return;
	}

	msg.innerHTML = `
        <div class="alert alert-${type}">
            ${escapeHtml(message)}
        </div>
    `;

	window.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}

function normalizeTime(
	value
) {

	if (!value) {
		return "";
	}

	const parts =
		String(value).split(":");

	return (
		String(
			parts[0] || "00"
		).padStart(2, "0")
		+ ":" +
		String(
			parts[1] || "00"
		).padStart(2, "0")
	);
}

function formatTime(
	value
) {

	const normalized =
		normalizeTime(value);

	if (!normalized) {
		return "-";
	}

	const parts =
		normalized.split(":");

	let hour =
		Number(parts[0]);

	const minute =
		parts[1] || "00";

	const period =
		hour >= 12
			? "PM"
			: "AM";

	hour =
		hour % 12 || 12;

	return `${String(hour).padStart(2, "0")}:${minute} ${period}`;
}

function formatMoney(
	value
) {

	const amount =
		Number(value);

	return Number.isFinite(amount)
		? amount.toFixed(2)
		: "0.00";
}

function getLocalDateText(
	date
) {

	return [
		date.getFullYear(),
		String(
			date.getMonth() + 1
		).padStart(2, "0"),
		String(
			date.getDate()
		).padStart(2, "0")
	].join("-");
}

function safe(value) {

	return value == null ||
		value === ""
		? "-"
		: escapeHtml(value);
}

function escapeHtml(
	value
) {

	return String(
		value ?? ""
	)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}