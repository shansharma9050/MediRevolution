document.addEventListener("DOMContentLoaded", function() {

	applyRoleVisibility();

});

function applyRoleVisibility() {

	const role =
		localStorage.getItem("role");

	if (role !== "WHOLESALER") {

		document
			.getElementById("generateBtn")
			.style.display = "none";
	}
}

async function generateInvoice() {

	const orderNo =
		document.getElementById("invoiceOrderId").value;

	if (!orderNo) {

		showInvoiceMessage(
			"Order ID required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	try {

		const response =
			await fetch(
				`${API_BASE}/billing/invoice/order/${orderNo}`,
				{
					method: "POST",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await response.json();

		if (!response.ok) {

			showInvoiceMessage(
				result.message ||
				"Unable to generate invoice"
			);

			return;
		}

		showInvoiceMessage(
			"Invoice generated successfully",
			"success"
		);

		loadInvoice();

	} catch (e) {

		showInvoiceMessage(
			"Billing service unavailable"
		);
	}
}

async function loadInvoice() {

	const orderNo =document.getElementById("invoiceOrderId").value;

	if (!orderNo) {

		showInvoiceMessage(
			"Order ID required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	try {

		const response =
			await fetch(
				`${API_BASE}/billing/invoice/order/${orderNo}`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const invoice =
			await response.json();

		if (!response.ok) {

			showInvoiceMessage(
				invoice.message ||
				"Invoice not found"
			);

			return;
		}

		renderInvoice(invoice);

	} catch (e) {

		showInvoiceMessage(
			"Billing service unavailable"
		);
	}
}

function renderInvoice(invoice) {

	const html = `

    <div class="invoice-preview">

        <div class="invoice-header">

            <div class="d-flex justify-content-between">

                <div>

                    <img src="/images/logo.png"
                         width="120">

                    <h4 class="fw-bold mt-2">
                        MediRevolution
                    </h4>

                </div>

                <div class="text-end">

                    <h4 class="fw-bold">
                        TAX INVOICE
                    </h4>

                    <div>
                        Invoice No :
                        ${invoice.invoiceNumber}
                    </div>

                </div>

            </div>

        </div>

        <div class="row mb-3">

            <div class="col-md-6">

                <div class="invoice-label">
                    Order Number
                </div>

                <div class="invoice-value">
                    ${invoice.orderNumber}
                </div>

            </div>

            <div class="col-md-6">

                <div class="invoice-label">
                    Invoice Date
                </div>

                <div class="invoice-value">
                    ${formatDate(invoice.invoiceDate)}
                </div>

            </div>

        </div>

        <hr>

        <div class="row mb-3">

            <div class="col-md-4">

                <div class="invoice-label">
                    Sub Total
                </div>

                <div class="invoice-value">
                    ₹ ${formatMoney(invoice.taxableAmount)}
                </div>

            </div>

            <div class="col-md-4">

                <div class="invoice-label">
                    GST
                </div>

                <div class="invoice-value">
                    ₹ ${formatMoney(invoice.gstAmount)}
                </div>

            </div>

            <div class="col-md-4">

                <div class="invoice-label">
                    Total
                </div>

                <div class="invoice-total">
                    ₹ ${formatMoney(invoice.totalAmount)}
                </div>

            </div>

        </div>

        <button class="btn btn-medi"
                onclick="downloadInvoice('${invoice.orderNumber}')">

            Download PDF

        </button>

    </div>

    `;

	document
		.getElementById("invoiceContainer")
		.innerHTML = html;
}

async function downloadInvoice(orderNo) {
    const token = localStorage.getItem("token");

    const response = await fetch(
        `${API_BASE}/billing/invoice/order/${orderNo}/download`,
        {
            headers: {
                "Authorization": "Bearer " + token
            }
        }
    );

    if (!response.ok) {
        showInvoiceMessage("PDF download failed");
        return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "invoice-" + orderNo + ".pdf";
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);
}

function formatDate(value) {

	if (!value) return "-";

	return new Date(value)
		.toLocaleDateString();
}

function formatMoney(value) {

	if (!value) return "0.00";

	return Number(value)
		.toFixed(2);
}

function showInvoiceMessage(
	message,
	type = "danger"
) {

	document
		.getElementById("msg")
		.innerHTML =
		`<div class="alert alert-${type}">
            ${message}
        </div>`;
}