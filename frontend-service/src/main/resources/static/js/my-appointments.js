let currentType = "DOCTOR";
let myDoctorAppointments = [];
let myHospitalAppointments = [];

document.addEventListener("DOMContentLoaded", function () {
    loadMyAppointments();
});

function setType(type) {
    currentType = type;

    document.getElementById("listTitle").innerText =
        type === "DOCTOR" ? "Doctor Appointments" : "Hospital Appointments";

    renderAppointments();
}

async function loadMyAppointments() {
    const token = localStorage.getItem("token");

    try {
        const [doctorRes, hospitalRes] = await Promise.all([
            fetch(`${API_BASE}/doctor/appointments/patient`, {
                headers: {"Authorization": "Bearer " + token}
            }),
            fetch(`${API_BASE}/hospital/appointments/patient`, {
                headers: {"Authorization": "Bearer " + token}
            })
        ]);

        myDoctorAppointments = doctorRes.ok ? await doctorRes.json() : [];
        myHospitalAppointments = hospitalRes.ok ? await hospitalRes.json() : [];

        renderAppointments();

    } catch (e) {
        showMsg("Appointment services not reachable.");
    }
}

function renderAppointments() {
    const container = document.getElementById("appointmentList");
    const list = currentType === "DOCTOR" ? myDoctorAppointments : myHospitalAppointments;

    if (!list.length) {
        container.innerHTML = `<div class="text-center text-muted py-5">No appointments found</div>`;
        return;
    }

    let html = "";

    list.forEach(a => {
        html += `
            <div class="order-card mb-3">
                <div class="d-flex justify-content-between flex-wrap gap-3">
                    <div>
                        <h5 class="fw-bold text-primary">
                            ${currentType === "DOCTOR" ? "Doctor ID: " + safe(a.doctorAuthUserId) : safe(a.doctorName)}
                        </h5>

                        ${currentType === "HOSPITAL"
                            ? `<div class="text-muted small">Hospital ID: ${safe(a.hospitalAuthUserId)} | ${safe(a.department)}</div>`
                            : ""
                        }

                        <div class="text-muted small">
                            Date: ${formatDate(a.appointmentDate)} | Time: ${safe(a.appointmentTime)}
                        </div>

                        <div class="mt-2"><strong>Symptoms:</strong> ${safe(a.symptoms)}</div>

                        ${a.meetingUrl ? `<div class="mt-2"><strong>Meeting:</strong> ${safe(a.meetingUrl)}</div>` : ""}
                    </div>

                    <div class="text-end">
                        ${statusBadge(a.status)}
                        ${cancelButton(a)}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function cancelButton(a) {
    if (a.status === "PENDING" || a.status === "CONFIRMED") {
        if (currentType === "DOCTOR") {
            return `
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-danger" onclick="cancelDoctorAppointment(${a.id})">Cancel</button>
                </div>
            `;
        }

        return `<button class="btn btn-sm btn-outline-danger" onclick="cancelHospitalAppointment(${a.id})">Cancel</button>`;
    }

    return "";
}

async function cancelDoctorAppointment(id) {
    if (!confirm("Cancel this appointment?")) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/doctor/appointments/${id}/cancel`, {
            method: "PUT",
            headers: {"Authorization": "Bearer " + token}
        });

        const result = await response.json();

        if (!response.ok) {
            showMsg(result.message || "Unable to cancel appointment");
            return;
        }

        showMsg("Appointment cancelled successfully", "success");
        loadMyAppointments();

    } catch (e) {
        showMsg("Doctor service not reachable.");
    }
}

async function cancelHospitalAppointment(id) {
    if (!confirm("Cancel this hospital appointment?")) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/hospital/appointments/${id}/cancel`, {
            method: "PUT",
            headers: {"Authorization": "Bearer " + token}
        });

        const result = await response.json();

        if (!response.ok) {
            showMsg(result.message || "Unable to cancel hospital appointment");
            return;
        }

        showMsg("Hospital appointment cancelled successfully", "success");
        loadMyAppointments();

    } catch (e) {
        showMsg("Hospital service not reachable.");
    }
}
function statusBadge(status) {
    if (status === "PENDING") return `<span class="badge bg-warning text-dark">PENDING</span>`;
    if (status === "CONFIRMED") return `<span class="badge bg-info text-dark">CONFIRMED</span>`;
    if (status === "REJECTED") return `<span class="badge bg-danger">REJECTED</span>`;
    if (status === "COMPLETED") return `<span class="badge bg-success">COMPLETED</span>`;
    if (status === "CANCELLED") return `<span class="badge bg-secondary">CANCELLED</span>`;
    return `<span class="badge bg-secondary">${safe(status)}</span>`;
}

function showMsg(message, type = "danger") {
    document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDate(value) {
    return value ? new Date(value).toLocaleDateString() : "-";
}

function safe(value) {
    return value === null || value === undefined || value === "" ? "-" : value;
}