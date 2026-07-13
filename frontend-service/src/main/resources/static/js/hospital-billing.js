let billingPatients = [];
let hospitalBills = [];

let editingBillId = null;

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadPatientsForBilling();
	loadBills();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

function toggleBillForm() {
	const panel =
		document.getElementById(
			"billFormPanel"
		);

	if (!panel) {
		return;
	}

	const isHidden =
		panel.style.display === "none" ||
		window.getComputedStyle(panel).display === "none";

	panel.style.display =
		isHidden
			? "block"
			: "none";
}

function openCreateBillForm() {
	clearForm();

	const panel =
		document.getElementById(
			"billFormPanel"
		);

	if (panel) {
		panel.style.display = "block";

		window.setTimeout(function() {
			panel.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		}, 80);
	}

	const title =
		document.getElementById(
			"billFormTitle"
		);

	if (title) {
		title.innerText =
			"Create Patient Bill";
	}

	setSaveButtonLabel(
		"Save Bill"
	);
}

function closeBillForm() {
	clearForm();

	const panel =
		document.getElementById(
			"billFormPanel"
		);

	if (panel) {
		panel.style.display = "none";
	}
}

async function loadPatientsForBilling() {
	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/patients`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		billingPatients =
			response.ok &&
				Array.isArray(result)
				? result
				: [];

		renderPatientDropdown();

		if (!response.ok) {
			showMsg(
				getErrorMessage(
					result,
					"Unable to load patients"
				)
			);
		}

	} catch (e) {
		console.error(
			"Load billing patients error:",
			e
		);

		billingPatients = [];
		renderPatientDropdown();

		showMsg(
			"Unable to load patients"
		);
	}
}

function renderPatientDropdown() {
	const dropdown =
		document.getElementById(
			"patientId"
		);

	if (!dropdown) {
		return;
	}

	if (!billingPatients.length) {
		dropdown.innerHTML =
			`<option value="">No patients found</option>`;

		return;
	}

	let html =
		`<option value="">Select Patient</option>`;

	billingPatients.forEach(
		function(p) {

			html += `
				<option value="${safeAttribute(p.id)}">
					${safe(p.patientName)} - ${safe(p.patientType)} - ${safe(p.mobile)}
				</option>
			`;

		}
	);

	dropdown.innerHTML = html;
}

async function loadBills() {
	const token =
		localStorage.getItem("token");

	showBillsLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/bills`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			hospitalBills = [];

			updateBillingSummary();

			showBillsErrorState(
				getErrorMessage(
					result,
					"Unable to load bills"
				)
			);

			showMsg(
				getErrorMessage(
					result,
					"Unable to load bills"
				)
			);

			return;
		}

		hospitalBills =
			Array.isArray(result)
				? result
				: [];

		renderBills();
		updateBillingSummary();

	} catch (e) {
		console.error(
			"Load hospital bills error:",
			e
		);

		hospitalBills = [];

		updateBillingSummary();

		showBillsErrorState(
			"Hospital service not reachable."
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

async function createBill() {
	const patientId =
		document
			.getElementById("patientId")
			?.value || "";

	if (
		!patientId &&
		!editingBillId
	) {
		showMsg(
			"Please select patient"
		);

		return;
	}

	const payload = {
		consultationFee:
			toDecimal(
				getVal("consultationFee")
			),

		medicineCharge:
			toDecimal(
				getVal("medicineCharge")
			),

		roomCharge:
			toDecimal(
				getVal("roomCharge")
			),

		otherCharge:
			toDecimal(
				getVal("otherCharge")
			),

		status:
			getVal("billStatus") ||
			"PENDING"
	};

	const token =
		localStorage.getItem("token");

	const url =
		editingBillId
			? `${API_BASE}/hospital/bills/${editingBillId}`
			: `${API_BASE}/hospital/patients/${patientId}/bill`;

	const method =
		editingBillId
			? "PUT"
			: "POST";

	setButtonLoading(
		"saveHospitalBillBtn",
		editingBillId
			? "Updating Bill..."
			: "Saving Bill...",
		true
	);

	try {
		const response =
			await fetch(
				url,
				{
					method: method,

					headers: {
						"Content-Type":
							"application/json",

						"Authorization":
							"Bearer " + token
					},

					body:
						JSON.stringify(payload)
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMsg(
				getErrorMessage(
					result,
					"Unable to save bill"
				)
			);

			return;
		}

		showMsg(
			editingBillId
				? "Bill updated successfully"
				: "Bill created successfully",
			"success"
		);

		editingBillId = null;

		clearForm();

		const panel =
			document.getElementById(
				"billFormPanel"
			);

		if (panel) {
			panel.style.display = "none";
		}

		loadBills();

	} catch (e) {
		console.error(
			"Save hospital bill error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);

	} finally {
		setButtonLoading(
			"saveHospitalBillBtn",
			editingBillId
				? "Update Bill"
				: "Save Bill",
			false
		);
	}
}

function renderBills() {
	const table =
		document.getElementById(
			"billTable"
		);

	if (!table) {
		return;
	}

	if (!hospitalBills.length) {
		table.innerHTML = `
			<tr>
				<td colspan="9">

					<div class="hospital-billing-state">

						<div class="hospital-billing-state-icon">
							<i class="bi bi-receipt"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No bills found
						</h5>

						<p class="text-muted mb-0">
							Create the first patient bill to begin billing management.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	hospitalBills.forEach(
		function(b, index) {

			const patient =
				b.patient || {};

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>
						<div class="hospital-billing-patient">

							<div class="hospital-billing-avatar">
								<i class="bi bi-person-fill"></i>
							</div>

							<div>
								<strong class="text-primary">
									${safe(patient.patientName)}
								</strong>

								<div class="text-muted small">
									${safe(patient.patientType)}
								</div>
							</div>

						</div>
					</td>

					<td>
						₹${formatMoney(b.consultationFee)}
					</td>

					<td>
						₹${formatMoney(b.medicineCharge)}
					</td>

					<td>
						₹${formatMoney(b.roomCharge)}
					</td>

					<td>
						₹${formatMoney(b.otherCharge)}
					</td>

					<td>
						<strong class="text-primary">
							₹${formatMoney(b.totalAmount)}
						</strong>
					</td>

					<td>
						${billStatusBadge(b.status)}
					</td>

					<td>

						<div class="hospital-billing-actions">

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="editBill(${safeNumber(b.id)})">

								<i class="bi bi-pencil-square me-1"></i>
								Edit
							</button>

							${b.status !== "PAID"
					? `
									<button type="button"
											class="btn btn-sm btn-success"
											onclick="markBillPaid(${safeNumber(b.id)})">

										<i class="bi bi-check2-circle me-1"></i>
										Paid
									</button>
								`
					: ""
				}

							<button type="button"
									class="btn btn-sm btn-outline-danger"
									onclick="deleteBill(${safeNumber(b.id)})">

								<i class="bi bi-trash-fill me-1"></i>
								Delete
							</button>

						</div>

					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;
}

function showBillsLoadingState() {
	const table =
		document.getElementById(
			"billTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="9">

				<div class="hospital-billing-state">

					<div class="hospital-billing-state-icon hospital-billing-loading-icon">
						<i class="bi bi-receipt"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading bills
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare billing records.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showBillsErrorState(message) {
	const table =
		document.getElementById(
			"billTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="9">

				<div class="hospital-billing-state">

					<div class="hospital-billing-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load bills
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function editBill(id) {
	const bill =
		hospitalBills.find(
			item =>
				Number(item.id) ===
				Number(id)
		);

	if (!bill) {
		showMsg(
			"Bill not found"
		);

		return;
	}

	editingBillId = id;

	const patientDropdown =
		document.getElementById(
			"patientId"
		);

	if (patientDropdown) {
		patientDropdown.value =
			bill.patient
				? bill.patient.id
				: "";

		patientDropdown.disabled = true;
	}

	setInputValue(
		"consultationFee",
		bill.consultationFee || ""
	);

	setInputValue(
		"medicineCharge",
		bill.medicineCharge || ""
	);

	setInputValue(
		"roomCharge",
		bill.roomCharge || ""
	);

	setInputValue(
		"otherCharge",
		bill.otherCharge || ""
	);

	setInputValue(
		"billStatus",
		bill.status || "PENDING"
	);

	const title =
		document.getElementById(
			"billFormTitle"
		);

	if (title) {
		title.innerText =
			"Edit Patient Bill";
	}

	setSaveButtonLabel(
		"Update Bill"
	);

	updateBillPreview();

	const panel =
		document.getElementById(
			"billFormPanel"
		);

	if (panel) {
		panel.style.display = "block";

		panel.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}
}

async function deleteBill(id) {
	if (
		!confirm(
			"Are you sure you want to delete this bill?"
		)
	) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/bills/${id}`,
				{
					method: "DELETE",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const resultText =
			await response.text();

		if (!response.ok) {
			showMsg(
				resultText ||
				"Unable to delete bill"
			);

			return;
		}

		showMsg(
			"Bill deleted successfully",
			"success"
		);

		loadBills();

	} catch (e) {
		console.error(
			"Delete hospital bill error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

async function markBillPaid(billId) {
	if (
		!confirm(
			"Mark this bill as paid?"
		)
	) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/bills/${billId}/paid`,
				{
					method: "PUT",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMsg(
				getErrorMessage(
					result,
					"Unable to update bill status"
				)
			);

			return;
		}

		showMsg(
			"Bill marked as paid",
			"success"
		);

		loadBills();

	} catch (e) {
		console.error(
			"Mark bill paid error:",
			e
		);

		showMsg(
			"Hospital service not reachable."
		);
	}
}

function billStatusBadge(status) {
	if (status === "PAID") {
		return `
			<span class="hospital-billing-status paid">
				<i class="bi bi-check2-circle"></i>
				PAID
			</span>
		`;
	}

	return `
		<span class="hospital-billing-status pending">
			<i class="bi bi-hourglass-split"></i>
			PENDING
		</span>
	`;
}

function updateBillingSummary() {
	const list =
		Array.isArray(hospitalBills)
			? hospitalBills
			: [];

	const paidCount =
		list.filter(
			b => b.status === "PAID"
		).length;

	const pendingCount =
		list.filter(
			b => b.status !== "PAID"
		).length;

	const totalRevenue =
		list
			.filter(
				b => b.status === "PAID"
			)
			.reduce(
				(total, bill) =>
					total +
					Number(
						bill.totalAmount || 0
					),
				0
			);

	setSummaryValue(
		"totalHospitalBillCount",
		list.length
	);

	setSummaryValue(
		"paidHospitalBillCount",
		paidCount
	);

	setSummaryValue(
		"pendingHospitalBillCount",
		pendingCount
	);

	const revenueElement =
		document.getElementById(
			"hospitalBillRevenue"
		);

	if (revenueElement) {
		revenueElement.textContent =
			`₹${formatMoney(totalRevenue)}`;
	}
}

function updateBillPreview() {
	const total =
		toDecimal(
			getVal("consultationFee")
		) +
		toDecimal(
			getVal("medicineCharge")
		) +
		toDecimal(
			getVal("roomCharge")
		) +
		toDecimal(
			getVal("otherCharge")
		);

	const preview =
		document.getElementById(
			"billPreviewTotal"
		);

	if (preview) {
		preview.textContent =
			`₹${formatMoney(total)}`;
	}
}

function clearForm() {
	editingBillId = null;

	const patientDropdown =
		document.getElementById(
			"patientId"
		);

	if (patientDropdown) {
		patientDropdown.disabled = false;
	}

	[
		"patientId",
		"consultationFee",
		"medicineCharge",
		"roomCharge",
		"otherCharge"
	].forEach(
		function(id) {
			setInputValue(id, "");
		}
	);

	setInputValue(
		"billStatus",
		"PENDING"
	);

	const title =
		document.getElementById(
			"billFormTitle"
		);

	if (title) {
		title.innerText =
			"Create Patient Bill";
	}

	setSaveButtonLabel(
		"Save Bill"
	);

	updateBillPreview();
}

function setInputValue(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.value = value;
	}
}

function setSaveButtonLabel(label) {
	const button =
		document.getElementById(
			"saveHospitalBillBtn"
		);

	if (!button) {
		return;
	}

	button.innerHTML = `
		<i class="bi bi-check2-circle me-1"></i>
		${escapeHtml(label)}
	`;
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
				  aria-hidden="true">
			</span>
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

function setSummaryValue(id, value) {
	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	const target =
		Number(value) || 0;

	const start =
		Number(element.textContent) || 0;

	const difference =
		target - start;

	const duration = 500;
	const startTime = performance.now();

	if (
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches ||
		difference === 0
	) {
		element.textContent = target;
		return;
	}

	function update(currentTime) {
		const progress =
			Math.min(
				(currentTime - startTime) /
				duration,
				1
			);

		const eased =
			1 - Math.pow(1 - progress, 3);

		element.textContent =
			Math.round(
				start +
				difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

function getVal(id) {
	const element =
		document.getElementById(id);

	return element
		? element.value.trim()
		: "";
}

function toDecimal(value) {
	const numberValue =
		parseFloat(value);

	return Number.isFinite(numberValue)
		? numberValue
		: 0;
}

function showMsg(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

	setTimeout(function() {
		if (msg) {
			msg.innerHTML = "";
		}
	}, 4000);
}

function formatMoney(value) {
	return value === null ||
		value === undefined
		? "0.00"
		: Number(value).toFixed(2);
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

function safeAttribute(value) {
	return escapeHtml(value)
		.replace(/`/g, "&#96;");
}

function safeNumber(value) {
	const numberValue =
		Number(value);

	return Number.isFinite(numberValue)
		? numberValue
		: 0;
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}