let doctorAppointmentsOnline = [];

document.addEventListener("DOMContentLoaded", function () {
    requireDoctorRole();
    loadDoctorAppointments();
});

function requireDoctorRole() {
    if (localStorage.getItem("role") !== "DOCTOR") {
        alert("Access denied. Only DOCTOR can access this page.");
        window.location.href = "/dashboard";
    }
}

async function loadDoctorAppointments() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/doctor/appointments/doctor`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        let result = [];

        try {
            result = await response.json();
        } catch (e) {
            result = [];
        }

        if (!response.ok) {
            showMsg(result.message || "Unable to load appointments");
            return;
        }

        doctorAppointmentsOnline = result;
        renderAppointments(doctorAppointmentsOnline);

    } catch (e) {
        console.error("Doctor appointments load error:", e);
        showMsg("Doctor service not reachable.");
    }
}

function filterAppointments() {
    const status = document.getElementById("statusFilter").value;

    if (!status) {
        renderAppointments(doctorAppointmentsOnline);
        return;
    }

    renderAppointments(doctorAppointmentsOnline.filter(a => a.status === status));
}

function renderAppointments(list) {
    const container = document.getElementById("appointmentList");

    if (!container) {
        return;
    }

    if (!list || !list.length) {
        container.innerHTML = `<div class="text-center text-muted py-5">No appointments found</div>`;
        return;
    }

    let html = "";

    list.forEach(a => {
        html += `
            <div class="order-card mb-3">
                <div class="d-flex justify-content-between flex-wrap gap-3">

                    <div>
                        <h5 class="fw-bold text-primary">${safe(a.patientName)}</h5>

                        <div class="text-muted small">
                            Mobile: ${safe(a.patientMobile)}
                        </div>

                        <div class="text-muted small">
                            Date: ${formatDate(a.appointmentDate)} | Time: ${safe(a.appointmentTime)}
                        </div>

                        <div class="text-muted small mt-1">
                            Consultation Type: ${consultationBadge(a.consultationType)}
                        </div>

                        ${a.paymentStatus ? `
                            <div class="text-muted small mt-1">
                                Payment: ${paymentBadge(a.paymentStatus)}
                            </div>
                        ` : ""}

                        <div class="mt-2">
                            <strong>Symptoms:</strong> ${safe(a.symptoms || a.purpose)}
                        </div>

                        ${meetingInfo(a)}
                    </div>

                    <div class="text-end">
                        ${statusBadge(a.status)}
                        <div class="mt-2">
                            ${actionButtons(a)}
                        </div>
                    </div>

                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function meetingInfo(a) {
    if (a.consultationType !== "ONLINE") {
        return "";
    }

    if (a.status === "PAYMENT_PENDING") {
        return `
            <div class="mt-2 text-warning small">
                Payment pending. Meeting link will be generated after payment success.
            </div>
        `;
    }

    if (a.status === "PAYMENT_FAILED") {
        return `
            <div class="mt-2 text-danger small">
                Payment failed. Meeting link is not available.
            </div>
        `;
    }

    if (a.status === "CONFIRMED" && isValidMeetingUrl(a.meetingUrl)) {
        return `
            <div class="mt-2 text-success small">
                <strong>Meeting:</strong> Link generated. Click Join Meeting to start consultation.
            </div>
        `;
    }

    if (a.status === "CONFIRMED" && !isValidMeetingUrl(a.meetingUrl)) {
        return `
            <div class="mt-2 text-muted small">
                Meeting link is not generated yet. Please refresh after payment verification.
            </div>
        `;
    }

    if (a.status === "IN_CONSULTATION") {
        return `
            <div class="mt-2 text-primary small">
                Consultation is in progress.
            </div>
        `;
    }

    if (a.status === "COMPLETED") {
        return `
            <div class="mt-2 text-success small">
                Consultation completed.
            </div>
        `;
    }

    if (a.status === "CANCELLED") {
        return `
            <div class="mt-2 text-muted small">
                Appointment cancelled.
            </div>
        `;
    }

    return "";
}

function actionButtons(a) {
    if (a.status === "PAYMENT_PENDING") {
        return `<div class="text-warning small">Payment pending</div>`;
    }

    if (a.status === "PAYMENT_FAILED") {
        return `<div class="text-danger small">Payment failed</div>`;
    }

    if (a.status === "PENDING" || a.status === "REQUESTED") {
        return `
            <button class="btn btn-sm btn-success me-1"
                    onclick="updateStatus(${a.id}, 'CONFIRMED')">
                Confirm
            </button>

            <button class="btn btn-sm btn-danger"
                    onclick="updateStatus(${a.id}, 'REJECTED')">
                Reject
            </button>
        `;
    }

    if (a.status === "CONFIRMED") {
        if (a.consultationType === "ONLINE") {
            if (isValidMeetingUrl(a.meetingUrl)) {
                return `
                    <button class="btn btn-sm btn-success me-1"
                            onclick="startConsultation(${a.id}, '${escapeJs(a.meetingUrl)}')">
                        Join Meeting
                    </button>

                    <button class="btn btn-sm btn-outline-danger"
                            onclick="updateStatus(${a.id}, 'CANCELLED')">
                        Cancel
                    </button>
                `;
            }

            return `<div class="text-muted small">Waiting for valid meeting link</div>`;
        }

        return `
            <button class="btn btn-sm btn-medi me-1"
                    style="width:auto;"
                    onclick="updateStatus(${a.id}, 'COMPLETED')">
                Mark Completed
            </button>

            <button class="btn btn-sm btn-outline-danger"
                    onclick="updateStatus(${a.id}, 'CANCELLED')">
                Cancel
            </button>
        `;
    }

    if (a.status === "IN_CONSULTATION") {
        if (a.consultationType === "ONLINE" && isValidMeetingUrl(a.meetingUrl)) {
            return `
                <button class="btn btn-sm btn-primary me-1"
                        onclick="openMeeting('${escapeJs(a.meetingUrl)}')">
                    Rejoin Meeting
                </button>

                <button class="btn btn-sm btn-medi"
                        style="width:auto;"
                        onclick="updateStatus(${a.id}, 'COMPLETED')">
                    Mark Completed
                </button>
            `;
        }

        return `
            <button class="btn btn-sm btn-medi"
                    style="width:auto;"
                    onclick="updateStatus(${a.id}, 'COMPLETED')">
                Mark Completed
            </button>
        `;
    }

    return "";
}

async function startConsultation(id, meetingUrl) {
    if (!isValidMeetingUrl(meetingUrl)) {
        showMsg("Meeting link is not generated yet.");
        return;
    }

    const meetingWindow = window.open("about:blank", "_blank");
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/doctor/appointments/${id}/status?status=IN_CONSULTATION`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        let result = {};

        try {
            result = await response.json();
        } catch (e) {
            result = {};
        }

        if (!response.ok) {
            if (meetingWindow) {
                meetingWindow.close();
            }

            showMsg(result.message || "Unable to start consultation");
            return;
        }

        if (meetingWindow) {
            meetingWindow.location.href = meetingUrl;
        } else {
            window.location.href = meetingUrl;
        }

        loadDoctorAppointments();

    } catch (e) {
        console.error("Start consultation error:", e);

        if (meetingWindow) {
            meetingWindow.close();
        }

        showMsg("Doctor service not reachable.");
    }
}

async function updateStatus(id, status) {
    if (!confirm("Update appointment status to " + status + "?")) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/doctor/appointments/${id}/status?status=${status}`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        let result = {};

        try {
            result = await response.json();
        } catch (e) {
            result = {};
        }

        if (!response.ok) {
            showMsg(result.message || "Unable to update appointment");
            return;
        }

        showMsg("Appointment updated successfully", "success");
        loadDoctorAppointments();

    } catch (e) {
        console.error("Update appointment status error:", e);
        showMsg("Doctor service not reachable.");
    }
}

function openMeeting(url) {
    if (!isValidMeetingUrl(url)) {
        showMsg("Meeting link is not generated yet.");
        return;
    }

    window.open(url, "_blank");
}

function isValidMeetingUrl(url) {
    return url
        && typeof url === "string"
        && (url.startsWith("http://") || url.startsWith("https://"));
}

function consultationBadge(type) {
    if (type === "ONLINE") {
        return `<span class="badge bg-success">ONLINE VIDEO</span>`;
    }

    if (type === "OFFLINE") {
        return `<span class="badge bg-secondary">OFFLINE VISIT</span>`;
    }

    return `<span class="badge bg-light text-dark">-</span>`;
}

function paymentBadge(paymentStatus) {
    if (paymentStatus === "SUCCESS") {
        return `<span class="badge bg-success">SUCCESS</span>`;
    }

    if (paymentStatus === "INITIATED" || paymentStatus === "PENDING") {
        return `<span class="badge bg-warning text-dark">PENDING</span>`;
    }

    if (paymentStatus === "FAILED") {
        return `<span class="badge bg-danger">FAILED</span>`;
    }

    return `<span class="badge bg-secondary">${safe(paymentStatus)}</span>`;
}

function statusBadge(status) {
    if (status === "PAYMENT_PENDING") {
        return `<span class="badge bg-warning text-dark">PAYMENT PENDING</span>`;
    }

    if (status === "PAYMENT_FAILED") {
        return `<span class="badge bg-danger">PAYMENT FAILED</span>`;
    }

    if (status === "PENDING") {
        return `<span class="badge bg-warning text-dark">PENDING</span>`;
    }

    if (status === "REQUESTED") {
        return `<span class="badge bg-warning text-dark">REQUESTED</span>`;
    }

    if (status === "CONFIRMED") {
        return `<span class="badge bg-info text-dark">CONFIRMED</span>`;
    }

    if (status === "IN_CONSULTATION") {
        return `<span class="badge bg-primary">IN CONSULTATION</span>`;
    }

    if (status === "REJECTED") {
        return `<span class="badge bg-danger">REJECTED</span>`;
    }

    if (status === "COMPLETED") {
        return `<span class="badge bg-success">COMPLETED</span>`;
    }

    if (status === "CANCELLED") {
        return `<span class="badge bg-secondary">CANCELLED</span>`;
    }

    return `<span class="badge bg-secondary">${safe(status)}</span>`;
}

function showMsg(message, type = "danger") {
    const msgBox = document.getElementById("msg");

    if (!msgBox) {
        alert(message);
        return;
    }

    msgBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDate(value) {
    return value ? new Date(value).toLocaleDateString() : "-";
}

function safe(value) {
    return value === null || value === undefined || value === "" ? "-" : value;
}

function escapeJs(value) {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;");
}