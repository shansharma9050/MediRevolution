"use strict";

document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const role =
			getNormalizedLoginRole();

		if (role !== "PATIENT") {

			alert(
				"Only PATIENT can access this page."
			);

			window.location.href =
				"/dashboard";

			return;
		}

		const tenantId =
			localStorage.getItem(
				"tenantId"
			);

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
			localStorage.getItem(
				"tenantName"
			) || "Your Workspace"
		);

		await loadMyPatientAppointments();
	}
);

async function loadMyPatientAppointments() {

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const tbody =
		document.getElementById(
			"patientAppointmentsBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `
        <tr>
            <td colspan="7"
                class="text-center py-5">

                <div class="spinner-border text-primary"></div>

                <div class="mt-2">
                    Loading appointments...
                </div>

            </td>
        </tr>
    `;

	try {

		const response =
			await fetch(
				`${API_BASE}/saas/appointments/patient?tenantId=${encodeURIComponent(tenantId)}`,
				{
					method: "GET",

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

			const message =
				getApiErrorMessage(
					result,
					"Unable to load appointments."
				);

			showMsg(
				message
			);

			tbody.innerHTML = `
                <tr>
                    <td colspan="7"
                        class="text-center text-danger py-5">

                        ${escapeHtml(message)}

                    </td>
                </tr>
            `;

			return;
		}

		const appointments =
			Array.isArray(result)
				? result
				: [];

		renderPatientAppointments(
			appointments
		);

	} catch (error) {

		console.error(
			"Patient appointment history error:",
			error
		);

		tbody.innerHTML = `
            <tr>
                <td colspan="7"
                    class="text-center text-danger py-5">

                    SaaS appointment service is not reachable.

                </td>
            </tr>
        `;

		showMsg(
			"Unable to load your appointments."
		);
	}
}

function renderPatientAppointments(
	appointments
) {

	const tbody =
		document.getElementById(
			"patientAppointmentsBody"
		);

	if (!tbody) {
		return;
	}

	if (!appointments.length) {

		tbody.innerHTML = `
            <tr>

                <td colspan="7"
                    class="text-center py-5">

                    <i class="bi bi-calendar-x"
                       style="font-size:42px;">
                    </i>

                    <div class="mt-3 fw-bold text-primary">
                        No appointments found
                    </div>

                    <div class="text-muted">
                        You have not booked any appointment
                        in this workspace yet.
                    </div>

                </td>

            </tr>
        `;

		return;
	}

	tbody.innerHTML =
		appointments.map(
			function(appointment) {

				const meetingUrl =
					getSafeHttpUrl(
						appointment.meetingUrl
					);

				let meetingHtml = "-";

				if (
					appointment.status
					=== "CONFIRMED"
					&&
					appointment.appointmentType
					=== "ONLINE"
					&&
					meetingUrl
				) {

					meetingHtml = `
                        <a
                            href="${escapeAttribute(meetingUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-sm btn-success">

                            <i class="bi bi-camera-video-fill me-1"></i>
                            Join

                        </a>
                    `;
				}

				return `
                    <tr>

                        <td>
                            <strong>
                                ${formatDate(
					appointment.appointmentDate
				)}
                            </strong>

                            <div class="small text-muted">

                                ${safe(
					appointment.doctorName
				)}

                            </div>
                        </td>

                        <td>

                            <strong>
                                Dr. ${safe(
					appointment.doctorName
				)
					}
                            </strong>

                            <div class="small text-muted">

                                ${safe(
						appointment.department
					)}

                            </div>

                        </td>

                        <td>
                            ${formatTime(
						appointment.appointmentTime
					)}
                        </td>

                        <td>
                            ${appointment.appointmentType
						=== "ONLINE"

						? `
                                        <span class="badge bg-success">
                                            <i class="bi bi-camera-video-fill me-1"></i>
                                            ONLINE
                                        </span>
                                    `

						: `
                                        <span class="badge bg-secondary">
                                            <i class="bi bi-hospital-fill me-1"></i>
                                            OFFLINE
                                        </span>
                                    `
					}
                        </td>

                        <td>
                            ${paymentBadge(
						appointment.paymentStatus
					)}
                        </td>

                        <td>
                            ${statusBadge(
						appointment.status
					)}
                        </td>

                        <td>
                            ${meetingHtml}
                        </td>

                    </tr>
                `;
			}
		)
			.join("");
}

function paymentBadge(
	paymentStatus
) {

	const status =
		String(
			paymentStatus || ""
		).toUpperCase();

	if (
		status === "SUCCESS"
	) {

		return `
            <span class="badge bg-success">
                Paid
            </span>
        `;
	}

	if (
		status === "INITIATED" ||
		status === "PENDING"
	) {

		return `
            <span class="badge bg-warning text-dark">
                Payment Pending
            </span>
        `;
	}

	if (
		status === "FAILED"
	) {

		return `
            <span class="badge bg-danger">
                Payment Failed
            </span>
        `;
	}

	if (
		status === "NOT_REQUIRED"
	) {

		return `
            <span class="badge bg-secondary">
                Offline
            </span>
        `;
	}

	return `
        <span class="badge bg-secondary">
            -
        </span>
    `;
}

function statusBadge(
	status
) {

	const value =
		String(
			status || ""
		).toUpperCase();

	switch (value) {

		case "PAYMENT_PENDING":
			return `
                <span class="badge bg-warning text-dark">
                    PAYMENT PENDING
                </span>
            `;

		case "PAYMENT_FAILED":
			return `
                <span class="badge bg-danger">
                    PAYMENT FAILED
                </span>
            `;

		case "PENDING":
			return `
                <span class="badge bg-warning text-dark">
                    PENDING
                </span>
            `;

		case "CONFIRMED":
			return `
                <span class="badge bg-success">
                    CONFIRMED
                </span>
            `;

		case "IN_CONSULTATION":
			return `
                <span class="badge bg-primary">
                    IN CONSULTATION
                </span>
            `;

		case "COMPLETED":
			return `
                <span class="badge bg-info text-dark">
                    COMPLETED
                </span>
            `;

		case "REJECTED":
			return `
                <span class="badge bg-danger">
                    REJECTED
                </span>
            `;

		case "CANCELLED":
			return `
                <span class="badge bg-secondary">
                    CANCELLED
                </span>
            `;

		default:
			return `
                <span class="badge bg-secondary">
                    ${escapeHtml(value || "-")}
                </span>
            `;
	}
}

function formatDate(
	value
) {

	if (!value) {
		return "-";
	}

	const date =
		new Date(
			`${value}T00:00:00`
		);

	if (Number.isNaN(
		date.getTime()
	)) {

		return escapeHtml(
			value
		);
	}

	return date.toLocaleDateString(
		"en-IN",
		{
			day: "2-digit",
			month: "short",
			year: "numeric"
		}
	);
}

function formatTime(
	value
) {

	if (!value) {
		return "-";
	}

	const parts =
		String(value)
			.split(":");

	let hours =
		Number(parts[0]);

	const minutes =
		parts[1] || "00";

	if (
		!Number.isFinite(hours)
	) {

		return "-";
	}

	const period =
		hours >= 12
			? "PM"
			: "AM";

	hours =
		hours % 12 || 12;

	return `
        ${String(hours).padStart(2, "0")}
        :
        ${minutes}
        ${period}
    `;
}

function getSafeHttpUrl(
	value
) {

	if (!value) {
		return "";
	}

	try {

		const url =
			new URL(
				String(value),
				window.location.origin
			);

		if (
			url.protocol !== "http:" &&
			url.protocol !== "https:"
		) {

			return "";
		}

		return url.href;

	} catch (error) {

		return "";
	}
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
	message
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
        <div class="alert alert-danger">
            ${escapeHtml(message)}
        </div>
    `;
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

function safe(
	value
) {

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

function escapeAttribute(
	value
) {

	return escapeHtml(value);
}