let supplierList = [];

let isLoadingSuppliers = false;
let isSearchingSuppliers = false;
let isSavingSupplier = false;

let supplierPermissions = {
	create: false,
	update: false,
	delete: false
};


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const allowed =
			await protectSaasPage(
				"SUPPLIERS",
				"VIEW"
			);

		if (!allowed) {
			return;
		}

		initializeSupplierPage();

		if (
			typeof applySaasPermissionMenu ===
			"function"
		) {
			await applySaasPermissionMenu();
		}

		await loadSupplierPermissions();

		await loadSuppliers();
	}
);

function initializeSupplierPage() {

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
		formatTenantType(tenantType)
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


async function loadSupplierPermissions() {

	const [
		canCreate,
		canUpdate,
		canDelete
	] = await Promise.all([

		hasSaasPermission(
			"SUPPLIERS",
			"CREATE"
		),

		hasSaasPermission(
			"SUPPLIERS",
			"UPDATE"
		),

		hasSaasPermission(
			"SUPPLIERS",
			"DELETE"
		)
	]);

	supplierPermissions = {
		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		delete:
			Boolean(canDelete)
	};

	showOrHideById(
		"addSupplierBtn",
		supplierPermissions.create
	);

	applySupplierActionVisibility();
}


async function loadSuppliers() {

	if (isLoadingSuppliers) {
		return;
	}

	isLoadingSuppliers = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showSupplierLoadingState();

	setButtonLoading(
		"refreshSupplierBtn",
		"Refreshing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/suppliers?tenantId=${encodeURIComponent(tenantId)}`,
			{
				method: "GET",

				headers: {
					"Authorization":
						"Bearer " + token,

					"Accept":
						"application/json"
				}
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			supplierList = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load suppliers."
				);

			showMsg(message);

			showSupplierErrorState(
				message
			);

			updateSupplierSummary();

			return;
		}

		supplierList =
			Array.isArray(result)
				? result
				: [];

		renderSuppliers(
			supplierList
		);

		updateSupplierSummary();

	} catch (error) {

		console.error(
			"Load suppliers error:",
			error
		);

		supplierList = [];

		showMsg(
			"Supplier service is currently unavailable."
		);

		showSupplierErrorState(
			"Unable to connect with supplier service."
		);

		updateSupplierSummary();

	} finally {

		isLoadingSuppliers = false;

		setButtonLoading(
			"refreshSupplierBtn",
			"Refresh",
			false
		);
	}
}


async function searchSuppliers() {

	if (isSearchingSuppliers) {
		return;
	}

	const keyword =
		getValue(
			"supplierSearchKeyword"
		);

	if (!keyword) {

		await loadSuppliers();

		return;
	}

	isSearchingSuppliers = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showSupplierLoadingState();

	setButtonLoading(
		"searchSupplierBtn",
		"Searching...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/suppliers/search` +
			`?tenantId=${encodeURIComponent(tenantId)}` +
			`&keyword=${encodeURIComponent(keyword)}`,
			{
				method: "GET",

				headers: {
					"Authorization":
						"Bearer " + token,

					"Accept":
						"application/json"
				}
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			const message =
				getApiErrorMessage(
					result,
					"Unable to search suppliers."
				);

			showMsg(message);

			showSupplierErrorState(
				message
			);

			return;
		}

		renderSuppliers(
			Array.isArray(result)
				? result
				: []
		);

	} catch (error) {

		console.error(
			"Search supplier error:",
			error
		);

		showMsg(
			"Unable to search suppliers."
		);

		showSupplierErrorState(
			"Supplier search service is unavailable."
		);

	} finally {

		isSearchingSuppliers = false;

		setButtonLoading(
			"searchSupplierBtn",
			"Search",
			false
		);
	}
}


function openCreateSupplierPanel() {

	if (!supplierPermissions.create) {

		showMsg(
			"You do not have permission to create suppliers."
		);

		return;
	}

	clearSupplierForm();

	setText(
		"supplierFormEyebrow",
		"New Supplier Record"
	);

	setText(
		"supplierFormTitle",
		"Add Supplier"
	);

	openSupplierPanel();
}


function editSupplier(
	supplierId
) {

	if (!supplierPermissions.update) {

		showMsg(
			"You do not have permission to update suppliers."
		);

		return;
	}

	const supplier =
		supplierList.find(
			function(item) {

				return (
					Number(item.id) ===
					Number(supplierId)
				);
			}
		);

	if (!supplier) {

		showMsg(
			"Supplier record not found."
		);

		return;
	}

	setValue(
		"supplierId",
		supplier.id
	);

	setValue(
		"supplierCode",
		supplier.supplierCode
	);

	setValue(
		"supplierName",
		supplier.supplierName
	);

	setValue(
		"contactPersonName",
		supplier.contactPersonName
	);

	setValue(
		"mobile",
		supplier.mobile
	);

	setValue(
		"email",
		supplier.email
	);

	setValue(
		"gstin",
		supplier.gstin
	);

	setValue(
		"drugLicenseNumber",
		supplier.drugLicenseNumber
	);

	setValue(
		"openingBalance",
		supplier.openingBalance ?? 0
	);

	setValue(
		"creditLimit",
		supplier.creditLimit ?? 0
	);

	setValue(
		"paymentTermsDays",
		supplier.paymentTermsDays ?? 0
	);

	setValue(
		"address",
		supplier.address
	);

	setValue(
		"city",
		supplier.city
	);

	setValue(
		"district",
		supplier.district
	);

	setValue(
		"state",
		supplier.state
	);

	setValue(
		"pincode",
		supplier.pincode
	);

	setText(
		"supplierFormEyebrow",
		"Update Supplier Record"
	);

	setText(
		"supplierFormTitle",
		"Edit Supplier"
	);

	openSupplierPanel();
}


function openSupplierPanel() {

	const panel =
		document.getElementById(
			"supplierFormPanel"
		);

	if (!panel) {
		return;
	}

	panel.style.display =
		"block";

	window.setTimeout(
		function() {

			panel.scrollIntoView({
				behavior:
					"smooth",

				block:
					"start"
			});
		},
		80
	);
}


function closeSupplierPanel() {

	const panel =
		document.getElementById(
			"supplierFormPanel"
		);

	if (panel) {

		panel.style.display =
			"none";
	}

	clearSupplierForm();
}


async function saveSupplier() {

	if (isSavingSupplier) {
		return;
	}

	const supplierId =
		getValue(
			"supplierId"
		);

	const isUpdate =
		supplierId !== "";

	if (
		isUpdate &&
		!supplierPermissions.update
	) {

		showMsg(
			"You do not have permission to update suppliers."
		);

		return;
	}

	if (
		!isUpdate &&
		!supplierPermissions.create
	) {

		showMsg(
			"You do not have permission to create suppliers."
		);

		return;
	}

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const payload = {

		tenantId:
			Number(tenantId),

		supplierCode:
			getValue(
				"supplierCode"
			),

		supplierName:
			getValue(
				"supplierName"
			),

		contactPersonName:
			getValue(
				"contactPersonName"
			),

		mobile:
			getValue(
				"mobile"
			),

		email:
			getValue(
				"email"
			),

		gstin:
			getValue(
				"gstin"
			),

		drugLicenseNumber:
			getValue(
				"drugLicenseNumber"
			),

		address:
			getValue(
				"address"
			),

		city:
			getValue(
				"city"
			),

		district:
			getValue(
				"district"
			),

		state:
			getValue(
				"state"
			),

		pincode:
			getValue(
				"pincode"
			),

		openingBalance:
			getNumberValue(
				"openingBalance"
			),

		creditLimit:
			getNumberValue(
				"creditLimit"
			),

		paymentTermsDays:
			getIntegerValue(
				"paymentTermsDays"
			)
	};

	const validationMessage =
		validateSupplierPayload(
			payload
		);

	if (validationMessage) {

		showMsg(
			validationMessage
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const url =
		isUpdate
			? `${API_BASE}/saas/suppliers/${encodeURIComponent(supplierId)}` +
			`?tenantId=${encodeURIComponent(tenantId)}`
			: `${API_BASE}/saas/suppliers`;

	const method =
		isUpdate
			? "PUT"
			: "POST";

	isSavingSupplier = true;

	setButtonLoading(
		"saveSupplierBtn",
		"Saving...",
		true
	);

	try {

		const response = await fetch(
			url,
			{
				method: method,

				headers: {
					"Authorization":
						"Bearer " + token,

					"Content-Type":
						"application/json",

					"Accept":
						"application/json"
				},

				body:
					JSON.stringify(payload)
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to save supplier."
				)
			);

			return;
		}

		showMsg(
			isUpdate
				? "Supplier updated successfully."
				: "Supplier added successfully.",
			"success"
		);

		closeSupplierPanel();

		await loadSuppliers();

	} catch (error) {

		console.error(
			"Save supplier error:",
			error
		);

		showMsg(
			"Unable to connect with supplier service."
		);

	} finally {

		isSavingSupplier = false;

		setButtonLoading(
			"saveSupplierBtn",
			"Save Supplier",
			false
		);
	}
}


async function deactivateSupplier(
	supplierId
) {

	if (!supplierPermissions.delete) {

		showMsg(
			"You do not have permission to deactivate suppliers."
		);

		return;
	}

	if (
		!confirm(
			"Deactivate this supplier?"
		)
	) {
		return;
	}

	await changeSupplierStatus(
		supplierId,
		false
	);
}


async function activateSupplier(
	supplierId
) {

	if (!supplierPermissions.update) {

		showMsg(
			"You do not have permission to activate suppliers."
		);

		return;
	}

	if (
		!confirm(
			"Activate this supplier?"
		)
	) {
		return;
	}

	await changeSupplierStatus(
		supplierId,
		true
	);
}


async function changeSupplierStatus(
	supplierId,
	active
) {

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const url =
		active
			? `${API_BASE}/saas/suppliers/${supplierId}/activate` +
			`?tenantId=${encodeURIComponent(tenantId)}`
			: `${API_BASE}/saas/suppliers/${supplierId}` +
			`?tenantId=${encodeURIComponent(tenantId)}`;

	const method =
		active
			? "PATCH"
			: "DELETE";

	try {

		const response = await fetch(
			url,
			{
				method: method,

				headers: {
					"Authorization":
						"Bearer " + token,

					"Accept":
						"application/json"
				}
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to update supplier status."
				)
			);

			return;
		}

		showMsg(
			active
				? "Supplier activated successfully."
				: "Supplier deactivated successfully.",
			"success"
		);

		await loadSuppliers();

	} catch (error) {

		console.error(
			"Supplier status error:",
			error
		);

		showMsg(
			"Unable to update supplier status."
		);
	}
}


function renderSuppliers(
	suppliers
) {

	const tableBody =
		document.getElementById(
			"supplierTableBody"
		);

	if (!tableBody) {
		return;
	}

	const list =
		Array.isArray(suppliers)
			? suppliers
			: [];

	if (!list.length) {

		tableBody.innerHTML = `
			<tr>
				<td colspan="9">

					<div class="supplier-state">

						<div class="supplier-state-icon">
							<i class="bi bi-truck-front-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No suppliers found
						</h5>

						<p class="text-muted mb-0">
							Add a supplier or use a different search keyword.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tableBody.innerHTML =
		list.map(
			function(supplier, index) {

				const supplierId =
					Number(supplier.id);

				return `
					<tr>

						<td>
							<strong>${index + 1}</strong>
						</td>

						<td>

							<div class="supplier-profile">

								<div class="supplier-profile-icon">
									<i class="bi bi-truck-front-fill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(supplier.supplierName)}
									</strong>

									<div class="small text-muted">
										${safe(supplier.supplierCode)}
									</div>

								</div>

							</div>

						</td>

						<td>
							<div>
								<strong>
									${safe(supplier.contactPersonName)}
								</strong>
							</div>

							<div class="small text-muted">
								${safe(supplier.mobile)}
							</div>

							<div class="small text-muted">
								${safe(supplier.email)}
							</div>
						</td>

						<td>
							<div>
								<span class="supplier-chip">
									${safe(supplier.gstin)}
								</span>
							</div>

							<div class="small text-muted mt-1">
								${safe(supplier.drugLicenseNumber)}
							</div>
						</td>

						<td>
							${safe(
					buildSupplierLocation(
						supplier
					)
				)}
						</td>

						<td>
							<strong>
								${formatCurrency(
					supplier.creditLimit
				)}
							</strong>
						</td>

						<td>
							${Number(
					supplier.paymentTermsDays || 0
				)} days
						</td>

						<td>
							${supplierStatusBadge(
					supplier.active
				)}
						</td>

						<td>

							<div class="supplier-actions">

								<button type="button"
										class="btn btn-sm btn-outline-primary edit-supplier-btn"
										onclick="editSupplier(${supplierId})">

									<i class="bi bi-pencil-square"></i>
									Edit

								</button>

								${supplier.active
						? `
										<button type="button"
												class="btn btn-sm btn-outline-danger deactivate-supplier-btn"
												onclick="deactivateSupplier(${supplierId})">

											<i class="bi bi-x-circle"></i>
											Deactivate

										</button>
									`
						: `
										<button type="button"
												class="btn btn-sm btn-outline-success activate-supplier-btn"
												onclick="activateSupplier(${supplierId})">

											<i class="bi bi-check-circle"></i>
											Activate

										</button>
									`
					}

							</div>

						</td>

					</tr>
				`;
			}
		)
			.join("");

	applySupplierActionVisibility();
}


function applySupplierActionVisibility() {

	document
		.querySelectorAll(
			".edit-supplier-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					supplierPermissions.update
						? ""
						: "none";
			}
		);

	document
		.querySelectorAll(
			".activate-supplier-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					supplierPermissions.update
						? ""
						: "none";
			}
		);

	document
		.querySelectorAll(
			".deactivate-supplier-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					supplierPermissions.delete
						? ""
						: "none";
			}
		);
}


function updateSupplierSummary() {

	setAnimatedNumber(
		"totalSupplierCount",
		supplierList.length
	);

	setAnimatedNumber(
		"activeSupplierCount",
		supplierList.filter(
			function(supplier) {

				return supplier.active === true;
			}
		).length
	);

	setAnimatedNumber(
		"gstSupplierCount",
		supplierList.filter(
			function(supplier) {

				return Boolean(
					String(
						supplier.gstin || ""
					).trim()
				);
			}
		).length
	);

	const totalCredit =
		supplierList.reduce(
			function(total, supplier) {

				return (
					total +
					Number(
						supplier.creditLimit || 0
					)
				);
			},
			0
		);

	const element =
		document.getElementById(
			"totalCreditLimit"
		);

	if (element) {

		element.textContent =
			formatCurrency(totalCredit);
	}
}


function validateSupplierPayload(
	payload
) {

	if (!payload.supplierCode) {
		return "Supplier code is required.";
	}

	if (!payload.supplierName) {
		return "Supplier name is required.";
	}

	if (
		payload.email &&
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/
			.test(payload.email)
	) {
		return "Please enter a valid email address.";
	}

	if (
		payload.openingBalance < 0
	) {
		return "Opening balance cannot be negative.";
	}

	if (
		payload.creditLimit < 0
	) {
		return "Credit limit cannot be negative.";
	}

	if (
		payload.paymentTermsDays < 0
	) {
		return "Payment terms cannot be negative.";
	}

	return "";
}


async function refreshSuppliers() {

	setValue(
		"supplierSearchKeyword",
		""
	);

	await loadSuppliers();
}


function clearSupplierForm() {

	[
		"supplierId",
		"supplierCode",
		"supplierName",
		"contactPersonName",
		"mobile",
		"email",
		"gstin",
		"drugLicenseNumber",
		"address",
		"city",
		"district",
		"state",
		"pincode"
	].forEach(
		function(id) {

			setValue(id, "");
		}
	);

	setValue(
		"openingBalance",
		"0"
	);

	setValue(
		"creditLimit",
		"0"
	);

	setValue(
		"paymentTermsDays",
		"0"
	);
}


function supplierStatusBadge(
	active
) {

	if (active === true) {

		return `
			<span class="supplier-status active">
				<i class="bi bi-check-circle-fill"></i>
				Active
			</span>
		`;
	}

	return `
		<span class="supplier-status inactive">
			<i class="bi bi-x-circle-fill"></i>
			Inactive
		</span>
	`;
}


function buildSupplierLocation(
	supplier
) {

	return [
		supplier.city,
		supplier.district,
		supplier.state,
		supplier.pincode
	]
		.filter(
			function(value) {

				return Boolean(
					String(value || "").trim()
				);
			}
		)
		.join(", ");
}


function showSupplierLoadingState() {

	const tableBody =
		document.getElementById(
			"supplierTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="9">

				<div class="supplier-state">

					<div class="supplier-state-icon">
						<i class="bi bi-truck-front-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading suppliers
					</h5>

					<p class="text-muted mb-0">
						Please wait while supplier records are prepared.
					</p>

				</div>

			</td>
		</tr>
	`;
}


function showSupplierErrorState(
	message
) {

	const tableBody =
		document.getElementById(
			"supplierTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="9">

				<div class="supplier-state">

					<div class="supplier-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load suppliers
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
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

	const amount =
		Number(value || 0);

	return new Intl.NumberFormat(
		"en-IN",
		{
			style:
				"currency",

			currency:
				"INR",

			maximumFractionDigits:
				2
		}
	).format(amount);
}


function showOrHideById(
	id,
	visible
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.style.display =
			visible
				? ""
				: "none";
	}
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
				  aria-hidden="true"></span>

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


async function safeJson(
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


function getApiErrorMessage(
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

	if (data.message) {
		return data.message;
	}

	if (data.error) {
		return data.error;
	}

	return fallback;
}


function showMsg(
	message,
	type = "danger"
) {

	const msg =
		document.getElementById("msg");

	if (!msg) {

		alert(message);

		return;
	}

	msg.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show"
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

	function update(currentTime) {

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
				difference * eased
			);

		if (progress < 1) {

			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
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


function getIntegerValue(
	id
) {

	const value =
		parseInt(
			getValue(id),
			10
		);

	return Number.isFinite(value)
		? value
		: 0;
}


function setValue(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.value =
			value === null ||
				value === undefined
				? ""
				: value;
	}
}


function setText(
	id,
	value
) {

	const element =
		document.getElementById(id);

	if (element) {

		element.textContent =
			value ?? "";
	}
}


function safe(
	value
) {

	return (
		value === null ||
		value === undefined ||
		value === ""
	)
		? "-"
		: escapeHtml(value);
}


function escapeHtml(
	value
) {

	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}