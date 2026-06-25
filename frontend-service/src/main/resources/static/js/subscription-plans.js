let subscriptionPlans = [];

document.addEventListener("DOMContentLoaded", function () {
    requireSubscriptionRole();
    loadPlans();
});

function requireSubscriptionRole() {
    const role = localStorage.getItem("role");

    if (!["WHOLESALER", "DOCTOR", "HOSPITAL"].includes(role)) {
        alert("Subscription is available only for Wholesaler, Doctor and Hospital.");
        window.location.href = "/dashboard";
    }
}

async function loadPlans() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/billing/subscriptions/plans`, {
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
            showMsg(result.message || "Unable to load subscription plans.");
            return;
        }

        subscriptionPlans = result;
        renderPlans();

    } catch (error) {
        console.error(error);
        showMsg("Billing service not reachable.");
    }
}

function renderPlans() {
    const container = document.getElementById("plansContainer");
    const billingCycle = document.getElementById("billingCycle").value;

    if (!subscriptionPlans.length) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-4">No plans found for your role.</div>`;
        return;
    }

    let html = "";

    subscriptionPlans.forEach(plan => {
        const price = billingCycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice;
        const cycleText = billingCycle === "YEARLY" ? "year" : "month";

        html += `
            <div class="col-xl-4 col-md-6">
                <div class="mr-card h-100">

                    <h4 class="fw-bold text-primary">${safe(plan.planName)}</h4>
                    <p class="text-muted">${safe(plan.planCode)}</p>

                    <h2 class="fw-bold mb-3">
                        ₹${price}
                        <small class="text-muted fs-6">/${cycleText}</small>
                    </h2>

                    <ul class="list-unstyled">
                        ${plan.maxProducts ? `<li>✅ Max Products: ${plan.maxProducts}</li>` : ""}
                        ${plan.maxPatients ? `<li>✅ Max Patients: ${plan.maxPatients}</li>` : ""}
                        ${plan.maxAppointments ? `<li>✅ Max Appointments: ${plan.maxAppointments}</li>` : ""}
                        ${plan.maxDoctors ? `<li>✅ Max Doctors: ${plan.maxDoctors}</li>` : ""}
                        <li>${plan.onlineConsultationEnabled ? "✅" : "❌"} Online Consultation</li>
                        <li>${plan.reportsEnabled ? "✅" : "❌"} Reports</li>
                        <li>${plan.prioritySupportEnabled ? "✅" : "❌"} Priority Support</li>
                    </ul>

                    <button class="btn btn-medi mt-3 w-100"
                            onclick="subscribePlan('${plan.planCode}')">
                        Subscribe
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function subscribePlan(planCode) {
    const token = localStorage.getItem("token");
    const billingCycle = document.getElementById("billingCycle").value;

    if (!confirm("Subscribe to " + planCode + " with " + billingCycle + " billing?")) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/billing/subscriptions/subscribe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                planCode: planCode,
                billingCycle: billingCycle
            })
        });

        let result = {};
        try {
            result = await response.json();
        } catch (e) {
            result = {};
        }

        if (!response.ok) {
            showMsg(result.message || "Unable to initiate subscription.");
            return;
        }

        if (result.redirectUrl) {
            window.location.href = result.redirectUrl;
            return;
        }

        showMsg("Subscription initiated but redirect URL not found.");

    } catch (error) {
        console.error(error);
        showMsg("Billing service not reachable.");
    }
}

function showMsg(message, type = "danger") {
    document.getElementById("msg").innerHTML =
        `<div class="alert alert-${type}">${message}</div>`;
}

function safe(value) {
    return value === null || value === undefined || value === "" ? "-" : value;
}