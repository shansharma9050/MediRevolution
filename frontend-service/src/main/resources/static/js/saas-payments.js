let paymentList = [];
let supplierOutstandingList = [];
let customerOutstandingList = [];

let paymentDetailsModal = null;
let partyLedgerModal = null;

let isLoadingPayments = false;
let isSavingPayment = false;
let isLoadingPartyOutstanding = false;

let paymentPermissions = {
	create: false
};


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const allowed =
			await protectSaasPage(
				"PAYMENTS",
				"VIEW"
			);

		if (!allowed) {
			return;
		}

		const tenantId =
			localStorage.getItem(
				"tenantId"
			);

		if (!tenantId) {

			alert(
				"Please select SaaS workspace first."
			);

			window.location.href =
				"/saas/workspaces";

			return;
		}

		const tenantType =
			String(
				localStorage.getItem(
					"tenantType"
				) || ""
			)
				.trim()
				.toUpperCase();

		if (
			tenantType &&
			tenantType !== "WHOLESALER" &&
			tenantType !== "RETAILER"
		) {

			alert(
				"Payments module is available only for Wholesaler and Retailer workspaces."
			);

			window.location.href =
				"/saas/dashboard";

			return;
		}

		initializePaymentPage();

		initializePaymentModals();

		await loadPaymentPermissions();

		setDefaultPaymentDate();

		handlePaymentTransactionTypeChange();

		handlePaymentModeChange();

		await Promise.all([
			loadPaymentSummary(),
			loadPayments(),
			loadAllOutstandingParties()
		]);

		initializePaymentSearchEnter();
	}
);


function initializePaymentPage() {

	const tenantName =
		localStorage.getItem(
			"tenantName"
		) || "your workspace";

	const tenantType =
		localStorage.getItem(
			"tenantType"
		) || "Workspace";

	setText(
		"tenantNameText",
		tenantName
	);

	setText(
		"tenantTypeText",
		formatTenantType(
			tenantType
		)
	);

	setText(
		"sidebarTenantName",
		tenantName
	);

	setText(
		"navbarTenantName",
		tenantName
	);
}


function initializePaymentModals() {

	const paymentModalElement =
		document.getElementById(
			"paymentDetailsModal"
		);

	if (paymentModalElement) {

		paymentDetailsModal =
			new bootstrap.Modal(
				paymentModalElement
			);
	}

	const ledgerModalElement =
		document.getElementById(
			"partyLedgerModal"
		);

	if (ledgerModalElement) {

		partyLedgerModal =
			new bootstrap.Modal(
				ledgerModalElement
			);
	}
}


function initializePaymentSearchEnter() {

	const searchInput =
		document.getElementById(
			"paymentSearchKeyword"
		);

	if (!searchInput) {
		return;
	}

	searchInput.addEventListener(
		"keydown",
		function(event) {

			if (event.key === "Enter") {

				event.preventDefault();

				searchPayments();
			}
		}
	);
}


async function loadPaymentPermissions() {

	const canCreate =
		await hasSaasPermission(
			"PAYMENTS",
			"CREATE"
		);

	paymentPermissions.create =
		Boolean(canCreate);

	showOrHideById(
		"newSupplierPaymentBtn",
		paymentPermissions.create
	);

	showOrHideById(
		"newCustomerReceiptBtn",
		paymentPermissions.create
	);
}


function setDefaultPaymentDate() {

	setValue(
		"paymentDate",
		getTodayDateString()
	);
}


async function loadPaymentSummary() {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await paymentApiRequest(
			`${API_BASE}/saas/payments/summary` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		resetPaymentSummary();

		return;
	}

	const summary =
		result.data || {};

	setAnimatedNumber(
		"totalPaymentTransactions",
		summary.totalTransactions
	);

	setText(
		"totalSupplierPayments",
		formatCurrency(
			summary.totalSupplierPayments
		)
	);

	setText(
		"totalCustomerReceipts",
		formatCurrency(
			summary.totalCustomerReceipts
		)
	);

	setText(
		"totalSupplierOutstanding",
		formatCurrency(
			summary.totalSupplierOutstanding
		)
	);

	setText(
		"totalCustomerOutstanding",
		formatCurrency(
			summary.totalCustomerOutstanding
		)
	);
}


function resetPaymentSummary() {

	setText(
		"totalPaymentTransactions",
		"0"
	);

	setText(
		"totalSupplierPayments",
		formatCurrency(0)
	);

	setText(
		"totalCustomerReceipts",
		formatCurrency(0)
	);

	setText(
		"totalSupplierOutstanding",
		formatCurrency(0)
	);

	setText(
		"totalCustomerOutstanding",
		formatCurrency(0)
	);
}


async function loadPayments() {

	if (isLoadingPayments) {
		return;
	}

	isLoadingPayments = true;

	showPaymentLoadingState();

	setButtonLoading(
		"refreshPaymentBtn",
		"Refreshing...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await paymentApiRequest(
			`${API_BASE}/saas/payments` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	isLoadingPayments = false;

	setButtonLoading(
		"refreshPaymentBtn",
		"Refresh",
		false
	);

	if (!result.ok) {

		paymentList = [];

		const message =
			getPaymentErrorMessage(
				result.data,
				"Unable to load payment transactions."
			);

		showPaymentErrorState(
			message
		);

		showMsg(message);

		return;
	}

	paymentList =
		normalizeArrayResponse(
			result.data
		);

	renderPayments(
		paymentList
	);
}


async function searchPayments() {

	const keyword =
		getValue(
			"paymentSearchKeyword"
		);

	if (!keyword) {

		await loadPayments();

		return;
	}

	showPaymentLoadingState();

	setButtonLoading(
		"searchPaymentBtn",
		"Searching...",
		true
	);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await paymentApiRequest(
			`${API_BASE}/saas/payments/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`
		);

	setButtonLoading(
		"searchPaymentBtn",
		"Search",
		false
	);

	if (!result.ok) {

		const message =
			getPaymentErrorMessage(
				result.data,
				"Unable to search payment transactions."
			);

		showPaymentErrorState(
			message
		);

		return;
	}

	paymentList =
		normalizeArrayResponse(
			result.data
		);

	renderPayments(
		paymentList
	);
}


async function refreshPayments() {

	setValue(
		"paymentSearchKeyword",
		""
	);

	await Promise.all([
		loadPaymentSummary(),
		loadPayments(),
		loadAllOutstandingParties()
	]);
}


async function loadAllOutstandingParties() {

	if (isLoadingPartyOutstanding) {
		return;
	}

	isLoadingPartyOutstanding = true;

	const results =
		await Promise.all([
			loadOutstandingParties(
				"SUPPLIER"
			),
			loadOutstandingParties(
				"CUSTOMER"
			)
		]);

	isLoadingPartyOutstanding = false;

	supplierOutstandingList =
		results[0];

	customerOutstandingList =
		results[1];

	renderSupplierOutstanding(
		supplierOutstandingList
	);

	renderCustomerOutstanding(
		customerOutstandingList
	);

	populatePaymentPartyDropdown();
}


async function loadOutstandingParties(
	partyType
) {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const result =
		await paymentApiRequest(
			`${API_BASE}/saas/ledgers/outstanding` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&partyType=${encodeURIComponent(partyType)}`
		);

	if (!result.ok) {

		showOutstandingTableError(
			partyType,
			getPaymentErrorMessage(
				result.data,
				`Unable to load ${partyType.toLowerCase()} outstanding records.`
			)
		);

		return [];
	}

	return normalizeArrayResponse(
		result.data
	);
}


function openPaymentForm(
	transactionType
) {

	if (!paymentPermissions.create) {

		showMsg(
			"You do not have permission to create payment transactions."
		);

		return;
	}

	const panel =
		document.getElementById(
			"paymentFormPanel"
		);

	if (!panel) {
		return;
	}

	setPaymentTransactionType(
		transactionType
	);

	handlePaymentTransactionTypeChange();

	panel.style.display =
		"block";

	panel.scrollIntoView({
		behavior: "smooth",
		block: "start"
	});
}


function closePaymentForm() {

	const panel =
		document.getElementById(
			"paymentFormPanel"
		);

	if (panel) {
		panel.style.display = "none";
	}
}


function setPaymentTransactionType(
	transactionType
) {

	const supplierRadio =
		document.getElementById(
			"paymentTypeSupplier"
		);

	const customerRadio =
		document.getElementById(
			"paymentTypeCustomer"
		);

	if (
		transactionType ===
		"CUSTOMER_RECEIPT"
	) {

		if (customerRadio) {
			customerRadio.checked = true;
		}

		if (supplierRadio) {
			supplierRadio.checked = false;
		}

		return;
	}

	if (supplierRadio) {
		supplierRadio.checked = true;
	}

	if (customerRadio) {
		customerRadio.checked = false;
	}
}


function handlePaymentTransactionTypeChange() {

	const transactionType =
		getSelectedPaymentTransactionType();

	const supplierOption =
		document.getElementById(
			"supplierPaymentOption"
		);

	const customerOption =
		document.getElementById(
			"customerReceiptOption"
		);

	if (supplierOption) {

		supplierOption.classList.toggle(
			"active",
			transactionType ===
			"SUPPLIER_PAYMENT"
		);
	}

	if (customerOption) {

		customerOption.classList.toggle(
			"active",
			transactionType ===
			"CUSTOMER_RECEIPT"
		);
	}

	const isSupplierPayment =
		transactionType ===
		"SUPPLIER_PAYMENT";

	setText(
		"paymentFormTitle",
		isSupplierPayment
			? "Create Supplier Payment"
			: "Create Customer Receipt"
	);

	setText(
		"paymentPartyLabel",
		isSupplierPayment
			? "Supplier *"
			: "Customer *"
	);

	populatePaymentPartyDropdown();

	hideSelectedPaymentParty();

	setValue(
		"paymentAmount",
		"0"
	);

	updatePaymentReferenceOptions();
}


function updatePaymentReferenceOptions() {

	const transactionType =
		getSelectedPaymentTransactionType();

	const referenceSelect =
		document.getElementById(
			"paymentReferenceType"
		);

	if (!referenceSelect) {
		return;
	}

	if (
		transactionType ===
		"SUPPLIER_PAYMENT"
	) {

		referenceSelect.innerHTML = `
			<option value="">
				General Payment
			</option>

			<option value="PURCHASE">
				Purchase
			</option>

			<option value="PURCHASE_RETURN">
				Purchase Return
			</option>

			<option value="OPENING_BALANCE">
				Opening Balance
			</option>

			<option value="OTHER">
				Other
			</option>
		`;

		return;
	}

	referenceSelect.innerHTML = `
		<option value="">
			General Receipt
		</option>

		<option value="SALE">
			Sale
		</option>

		<option value="SALES_RETURN">
			Sales Return
		</option>

		<option value="OPENING_BALANCE">
			Opening Balance
		</option>

		<option value="OTHER">
			Other
		</option>
	`;
}


function populatePaymentPartyDropdown() {

	const select =
		document.getElementById(
			"paymentPartyId"
		);

	if (!select) {
		return;
	}

	const transactionType =
		getSelectedPaymentTransactionType();

	const isSupplierPayment =
		transactionType ===
		"SUPPLIER_PAYMENT";

	const list =
		isSupplierPayment
			? supplierOutstandingList
			: customerOutstandingList;

	select.innerHTML = `

		<option value="">

			${isSupplierPayment
			? "Select Supplier"
			: "Select Customer"
		}

		</option>
	`;

	list.forEach(
		function(item) {

			const option =
				document.createElement(
					"option"
				);

			option.value =
				item.partyId;

			option.textContent =
				`${item.partyName || "Party"} ` +
				`${item.partyCode ? `(${item.partyCode}) ` : ""}` +
				`— Outstanding ${formatCurrency(item.outstandingAmount)}`;

			option.dataset.partyCode =
				item.partyCode || "";

			option.dataset.partyName =
				item.partyName || "";

			option.dataset.outstandingAmount =
				Number(
					item.outstandingAmount || 0
				);

			option.dataset.balanceType =
				item.balanceType || "";

			select.appendChild(option);
		}
	);
}


function handlePaymentPartyChange() {

	const party =
		getSelectedOutstandingParty();

	if (!party) {

		hideSelectedPaymentParty();

		setValue(
			"paymentAmount",
			"0"
		);

		return;
	}

	const transactionType =
		getSelectedPaymentTransactionType();

	showSelectedPaymentParty(
		party,
		transactionType
	);

	setValue(
		"paymentAmount",
		numberToFixed(
			party.outstandingAmount
		)
	);
}


function showSelectedPaymentParty(
	party,
	transactionType
) {

	const card =
		document.getElementById(
			"selectedPaymentPartyCard"
		);

	if (!card) {
		return;
	}

	card.classList.add(
		"active"
	);

	setText(
		"selectedPaymentPartyType",
		transactionType ===
			"SUPPLIER_PAYMENT"
			? "Supplier"
			: "Customer"
	);

	setText(
		"selectedPaymentPartyName",
		party.partyName || "-"
	);

	setText(
		"selectedPaymentPartyCode",
		party.partyCode || "-"
	);

	setText(
		"selectedPaymentOutstanding",
		formatCurrency(
			party.outstandingAmount
		)
	);
}


function hideSelectedPaymentParty() {

	const card =
		document.getElementById(
			"selectedPaymentPartyCard"
		);

	if (card) {

		card.classList.remove(
			"active"
		);
	}
}


function getSelectedOutstandingParty() {

	const partyId =
		getNumberValue(
			"paymentPartyId"
		);

	if (!partyId) {
		return null;
	}

	const transactionType =
		getSelectedPaymentTransactionType();

	const list =
		transactionType ===
			"SUPPLIER_PAYMENT"
			? supplierOutstandingList
			: customerOutstandingList;

	return list.find(
		function(item) {

			return (
				Number(item.partyId) ===
				Number(partyId)
			);
		}
	) || null;
}


function handlePaymentModeChange() {

	const mode =
		getValue(
			"paymentMode"
		);

	hideAllPaymentModeFields();

	const bankModes = [
		"BANK_TRANSFER",
		"NEFT",
		"RTGS",
		"IMPS"
	];

	if (
		bankModes.includes(mode)
	) {

		showPaymentModeField(
			"bankPaymentFields"
		);
	}

	if (mode === "CHEQUE") {

		showPaymentModeField(
			"chequePaymentFields"
		);
	}

	if (mode === "UPI") {

		showPaymentModeField(
			"upiPaymentFields"
		);
	}
}


function hideAllPaymentModeFields() {

	[
		"bankPaymentFields",
		"chequePaymentFields",
		"upiPaymentFields"
	].forEach(
		function(id) {

			const element =
				document.getElementById(id);

			if (element) {

				element.classList.remove(
					"active"
				);
			}
		}
	);
}


function showPaymentModeField(
	id
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.classList.add(
			"active"
		);
	}
}


async function savePaymentTransaction() {

	if (isSavingPayment) {
		return;
	}

	if (!paymentPermissions.create) {

		showMsg(
			"You do not have permission to create payment transactions."
		);

		return;
	}

	const payload =
		buildPaymentPayload();

	const validationMessage =
		validatePaymentPayload(
			payload
		);

	if (validationMessage) {

		showMsg(
			validationMessage
		);

		return;
	}

	isSavingPayment = true;

	setButtonLoading(
		"savePaymentBtn",
		"Saving Transaction...",
		true
	);

	const result =
		await paymentApiRequest(
			`${API_BASE}/saas/payments`,
			{
				method: "POST",

				headers: {
					"Content-Type":
						"application/json"
				},

				body:
					JSON.stringify(payload)
			}
		);

	isSavingPayment = false;

	setButtonLoading(
		"savePaymentBtn",
		"Save Transaction",
		false
	);

	if (!result.ok) {

		showMsg(
			getPaymentErrorMessage(
				result.data,
				"Unable to save payment transaction."
			)
		);

		return;
	}

	const transactionName =
		payload.transactionType ===
			"SUPPLIER_PAYMENT"
			? "Supplier payment"
			: "Customer receipt";

	showMsg(
		`${transactionName} saved successfully.`,
		"success"
	);

	clearPaymentForm();

	closePaymentForm();

	await Promise.all([
		loadPaymentSummary(),
		loadPayments(),
		loadAllOutstandingParties()
	]);
}


function buildPaymentPayload() {

	const paymentMode =
		getValue(
			"paymentMode"
		);

	let bankName =
		getValue(
			"paymentBankName"
		);

	if (paymentMode === "CHEQUE") {

		bankName =
			getValue(
				"paymentChequeBankName"
			);
	}

	return {

		tenantId:
			Number(
				localStorage.getItem(
					"tenantId"
				)
			),

		transactionType:
			getSelectedPaymentTransactionType(),

		partyId:
			getNumberValue(
				"paymentPartyId"
			),

		paymentDate:
			getValue(
				"paymentDate"
			) || null,

		amount:
			getNumberValue(
				"paymentAmount"
			),

		paymentMode:
			paymentMode,

		referenceNumber:
			getValue(
				"paymentReferenceNumber"
			),

		bankName:
			bankName,

		chequeNumber:
			getValue(
				"paymentChequeNumber"
			),

		chequeDate:
			getValue(
				"paymentChequeDate"
			) || null,

		upiTransactionId:
			getValue(
				"paymentUpiTransactionId"
			),

		referenceType:
			getValue(
				"paymentReferenceType"
			),

		referenceId:
			getOptionalNumberValue(
				"paymentReferenceId"
			),

		remarks:
			getValue(
				"paymentRemarks"
			)
	};
}


function validatePaymentPayload(
	payload
) {

	if (!payload.transactionType) {

		return "Payment transaction type is required.";
	}

	if (!payload.partyId) {

		return payload.transactionType ===
			"SUPPLIER_PAYMENT"
			? "Please select supplier."
			: "Please select customer.";
	}

	if (!payload.paymentDate) {

		return "Payment date is required.";
	}

	if (
		!payload.amount ||
		payload.amount <= 0
	) {

		return "Amount must be greater than 0.";
	}

	const party =
		getSelectedOutstandingParty();

	if (!party) {

		return "Selected outstanding party was not found.";
	}

	const outstanding =
		Number(
			party.outstandingAmount || 0
		);

	if (
		payload.amount >
		outstanding
	) {

		return (
			"Amount cannot exceed outstanding balance. " +
			`Outstanding: ${formatCurrency(outstanding)}`
		);
	}

	if (!payload.paymentMode) {

		return "Please select payment mode.";
	}

	const bankModes = [
		"BANK_TRANSFER",
		"NEFT",
		"RTGS",
		"IMPS"
	];

	if (
		bankModes.includes(
			payload.paymentMode
		) &&
		!payload.referenceNumber
	) {

		return "Bank reference number is required.";
	}

	if (
		payload.paymentMode === "CHEQUE"
	) {

		if (!payload.chequeNumber) {

			return "Cheque number is required.";
		}

		if (!payload.chequeDate) {

			return "Cheque date is required.";
		}

		if (!payload.bankName) {

			return "Cheque bank name is required.";
		}
	}

	if (
		payload.paymentMode === "UPI" &&
		!payload.upiTransactionId
	) {

		return "UPI transaction ID is required.";
	}

	if (
		payload.referenceType &&
		!payload.referenceId
	) {

		return "Reference ID is required when reference type is selected.";
	}

	if (
		!payload.referenceType &&
		payload.referenceId
	) {

		return "Reference type is required when reference ID is entered.";
	}

	return "";
}


function clearPaymentForm() {

	setDefaultPaymentDate();

	setValue(
		"paymentPartyId",
		""
	);

	setValue(
		"paymentAmount",
		"0"
	);

	setValue(
		"paymentMode",
		""
	);

	setValue(
		"paymentReferenceNumber",
		""
	);

	setValue(
		"paymentReferenceType",
		""
	);

	setValue(
		"paymentReferenceId",
		""
	);

	setValue(
		"paymentBankName",
		""
	);

	setValue(
		"paymentChequeNumber",
		""
	);

	setValue(
		"paymentChequeDate",
		""
	);

	setValue(
		"paymentChequeBankName",
		""
	);

	setValue(
		"paymentUpiTransactionId",
		""
	);

	setValue(
		"paymentRemarks",
		""
	);

	hideSelectedPaymentParty();

	handlePaymentModeChange();
}


function renderPayments(
	payments
) {

	const tbody =
		document.getElementById(
			"paymentTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(payments)
			? payments
			: [];

	if (!list.length) {

		tbody.innerHTML = `

			<tr>

				<td colspan="11">

					<div class="payment-state">

						<div class="payment-state-icon">

							<i class="bi bi-wallet2"></i>

						</div>

						<h5 class="fw-bold text-primary">
							No payment transactions found
						</h5>

						<p class="text-muted mb-0">
							Supplier payments and customer receipts will appear here.
						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(payment, index) {

				return `

					<tr>

						<td>

							<strong>
								${index + 1}
							</strong>

						</td>

						<td>

							<strong class="text-primary">

								${escapeHtml(
					payment.paymentNumber
				)}

							</strong>

							<div class="small text-muted">

								${formatDate(
					payment.paymentDate
				)}

							</div>

						</td>

						<td>

							${paymentTransactionTypeBadge(
					payment.transactionType
				)}

						</td>

						<td>

							<strong>

								${escapeHtml(
					payment.partyName
				)}

							</strong>

							<div class="small text-muted">

								${escapeHtml(
					payment.partyCode || "-"
				)}

							</div>

						</td>

						<td>

							<strong>

								${formatCurrency(
					payment.amount
				)}

							</strong>

						</td>

						<td>

							${formatPaymentMode(
					payment.paymentMode
				)}

						</td>

						<td>

							${escapeHtml(
					buildPaymentReferenceText(
						payment
					)
				)}

						</td>

						<td>

							${formatCurrency(
					payment.outstandingBefore
				)}

						</td>

						<td>

							<strong>

								${formatCurrency(
					payment.outstandingAfter
				)}

							</strong>

						</td>

						<td>

							${paymentStatusBadge(
					payment.paymentStatus
				)}

						</td>

						<td>

							<button type="button"
									class="btn btn-sm btn-outline-primary"
									onclick="showPaymentDetails(${Number(payment.id)})">

								<i class="bi bi-eye me-1"></i>
								View

							</button>

						</td>

					</tr>
				`;
			}
		)
			.join("");
}


async function showPaymentDetails(
	paymentId
) {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	showPaymentDetailsLoading();

	const result =
		await paymentApiRequest(
			`${API_BASE}/saas/payments/${encodeURIComponent(paymentId)}` +
			`?tenantId=${encodeURIComponent(tenantId)}`
		);

	if (!result.ok) {

		showMsg(
			getPaymentErrorMessage(
				result.data,
				"Unable to load payment details."
			)
		);

		return;
	}

	renderPaymentDetails(
		result.data || {}
	);

	if (paymentDetailsModal) {

		paymentDetailsModal.show();
	}
}


function renderPaymentDetails(
	payment
) {

	const content =
		document.getElementById(
			"paymentDetailsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="row g-3">

			${buildPaymentDetailCard(
		"Payment Number",
		escapeHtml(
			payment.paymentNumber || "-"
		)
	)}

			${buildPaymentDetailCard(
		"Payment Date",
		formatDate(
			payment.paymentDate
		)
	)}

			${buildPaymentDetailCard(
		"Transaction",
		formatTransactionType(
			payment.transactionType
		)
	)}

			${buildPaymentDetailCard(
		"Party Type",
		formatEnumText(
			payment.partyType
		)
	)}

			${buildPaymentDetailCard(
		"Party Name",
		escapeHtml(
			payment.partyName || "-"
		)
	)}

			${buildPaymentDetailCard(
		"Party Code",
		escapeHtml(
			payment.partyCode || "-"
		)
	)}

			${buildPaymentDetailCard(
		"Amount",
		formatCurrency(
			payment.amount
		)
	)}

			${buildPaymentDetailCard(
		"Payment Mode",
		formatPaymentMode(
			payment.paymentMode
		)
	)}

			${buildPaymentDetailCard(
		"Reference Number",
		escapeHtml(
			payment.referenceNumber || "-"
		)
	)}

			${buildPaymentDetailCard(
		"Reference Type",
		formatEnumText(
			payment.referenceType
		)
	)}

			${buildPaymentDetailCard(
		"Reference ID",
		payment.referenceId || "-"
	)}

			${buildPaymentDetailCard(
		"Status",
		formatEnumText(
			payment.paymentStatus
		)
	)}

			${buildPaymentDetailCard(
		"Outstanding Before",
		formatCurrency(
			payment.outstandingBefore
		)
	)}

			${buildPaymentDetailCard(
		"Outstanding After",
		formatCurrency(
			payment.outstandingAfter
		)
	)}

			${buildPaymentDetailCard(
		"Bank Name",
		escapeHtml(
			payment.bankName || "-"
		)
	)}

			${buildPaymentDetailCard(
		"Cheque Number",
		escapeHtml(
			payment.chequeNumber || "-"
		)
	)}

			${buildPaymentDetailCard(
		"Cheque Date",
		formatDate(
			payment.chequeDate
		)
	)}

			${buildPaymentDetailCard(
		"UPI Transaction ID",
		escapeHtml(
			payment.upiTransactionId || "-"
		)
	)}

		</div>

		${payment.remarks
			? `
				<div class="payment-detail-card mt-3">

					<span class="payment-detail-label">
						Remarks
					</span>

					<div class="payment-detail-value">

						${escapeHtml(
				payment.remarks
			)}

					</div>

				</div>
			`
			: ""
		}
	`;
}


function buildPaymentDetailCard(
	label,
	value
) {

	return `

		<div class="col-md-4">

			<div class="payment-detail-card h-100">

				<span class="payment-detail-label">

					${escapeHtml(label)}

				</span>

				<div class="payment-detail-value">

					${value}

				</div>

			</div>

		</div>
	`;
}


function renderSupplierOutstanding(
	items
) {

	renderOutstandingTable(
		"supplierOutstandingTableBody",
		items,
		"SUPPLIER"
	);
}


function renderCustomerOutstanding(
	items
) {

	renderOutstandingTable(
		"customerOutstandingTableBody",
		items,
		"CUSTOMER"
	);
}


function renderOutstandingTable(
	tbodyId,
	items,
	partyType
) {

	const tbody =
		document.getElementById(
			tbodyId
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(items)
			? items
			: [];

	const partyName =
		partyType === "SUPPLIER"
			? "supplier"
			: "customer";

	if (!list.length) {

		tbody.innerHTML = `

			<tr>

				<td colspan="6">

					<div class="payment-state">

						<div class="payment-state-icon">

							<i class="bi bi-check-circle-fill"></i>

						</div>

						<h5 class="fw-bold text-primary">

							No ${partyName} outstanding

						</h5>

						<p class="text-muted mb-0">

							All ${partyName} balances are settled.

						</p>

					</div>

				</td>

			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(item, index) {

				const transactionType =
					partyType === "SUPPLIER"
						? "SUPPLIER_PAYMENT"
						: "CUSTOMER_RECEIPT";

				const actionLabel =
					partyType === "SUPPLIER"
						? "Pay"
						: "Receive";

				const actionIcon =
					partyType === "SUPPLIER"
						? "bi-arrow-up-circle"
						: "bi-arrow-down-circle";

				return `

					<tr>

						<td>

							<strong>
								${index + 1}
							</strong>

						</td>

						<td>

							${escapeHtml(
					item.partyCode || "-"
				)}

						</td>

						<td>

							<strong class="text-primary">

								${escapeHtml(
					item.partyName
				)}

							</strong>

						</td>

						<td>

							<strong>

								${formatCurrency(
					item.outstandingAmount
				)}

							</strong>

						</td>

						<td>

							${outstandingBalanceBadge(
					item.balanceType
				)}

						</td>

						<td>

							<div class="d-flex flex-wrap gap-2">

								<button type="button"
										class="btn btn-sm btn-outline-primary"
										onclick="showPartyLedger('${partyType}', ${Number(item.partyId)})">

									<i class="bi bi-journal-text me-1"></i>
									Statement

								</button>

								${paymentPermissions.create
						? `
										<button type="button"
												class="btn btn-sm btn-medi"
												onclick="openPaymentForParty('${transactionType}', ${Number(item.partyId)})">

											<i class="bi ${actionIcon} me-1"></i>
											${actionLabel}

										</button>
									`
						: ""
					}

							</div>

						</td>

					</tr>
				`;
			}
		)
			.join("");
}


function openPaymentForParty(
	transactionType,
	partyId
) {

	openPaymentForm(
		transactionType
	);

	setTimeout(
		function() {

			setValue(
				"paymentPartyId",
				String(partyId)
			);

			handlePaymentPartyChange();
		},
		50
	);
}


async function showPartyLedger(
	partyType,
	partyId
) {

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	showPartyLedgerLoading();

	if (partyLedgerModal) {

		partyLedgerModal.show();
	}

	const result =
		await paymentApiRequest(
			`${API_BASE}/saas/ledgers/party` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&partyType=${encodeURIComponent(partyType)}` +
			`&partyId=${encodeURIComponent(partyId)}`
		);

	if (!result.ok) {

		renderPartyLedgerError(
			getPaymentErrorMessage(
				result.data,
				"Unable to load party ledger."
			)
		);

		return;
	}

	renderPartyLedger(
		result.data || {}
	);
}


function renderPartyLedger(
	ledger
) {

	setText(
		"ledgerPartyTypeText",
		`${formatEnumText(ledger.partyType)} Statement`
	);

	setText(
		"ledgerPartyNameText",
		ledger.partyName || "Ledger Statement"
	);

	const content =
		document.getElementById(
			"partyLedgerContent"
		);

	if (!content) {
		return;
	}

	const entries =
		Array.isArray(
			ledger.entries
		)
			? ledger.entries
			: [];

	content.innerHTML = `

		<div class="ledger-summary-grid">

			<div class="payment-detail-card">

				<span class="payment-detail-label">
					Party Code
				</span>

				<div class="payment-detail-value">

					${escapeHtml(
		ledger.partyCode || "-"
	)}

				</div>

			</div>

			<div class="payment-detail-card">

				<span class="payment-detail-label">
					Total Debit
				</span>

				<div class="payment-detail-value">

					${formatCurrency(
		ledger.totalDebit
	)}

				</div>

			</div>

			<div class="payment-detail-card">

				<span class="payment-detail-label">
					Total Credit
				</span>

				<div class="payment-detail-value">

					${formatCurrency(
		ledger.totalCredit
	)}

				</div>

			</div>

			<div class="payment-detail-card">

				<span class="payment-detail-label">
					Closing Balance
				</span>

				<div class="payment-detail-value ledger-balance">

					${formatCurrency(
		ledger.closingBalance
	)}

					<div class="mt-2">

						${outstandingBalanceBadge(
		ledger.balanceType
	)}

					</div>

				</div>

			</div>

		</div>

		<div class="table-responsive payment-table-wrap">

			<table class="table table-hover align-middle">

				<thead>

					<tr>

						<th>#</th>
						<th>Date</th>
						<th>Entry Type</th>
						<th>Reference</th>
						<th>Narration</th>
						<th>Debit</th>
						<th>Credit</th>
						<th>Running Balance</th>
						<th>Balance Type</th>

					</tr>

				</thead>

				<tbody>

					${entries.length
			? entries.map(
				function(entry, index) {

					return `

									<tr>

										<td>
											${index + 1}
										</td>

										<td>

											${formatDate(
						entry.entryDate
					)}

										</td>

										<td>

											<strong>

												${formatEnumText(
						entry.entryType
					)}

											</strong>

										</td>

										<td>

											${escapeHtml(
						entry.referenceNumber || "-"
					)}

											<div class="small text-muted">

												${formatEnumText(
						entry.referenceType
					)}

											</div>

										</td>

										<td>

											${escapeHtml(
						entry.narration || "-"
					)}

										</td>

										<td>

											${Number(entry.debitAmount || 0) > 0
							? formatCurrency(entry.debitAmount)
							: "-"
						}

										</td>

										<td>

											${Number(entry.creditAmount || 0) > 0
							? formatCurrency(entry.creditAmount)
							: "-"
						}

										</td>

										<td>

											<strong>

												${formatCurrency(
							entry.runningBalance
						)}

											</strong>

										</td>

										<td>

											${outstandingBalanceBadge(
							entry.balanceType
						)}

										</td>

									</tr>
								`;
				}
			).join("")
			: `
							<tr>

								<td colspan="9">

									<div class="payment-state">

										<div class="payment-state-icon">

											<i class="bi bi-journal-x"></i>

										</div>

										<h5 class="fw-bold text-primary">
											No ledger entries found
										</h5>

									</div>

								</td>

							</tr>
						`
		}

				</tbody>

			</table>

		</div>
	`;
}


function showPaymentDetailsLoading() {

	const content =
		document.getElementById(
			"paymentDetailsContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="payment-state">

			<div class="spinner-border text-primary"
				 role="status">
			</div>

			<p class="text-muted mt-3 mb-0">
				Loading payment details...
			</p>

		</div>
	`;
}


function showPartyLedgerLoading() {

	setText(
		"ledgerPartyTypeText",
		"Party Statement"
	);

	setText(
		"ledgerPartyNameText",
		"Loading Ledger"
	);

	const content =
		document.getElementById(
			"partyLedgerContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="payment-state">

			<div class="spinner-border text-primary"
				 role="status">
			</div>

			<p class="text-muted mt-3 mb-0">
				Loading ledger statement...
			</p>

		</div>
	`;
}


function renderPartyLedgerError(
	message
) {

	const content =
		document.getElementById(
			"partyLedgerContent"
		);

	if (!content) {
		return;
	}

	content.innerHTML = `

		<div class="payment-state text-danger">

			<i class="bi bi-exclamation-triangle-fill fs-1"></i>

			<h5 class="fw-bold mt-3">
				Unable to load ledger
			</h5>

			<p class="text-muted mb-0">

				${escapeHtml(message)}

			</p>

		</div>
	`;
}


function showPaymentLoadingState() {

	const tbody =
		document.getElementById(
			"paymentTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="11">

				<div class="payment-state">

					<div class="spinner-border text-primary"
						 role="status">
					</div>

					<p class="text-muted mt-3 mb-0">
						Loading payment transactions...
					</p>

				</div>

			</td>

		</tr>
	`;
}


function showPaymentErrorState(
	message
) {

	const tbody =
		document.getElementById(
			"paymentTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="11">

				<div class="payment-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<h5 class="fw-bold mt-3">
						Unable to load payments
					</h5>

					<p class="text-muted mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


function showOutstandingTableError(
	partyType,
	message
) {

	const tbodyId =
		partyType === "SUPPLIER"
			? "supplierOutstandingTableBody"
			: "customerOutstandingTableBody";

	const tbody =
		document.getElementById(
			tbodyId
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `

		<tr>

			<td colspan="6">

				<div class="payment-state text-danger">

					<i class="bi bi-exclamation-triangle-fill fs-1"></i>

					<p class="text-muted mt-3 mb-0">

						${escapeHtml(message)}

					</p>

				</div>

			</td>

		</tr>
	`;
}


function getSelectedPaymentTransactionType() {

	const selected =
		document.querySelector(
			'input[name="paymentTransactionType"]:checked'
		);

	return selected
		? selected.value
		: "SUPPLIER_PAYMENT";
}


function paymentTransactionTypeBadge(
	transactionType
) {

	if (
		String(transactionType || "")
			.toUpperCase() ===
		"CUSTOMER_RECEIPT"
	) {

		return `

			<span class="payment-transaction-type customer">

				<i class="bi bi-arrow-down-left-circle-fill"></i>
				Customer Receipt

			</span>
		`;
	}

	return `

		<span class="payment-transaction-type supplier">

			<i class="bi bi-arrow-up-right-circle-fill"></i>
			Supplier Payment

		</span>
	`;
}


function paymentStatusBadge(
	status
) {

	if (
		String(status || "")
			.toUpperCase() ===
		"CANCELLED"
	) {

		return `

			<span class="payment-status cancelled">

				<i class="bi bi-x-circle-fill"></i>
				Cancelled

			</span>
		`;
	}

	return `

		<span class="payment-status">

			<i class="bi bi-check-circle-fill"></i>
			Posted

		</span>
	`;
}


function outstandingBalanceBadge(
	balanceType
) {

	const normalized =
		String(balanceType || "")
			.trim()
			.toUpperCase();

	if (normalized === "DEBIT") {

		return `

			<span class="payment-outstanding-chip debit">

				<i class="bi bi-arrow-up-circle-fill"></i>
				Debit

			</span>
		`;
	}

	if (normalized === "CREDIT") {

		return `

			<span class="payment-outstanding-chip credit">

				<i class="bi bi-arrow-down-circle-fill"></i>
				Credit

			</span>
		`;
	}

	return `

		<span class="payment-outstanding-chip settled">

			<i class="bi bi-check-circle-fill"></i>
			Settled

		</span>
	`;
}


function buildPaymentReferenceText(
	payment
) {

	const values = [
		payment.referenceNumber,
		payment.referenceNumberSnapshot
	];

	const reference =
		values.find(
			function(value) {

				return Boolean(
					String(value || "").trim()
				);
			}
		);

	if (reference) {
		return reference;
	}

	if (
		payment.referenceType &&
		payment.referenceId
	) {

		return (
			`${formatEnumText(payment.referenceType)} ` +
			`#${payment.referenceId}`
		);
	}

	return "-";
}


function formatTransactionType(
	value
) {

	if (
		String(value || "")
			.toUpperCase() ===
		"CUSTOMER_RECEIPT"
	) {

		return "Customer Receipt";
	}

	if (
		String(value || "")
			.toUpperCase() ===
		"SUPPLIER_PAYMENT"
	) {

		return "Supplier Payment";
	}

	return formatEnumText(value);
}


function formatPaymentMode(
	value
) {

	switch (
	String(value || "")
		.toUpperCase()
	) {

		case "UPI":
			return "UPI";

		case "NEFT":
			return "NEFT";

		case "RTGS":
			return "RTGS";

		case "IMPS":
			return "IMPS";

		default:
			return formatEnumText(value);
	}
}


function formatEnumText(
	value
) {

	if (!value) {
		return "-";
	}

	return String(value)
		.toLowerCase()
		.replace(
			/_/g,
			" "
		)
		.replace(
			/\b\w/g,
			function(character) {

				return character.toUpperCase();
			}
		);
}


async function paymentApiRequest(
	url,
	options = {}
) {

	const token =
		localStorage.getItem(
			"token"
		);

	const headers = {

		"Accept":
			"application/json",

		...(options.headers || {})
	};

	if (token) {

		headers.Authorization =
			"Bearer " + token;
	}

	try {

		const response =
			await fetch(
				url,
				{
					...options,
					headers
				}
			);

		const data =
			await readPaymentResponse(
				response
			);

		return {
			ok: response.ok,
			status: response.status,
			data
		};

	} catch (error) {

		console.error(
			"Payment API error:",
			error
		);

		return {
			ok: false,
			status: 0,
			data: {
				message:
					"Payment service is not reachable."
			}
		};
	}
}


async function readPaymentResponse(
	response
) {

	try {

		const text =
			await response.text();

		if (!text.trim()) {
			return {};
		}

		try {

			return JSON.parse(text);

		} catch (error) {

			return {
				message: text
			};
		}

	} catch (error) {

		return {};
	}
}


function normalizeArrayResponse(
	data
) {

	if (Array.isArray(data)) {
		return data;
	}

	if (
		data &&
		Array.isArray(data.content)
	) {
		return data.content;
	}

	if (
		data &&
		Array.isArray(data.data)
	) {
		return data.data;
	}

	if (
		data &&
		Array.isArray(data.items)
	) {
		return data.items;
	}

	if (
		data &&
		Array.isArray(data.results)
	) {
		return data.results;
	}

	return [];
}


function getPaymentErrorMessage(
	data,
	fallback
) {

	if (!data) {
		return fallback;
	}

	if (
		typeof data === "string"
	) {
		return data;
	}

	if (
		Array.isArray(data.errors) &&
		data.errors.length
	) {

		return data.errors
			.map(
				function(error) {

					return (
						error.defaultMessage ||
						error.message ||
						String(error)
					);
				}
			)
			.join(", ");
	}

	return (
		data.message ||
		data.error ||
		data.detail ||
		fallback
	);
}


function getTodayDateString() {

	const now =
		new Date();

	const localDate =
		new Date(
			now.getTime() -
			now.getTimezoneOffset() *
			60000
		);

	return localDate
		.toISOString()
		.substring(0, 10);
}


function getNumberValue(
	id
) {

	const value =
		Number(
			getValue(id)
		);

	return Number.isFinite(value)
		? value
		: 0;
}


function getOptionalNumberValue(
	id
) {

	const raw =
		getValue(id);

	if (!raw) {
		return null;
	}

	const value =
		Number(raw);

	return Number.isFinite(value)
		? value
		: null;
}


function getValue(
	id
) {

	const element =
		document.getElementById(id);

	return element
		? String(
			element.value || ""
		).trim()
		: "";
}


function setValue(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	element.value =
		value === null ||
			value === undefined
			? ""
			: value;
}


function setText(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	element.textContent =
		value === null ||
			value === undefined
			? ""
			: value;
}


function showOrHideById(
	id,
	visible
) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	element.style.display =
		visible
			? ""
			: "none";
}


function setButtonLoading(
	buttonId,
	loadingText,
	isLoading
) {

	const button =
		document.getElementById(
			buttonId
		);

	if (!button) {
		return;
	}

	if (isLoading) {

		if (!button.dataset.originalHtml) {

			button.dataset.originalHtml =
				button.innerHTML;
		}

		button.innerHTML = `

			<span class="spinner-border spinner-border-sm me-2"
				  aria-hidden="true">
			</span>

			${escapeHtml(loadingText)}
		`;

		button.disabled = true;

		return;
	}

	button.innerHTML =
		button.dataset.originalHtml ||
		button.innerHTML;

	button.disabled = false;
}


function setAnimatedNumber(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	const target =
		Number(value) || 0;

	const start =
		Number(
			element.textContent
		) || 0;

	const difference =
		target - start;

	const duration = 450;

	const startTime =
		performance.now();

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {

		element.textContent = target;

		return;
	}

	function update(
		currentTime
	) {

		const progress =
			Math.min(
				(currentTime - startTime) /
				duration,
				1
			);

		const eased =
			1 - Math.pow(
				1 - progress,
				3
			);

		element.textContent =
			Math.round(
				start +
				difference *
				eased
			);

		if (progress < 1) {

			requestAnimationFrame(
				update
			);
		}
	}

	requestAnimationFrame(
		update
	);
}


function numberToFixed(
	value
) {

	const number =
		Number(value || 0);

	return Number.isFinite(number)
		? number.toFixed(2)
		: "0.00";
}


function formatTenantType(
	value
) {

	switch (
	String(value || "")
		.trim()
		.toUpperCase()
	) {

		case "WHOLESALER":
			return "Wholesaler";

		case "RETAILER":
			return "Retailer";

		default:
			return "Workspace";
	}
}


function formatCurrency(
	value
) {

	return new Intl.NumberFormat(
		"en-IN",
		{
			style: "currency",
			currency: "INR",
			maximumFractionDigits: 2
		}
	).format(
		Number(value || 0)
	);
}


function formatDate(
	value
) {

	if (!value) {
		return "-";
	}

	const normalized =
		String(value)
			.substring(0, 10);

	const parts =
		normalized.split("-");

	if (parts.length !== 3) {
		return "-";
	}

	const year =
		Number(parts[0]);

	const month =
		Number(parts[1]);

	const day =
		Number(parts[2]);

	const date =
		new Date(
			year,
			month - 1,
			day
		);

	if (
		Number.isNaN(
			date.getTime()
		)
	) {
		return "-";
	}

	return date.toLocaleDateString(
		"en-IN"
	);
}


function showMsg(
	message,
	type = "danger"
) {

	const element =
		document.getElementById(
			"msg"
		);

	if (!element) {

		alert(message);

		return;
	}

	element.innerHTML = `

		<div class="alert alert-${escapeHtml(type)} alert-dismissible fade show"
			 role="alert">

			${escapeHtml(message)}

			<button type="button"
					class="btn-close"
					data-bs-dismiss="alert">
			</button>

		</div>
	`;

	window.scrollTo({
		top: 0,
		behavior: "smooth"
	});
}


function escapeHtml(
	value
) {

	return String(value ?? "")
		.replace(
			/&/g,
			"&amp;"
		)
		.replace(
			/</g,
			"&lt;"
		)
		.replace(
			/>/g,
			"&gt;"
		)
		.replace(
			/"/g,
			"&quot;"
		)
		.replace(
			/'/g,
			"&#039;"
		);
}