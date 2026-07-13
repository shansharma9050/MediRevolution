document.addEventListener("DOMContentLoaded", function () {
    verifySubscriptionPayment();
});

async function verifySubscriptionPayment() {
    const params = new URLSearchParams(window.location.search);

    const paymentId = params.get("paymentId");
    const merchantOrderId = params.get("merchantOrderId");

    const token = localStorage.getItem("token");

    if (!paymentId || !merchantOrderId) {
        showStatus("Payment details missing in redirect URL.", "danger");
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/billing/subscriptions/payments/verify?paymentId=${encodeURIComponent(paymentId)}&merchantOrderId=${encodeURIComponent(merchantOrderId)}`,
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        let result = {};
        try {
            result = await response.json();
        } catch (e) {
            result = {};
        }

        if (!response.ok) {
            showStatus(result.message || "Payment verification failed.", "danger");
            return;
        }

        if (!result.success) {
            showStatus(result.message || "Payment not successful.", "danger");
            return;
        }

        showStatus(result.message || "Subscription activated successfully.", "success");
        showDetails(result);

    } catch (error) {
        console.error(error);
        showStatus("Billing service not reachable.", "danger");
    }
}

function showStatus(message, type) {
    const statusBox = document.getElementById("statusBox");
    statusBox.className = `alert alert-${type}`;
    statusBox.innerText = message;
}

function showDetails(result) {
    document.getElementById("detailsBox").classList.remove("d-none");

    document.getElementById("planName").innerText = safe(result.planName);
    document.getElementById("planCode").innerText = safe(result.planCode);
    document.getElementById("startDate").innerText = safe(result.startDate);
    document.getElementById("endDate").innerText = safe(result.endDate);
    document.getElementById("merchantOrderIdText").innerText = safe(result.merchantOrderId);
}

function safe(value) {
    return value === null || value === undefined || value === "" ? "-" : value;
}