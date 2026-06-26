let subscriptionPlans = [];

document.addEventListener("DOMContentLoaded", function () {
    requireSubscriptionRole();
    loadPlans();

    const billingCycleElement = document.getElementById("billingCycle");
    if (billingCycleElement) {
        billingCycleElement.addEventListener("change", renderPlans);
    }
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
    const role = localStorage.getItem("role");

    try {
        const response = await fetch(`${API_BASE}/billing/subscriptions/plans/${role}`, {
            method: "GET",
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

        subscriptionPlans = Array.isArray(result) ? result : [];
        renderPlans();

    } catch (error) {
        console.error(error);
        showMsg("Billing service not reachable.");
    }
}

function getPlanCode(plan) {
    if (!plan) {
        return "";
    }

    return plan.planCode ||
        plan.plan_code ||
        plan.code ||
        plan.id ||
        "";
}

function renderPlans() {
    const container = document.getElementById("plansContainer");
    const billingCycle = document.getElementById("billingCycle").value;

    if (!subscriptionPlans || subscriptionPlans.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-4">
                No plans found for your role.
            </div>
        `;
        return;
    }

    let html = "";

    subscriptionPlans.forEach(plan => {
        const price = getPlanPrice(plan, billingCycle);
        const cycleText = billingCycle === "YEARLY" ? "year" : "month";

        html += `
            <div class="col-xl-4 col-md-6">
                <div class="mr-card h-100">

                    <h4 class="fw-bold text-primary">
                        ${safe(plan.planName)}
                    </h4>

                    <p class="text-muted">
   						 ${safe(getPlanCode(plan))} • ${safe(plan.role)}
					</p>

                    <h2 class="fw-bold mb-3">
                        ₹${price}
                        <small class="text-muted fs-6">/${cycleText}</small>
                    </h2>

                    <ul class="list-unstyled">
                        ${getMaxMedicines(plan) > 0 ? `<li>✅ Max Medicines: ${getMaxMedicines(plan)}</li>` : ""}
                        ${getMaxAppointments(plan) > 0 ? `<li>✅ Max Appointments: ${getMaxAppointments(plan)}</li>` : ""}
                        ${getMaxStaff(plan) > 0 ? `<li>✅ Max Staff: ${getMaxStaff(plan)}</li>` : ""}

                        <li>
                            ${isVideoConsultationAllowed(plan) ? "✅" : "❌"} Online Consultation
                        </li>

                        <li>${isReportsEnabled(plan) ? "✅" : "❌"} Reports</li>
                        <li>${isPrioritySupportEnabled(plan) ? "✅" : "❌"} Priority Support</li>
                    </ul>

                    <button class="btn btn-medi mt-3 w-100"
                            onclick="subscribePlan('${safeForJs(getPlanCode(plan))}')">
                        Subscribe
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function getPlanPrice(plan, billingCycle) {
    if (!plan) {
        return "0.00";
    }

    let price;

    if (billingCycle === "YEARLY") {
        price =
            plan.yearlyPrice ??
            plan.yearly_price ??
            plan.price ??
            plan.monthlyPrice ??
            plan.monthly_price ??
            0;
    } else {
        price =
            plan.monthlyPrice ??
            plan.monthly_price ??
            plan.price ??
            0;
    }

    return Number(price || 0).toFixed(2);
}

function getMaxMedicines(plan) {
    return Number(plan.maxMedicines ?? plan.max_medicines ?? plan.maxProducts ?? 0);
}

function getMaxAppointments(plan) {
    return Number(plan.maxAppointments ?? plan.max_appointments ?? 0);
}

function getMaxStaff(plan) {
    return Number(plan.maxStaff ?? plan.max_staff ?? plan.maxDoctors ?? 0);
}

function isVideoConsultationAllowed(plan) {
    return Boolean(
        plan.videoConsultationAllowed ??
        plan.video_consultation_allowed ??
        plan.onlineConsultationEnabled ??
        false
    );
}

function isReportsEnabled(plan) {
    return Boolean(
        plan.reportsEnabled ??
        plan.reports_enabled ??
        false
    );
}

function isPrioritySupportEnabled(plan) {
    return Boolean(
        plan.prioritySupportEnabled ??
        plan.priority_support_enabled ??
        false
    );
}

async function subscribePlan(planCode) {
    const token = localStorage.getItem("token");
    const billingCycle = document.getElementById("billingCycle").value;

    if (!planCode || planCode === "-") {
        showMsg("Invalid plan selected.");
        return;
    }

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

        showMsg("Subscription initiated successfully.", "success");

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

function safeForJs(value) {
    return String(value || "").replace(/'/g, "\\'");
}