let selectedSlot = null;

document.addEventListener("DOMContentLoaded", function () {
    switchBookingType();
});

function switchBookingType() {
    const type = document.getElementById("bookingType").value;

    document.querySelectorAll(".doctor-field").forEach(el => {
        el.style.display = type === "DOCTOR" ? "block" : "none";
    });

    document.querySelectorAll(".hospital-field").forEach(el => {
        el.style.display = type === "HOSPITAL" ? "block" : "none";
    });

    selectedSlot = null;
    document.getElementById("selectedTime").value = "";
    document.getElementById("slotContainer").innerHTML =
        `<span class="text-muted">Select date and click View Available Slots.</span>`;
}

async function loadSlots() {
    const type = document.getElementById("bookingType").value;
    const date = document.getElementById("appointmentDate").value;

    if (!date) {
        showMsg("Please select appointment date");
        return;
    }

    const token = localStorage.getItem("token");

    let url = "";

    if (type === "DOCTOR") {
        const doctorId = document.getElementById("doctorAuthUserId").value;

        if (!doctorId) {
            showMsg("Doctor Auth User ID is required");
            return;
        }

        url = `${API_BASE}/doctor/available-slots/${doctorId}?date=${date}`;
    }

    if (type === "HOSPITAL") {
        const hospitalId = document.getElementById("hospitalAuthUserId").value;
        const doctorName = document.getElementById("hospitalDoctorName").value.trim();

        if (!hospitalId || !doctorName) {
            showMsg("Hospital ID and doctor name are required");
            return;
        }

        url = `${API_BASE}/hospital/available-slots?hospitalId=${hospitalId}&doctorName=${encodeURIComponent(doctorName)}&date=${date}`;
    }

    try {
        const response = await fetch(url, {
            headers: {"Authorization": "Bearer " + token}
        });

        const result = await response.json();

        if (!response.ok) {
            showMsg(result.message || "Unable to load slots");
            return;
        }

        renderSlots(result);

    } catch (e) {
        showMsg("Appointment service not reachable.");
    }
}

function renderSlots(slots) {
    const container = document.getElementById("slotContainer");

    selectedSlot = null;
    document.getElementById("selectedTime").value = "";

    if (!slots || !slots.length) {
        container.innerHTML = `<span class="text-muted">No slots available.</span>`;
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

function selectSlot(time, btn) {
    selectedSlot = time;
    document.getElementById("selectedTime").value = time;

    document.querySelectorAll("#slotContainer button").forEach(b => {
        b.classList.remove("btn-primary");
        b.classList.add("btn-outline-primary");
    });

    btn.classList.remove("btn-outline-primary");
    btn.classList.add("btn-primary");
}

async function bookAppointment() {
    const type = document.getElementById("bookingType").value;
    const date = document.getElementById("appointmentDate").value;

    if (!selectedSlot) {
        showMsg("Please select a slot");
        return;
    }

    const common = {
        patientName: document.getElementById("patientName").value.trim(),
        patientMobile: document.getElementById("patientMobile").value.trim(),
        appointmentDate: date,
        appointmentTime: selectedSlot,
        symptoms: document.getElementById("symptoms").value.trim()
    };

    if (!common.patientName || !common.patientMobile || !common.symptoms) {
        showMsg("Patient name, mobile and symptoms are required");
        return;
    }

    let url = "";
    let payload = {};

    if (type === "DOCTOR") {
        payload = {
            ...common,
            doctorAuthUserId: Number(document.getElementById("doctorAuthUserId").value)
        };

        url = `${API_BASE}/doctor/appointments/book`;
    }

    if (type === "HOSPITAL") {
        payload = {
            ...common,
            hospitalAuthUserId: Number(document.getElementById("hospitalAuthUserId").value),
            doctorName: document.getElementById("hospitalDoctorName").value.trim(),
            department: document.getElementById("department").value.trim()
        };

        url = `${API_BASE}/hospital/appointments/book`;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            showMsg(result.message || "Unable to book appointment");
            return;
        }

        showMsg("Appointment booked successfully. Status: PENDING", "success");

        setTimeout(() => {
            window.location.href = "/appointments/my";
        }, 1500);

    } catch (e) {
        showMsg("Appointment service not reachable.");
    }
}

function showMsg(message, type = "danger") {
    document.getElementById("msg").innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}