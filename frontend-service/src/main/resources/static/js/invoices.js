document.addEventListener("DOMContentLoaded", function() {
	applyRoleVisibility();
	bindInvoiceEnterKey();
});

function applyRoleVisibility() {
	const role =
		localStorage.getItem("role");

	const generateButton =
		document.getElementById(
			"generateBtn"
		);

	if (
		generateButton &&
		role !== "WHOLESALER"
	) {
		generateButton.style.display =
			"none";
	}
}

function bindInvoiceEnterKey() {
	const orderInput =
		document.getElementById(
			"invoiceOrderId"
		);

	if (!orderInput) {
		return;
	}

	orderInput.addEventListener(
		"keydown",
		function(event) {

			if (event.key === "Enter") {
				event.preventDefault();
				loadInvoice();
			}

		}
	);
}

async function generateInvoice() {
	const orderNo =
		getInvoiceOrderNumber();

	if (!orderNo) {
		showInvoiceMessage(
			"Order ID required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	setButtonLoading(
		"generateBtn",
		"Generating...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/billing/invoice/order/${encodeURIComponent(orderNo)}`,
				{
					method: "POST",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showInvoiceMessage(
				getErrorMessage(
					result,
					"Unable to generate invoice"
				)
			);

			return;
		}

		showInvoiceMessage(
			"Invoice generated successfully",
			"success"
		);

		await loadInvoice();

	} catch (e) {
		console.error(
			"Generate invoice error:",
			e
		);

		showInvoiceMessage(
			"Billing service unavailable"
		);

	} finally {
		setButtonLoading(
			"generateBtn",
			"Generate Invoice",
			false
		);
	}
}

async function loadInvoice() {
	const orderNo =
		getInvoiceOrderNumber();

	if (!orderNo) {
		showInvoiceMessage(
			"Order ID required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	showInvoiceLoadingState();

	setButtonLoading(
		"viewInvoiceBtn",
		"Loading...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/billing/invoice/order/${encodeURIComponent(orderNo)}`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const invoice =
			await readJsonSafely(response);

		if (!response.ok) {
			showInvoiceErrorState(
				getErrorMessage(
					invoice,
					"Invoice not found"
				)
			);

			showInvoiceMessage(
				getErrorMessage(
					invoice,
					"Invoice not found"
				)
			);

			return;
		}

		renderInvoice(invoice);

	} catch (e) {
		console.error(
			"Load invoice error:",
			e
		);

		showInvoiceErrorState(
			"Billing service unavailable"
		);

		showInvoiceMessage(
			"Billing service unavailable"
		);

	} finally {
		setButtonLoading(
			"viewInvoiceBtn",
			"View Invoice",
			false
		);
	}
}

function renderInvoice(invoice) {
	const container =
		document.getElementById(
			"invoiceContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="invoice-preview-shell">

			<div class="invoice-preview-top">

				<div class="d-flex justify-content-between align-items-start gap-4">

					<div class="invoice-preview-brand">

						<img src="/images/logo.png"
							 class="invoice-preview-logo"
							 alt="MediRevolution logo">

						<div>
							<div class="invoice-preview-title">
								MediRevolution
							</div>

							<div class="invoice-preview-subtitle">
								Digital Healthcare & Commerce Platform
							</div>
						</div>

					</div>

					<div class="invoice-number-box">

						<div class="small text-white-50">
							TAX INVOICE
						</div>

						<div class="fw-bold mt-1">
							${safe(invoice.invoiceNumber)}
						</div>

					</div>

				</div>

			</div>

			<div class="invoice-preview-body">

				<div class="invoice-info-grid">

					<div class="invoice-info-box">
						<small>Order Number</small>
						<strong>${safe(invoice.orderNumber)}</strong>
					</div>

					<div class="invoice-info-box">
						<small>Invoice Date</small>
						<strong>${formatDate(invoice.invoiceDate)}</strong>
					</div>

				</div>

				<div class="invoice-amount-grid">

					<div class="invoice-amount-box">
						<small>Sub Total</small>
						<strong>₹${formatMoney(invoice.taxableAmount)}</strong>
					</div>

					<div class="invoice-amount-box">
						<small>GST</small>
						<strong>₹${formatMoney(invoice.gstAmount)}</strong>
					</div>

					<div class="invoice-amount-box total">
						<small>Total Amount</small>
						<strong>₹${formatMoney(invoice.totalAmount)}</strong>
					</div>

				</div>

				<div class="invoice-preview-actions">

					<button type="button"
							class="btn btn-medi"
							style="width:auto;"
							onclick="downloadInvoice('${safeJsString(invoice.orderNumber)}')">

						<i class="bi bi-file-earmark-pdf-fill me-1"></i>
						Download PDF
					</button>

				</div>

			</div>

		</div>
	`;
}

function showInvoiceLoadingState() {
	const container =
		document.getElementById(
			"invoiceContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="invoice-loading-state">

			<div class="invoice-state-icon">
				<i class="bi bi-receipt"></i>
			</div>

			<h5 class="fw-bold text-primary">
				Loading invoice
			</h5>

			<p class="text-muted mb-0">
				Please wait while we retrieve invoice details.
			</p>

		</div>
	`;
}

function showInvoiceErrorState(message) {
	const container =
		document.getElementById(
			"invoiceContainer"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="invoice-error-state">

			<div class="invoice-state-icon">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">
				Unable to load invoice
			</h5>

			<p class="text-muted mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}

async function downloadInvoice(orderNo) {
	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/billing/invoice/order/${encodeURIComponent(orderNo)}/download`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			showInvoiceMessage(
				"PDF download failed"
			);

			return;
		}

		const blob =
			await response.blob();

		const url =
			window.URL.createObjectURL(blob);

		const anchor =
			document.createElement("a");

		anchor.href = url;
		anchor.download =
			`invoice-${orderNo}.pdf`;

		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();

		window.URL.revokeObjectURL(url);

	} catch (e) {
		console.error(
			"Invoice download error:",
			e
		);

		showInvoiceMessage(
			"Billing service unavailable"
		);
	}
}

function getInvoiceOrderNumber() {
	return document
		.getElementById("invoiceOrderId")
		?.value
		.trim() || "";
}

function formatDate(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
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

function formatMoney(value) {
	const numberValue =
		Number(value);

	return Number.isFinite(numberValue)
		? numberValue.toFixed(2)
		: "0.00";
}

function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {
	const button =
		document.getElementById(buttonId);

	if (!button) {
		return;
	}

	if (isLoading) {
		button.dataset.originalHtml =
			button.innerHTML;

		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2"
				  role="status"
				  aria-hidden="true"></span>
			${escapeHtml(loadingText)}
		`;

		button.disabled = true;

	} else {
		button.innerHTML =
			button.dataset.originalHtml ||
			button.innerHTML;

		button.disabled = false;
	}
}

function showInvoiceMessage(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type}">
			${escapeHtml(message)}
		</div>
	`;

	setTimeout(function() {
		if (msg) {
			msg.innerHTML = "";
		}
	}, 4000);
}

async function readJsonSafely(response) {
	try {
		return await response.json();
	} catch (error) {
		return null;
	}
}

function getErrorMessage(
	data,
	fallback
) {
	if (!data) {
		return fallback;
	}

	if (data.message) {
		return data.message;
	}

	if (data.error) {
		return data.error;
	}

	if (typeof data === "string") {
		return data;
	}

	return fallback;
}

function safe(value) {
	return (
		value === null ||
		value === undefined ||
		value === ""
	)
		? "-"
		: escapeHtml(value);
}

function safeJsString(value) {
	return String(value || "")
		.replace(/\\/g, "\\\\")
		.replace(/'/g, "\\'")
		.replace(/\r/g, "\\r")
		.replace(/\n/g, "\\n");
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}