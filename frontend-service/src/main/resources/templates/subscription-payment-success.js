document.addEventListener("DOMContentLoaded", function () {
    activateSubscription();
});

async function activateSubscription() {
    const params = new URLSearchParams(window.location.search);
    const merchantOrderId = params.get("merchantOrderId");

    if (!merchantOrderId) {
        showMsg("Merchant order id missing.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/billing/subscriptions/payment/success?merchantOrderId=${merchantOrderId}`, {
            method: "POST"
        });

        let result = {};
        try {
            result = await response.json();
        } catch (e) {
            result = {};
        }

        if (!response.ok) {
            showMsg(result.message || "Unable to activate subscription.");
            return;
        }

        showMsg("Subscription activated successfully. Plan: " + result.planName, "success");

    } catch (error) {
        console.error(error);
        showMsg("Billing service not reachable.");
    }
}

function showMsg(message, type = "danger") {
    document.getElementById("msg").innerHTML =
        `<div class="alert alert-${type}">${message}</div>`;
}