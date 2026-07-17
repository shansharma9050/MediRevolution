const API_BASE =
	"http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

let customerList = [];

let isLoadingCustomers = false;
let isSearchingCustomers = false;
let isSavingCustomer = false;

let customerPermissions = {
	create: false,
	update: false,
	delete: false
};


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		const allowed =
			await protectSaasPage(
				"CUSTOMERS",
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

		initializeCustomerPage();

		await loadCustomerPermissions();

		await loadCustomers();

		const searchInput =
			document.getElementById(
				"customerSearchKeyword"
			);

		if (searchInput) {

			searchInput.addEventListener(
				"keydown",
				function(event) {

					if (event.key === "Enter") {

						event.preventDefault();

						searchCustomers();
					}
				}
			);
		}
	}
);


function initializeCustomerPage() {

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


async function loadCustomerPermissions() {

	const [
		canCreate,
		canUpdate,
		canDelete
	] = await Promise.all([

		hasSaasPermission(
			"CUSTOMERS",
			"CREATE"
		),

		hasSaasPermission(
			"CUSTOMERS",
			"UPDATE"
		),

		hasSaasPermission(
			"CUSTOMERS",
			"DELETE"
		)
	]);

	customerPermissions = {
		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		delete:
			Boolean(canDelete)
	};

	showOrHideById(
		"addCustomerBtn",
		customerPermissions.create
	);

	applyCustomerActionVisibility();
}


async function loadCustomers() {

	if (isLoadingCustomers) {
		return;
	}

	isLoadingCustomers = true;

	const token =
		localStorage.getItem(
			"token"
		);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	showCustomerLoadingState();

	setButtonLoading(
		"refreshCustomerBtn",
		"Refreshing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/customers?tenantId=${encodeURIComponent(tenantId)}`,
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

			customerList = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load customers."
				);

			showMsg(message);

			showCustomerErrorState(
				message
			);

			updateCustomerSummary();

			return;
		}

		customerList =
			Array.isArray(result)
				? result
				: [];

		renderCustomers(
			customerList
		);

		updateCustomerSummary();

	} catch (error) {

		console.error(
			"Load customers error:",
			error
		);

		customerList = [];

		showMsg(
			"Customer service is currently unavailable."
		);

		showCustomerErrorState(
			"Unable to connect with customer service."
		);

		updateCustomerSummary();

	} finally {

		isLoadingCustomers = false;

		setButtonLoading(
			"refreshCustomerBtn",
			"Refresh",
			false
		);
	}
}


async function searchCustomers() {

	if (isSearchingCustomers) {
		return;
	}

	const keyword =
		getValue(
			"customerSearchKeyword"
		);

	if (!keyword) {

		await loadCustomers();

		return;
	}

	isSearchingCustomers = true;

	const token =
		localStorage.getItem(
			"token"
		);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	showCustomerLoadingState();

	setButtonLoading(
		"searchCustomerBtn",
		"Searching...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/customers/search` +
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
					"Unable to search customers."
				);

			showMsg(message);

			showCustomerErrorState(
				message
			);

			return;
		}

		renderCustomers(
			Array.isArray(result)
				? result
				: []
		);

	} catch (error) {

		console.error(
			"Search customer error:",
			error
		);

		showMsg(
			"Unable to search customers."
		);

		showCustomerErrorState(
			"Customer search service is unavailable."
		);

	} finally {

		isSearchingCustomers = false;

		setButtonLoading(
			"searchCustomerBtn",
			"Search",
			false
		);
	}
}


function openCreateCustomerPanel() {

	if (!customerPermissions.create) {

		showMsg(
			"You do not have permission to create customers."
		);

		return;
	}

	clearCustomerForm();

	setText(
		"customerFormEyebrow",
		"New Customer Record"
	);

	setText(
		"customerFormTitle",
		"Add Customer"
	);

	openCustomerPanel();
}


function editCustomer(
	customerId
) {

	if (!customerPermissions.update) {

		showMsg(
			"You do not have permission to update customers."
		);

		return;
	}

	const customer =
		customerList.find(
			function(item) {

				return (
					Number(item.id) ===
					Number(customerId)
				);
			}
		);

	if (!customer) {

		showMsg(
			"Customer record not found."
		);

		return;
	}

	setValue(
		"customerId",
		customer.id
	);

	setValue(
		"customerCode",
		customer.customerCode
	);

	setValue(
		"customerName",
		customer.customerName
	);

	setValue(
		"customerType",
		customer.customerType
	);

	setValue(
		"contactPersonName",
		customer.contactPersonName
	);

	setValue(
		"mobile",
		customer.mobile
	);

	setValue(
		"alternateMobile",
		customer.alternateMobile
	);

	setValue(
		"email",
		customer.email
	);

	setValue(
		"gstin",
		customer.gstin
	);

	setValue(
		"drugLicenseNumber",
		customer.drugLicenseNumber
	);

	setValue(
		"openingBalance",
		customer.openingBalance ?? 0
	);

	setValue(
		"creditLimit",
		customer.creditLimit ?? 0
	);

	setValue(
		"paymentTermsDays",
		customer.paymentTermsDays ?? 0
	);

	setValue(
		"discountPercentage",
		customer.discountPercentage ?? 0
	);

	setValue(
		"address",
		customer.address
	);

	setValue(
		"city",
		customer.city
	);

	setValue(
		"district",
		customer.district
	);

	setValue(
		"state",
		customer.state
	);

	setValue(
		"pincode",
		customer.pincode
	);

	setText(
		"customerFormEyebrow",
		"Update Customer Record"
	);

	setText(
		"customerFormTitle",
		"Edit Customer"
	);

	openCustomerPanel();
}


function openCustomerPanel() {

	const panel =
		document.getElementById(
			"customerFormPanel"
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


function closeCustomerPanel() {

	const panel =
		document.getElementById(
			"customerFormPanel"
		);

	if (panel) {

		panel.style.display =
			"none";
	}

	clearCustomerForm();
}


async function saveCustomer() {

	if (isSavingCustomer) {
		return;
	}

	const customerId =
		getValue(
			"customerId"
		);

	const isUpdate =
		customerId !== "";

	if (
		isUpdate &&
		!customerPermissions.update
	) {

		showMsg(
			"You do not have permission to update customers."
		);

		return;
	}

	if (
		!isUpdate &&
		!customerPermissions.create
	) {

		showMsg(
			"You do not have permission to create customers."
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

		customerCode:
			getValue(
				"customerCode"
			),

		customerName:
			getValue(
				"customerName"
			),

		customerType:
			getValue(
				"customerType"
			),

		contactPersonName:
			getValue(
				"contactPersonName"
			),

		mobile:
			getValue(
				"mobile"
			),

		alternateMobile:
			getValue(
				"alternateMobile"
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
			),

		discountPercentage:
			getNumberValue(
				"discountPercentage"
			)
	};

	const validationMessage =
		validateCustomerPayload(
			payload
		);

	if (validationMessage) {

		showMsg(
			validationMessage
		);

		return;
	}

	const token =
		localStorage.getItem(
			"token"
		);

	const url =
		isUpdate
			? `${API_BASE}/saas/customers/${encodeURIComponent(customerId)}` +
			`?tenantId=${encodeURIComponent(tenantId)}`
			: `${API_BASE}/saas/customers`;

	const method =
		isUpdate
			? "PUT"
			: "POST";

	isSavingCustomer = true;

	setButtonLoading(
		"saveCustomerBtn",
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
					JSON.stringify(
						payload
					)
			}
		);

		const result =
			await safeJson(response);

		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to save customer."
				)
			);

			return;
		}

		showMsg(
			isUpdate
				? "Customer updated successfully."
				: "Customer added successfully.",
			"success"
		);

		closeCustomerPanel();

		await loadCustomers();

	} catch (error) {

		console.error(
			"Save customer error:",
			error
		);

		showMsg(
			"Unable to connect with customer service."
		);

	} finally {

		isSavingCustomer = false;

		setButtonLoading(
			"saveCustomerBtn",
			"Save Customer",
			false
		);
	}
}


async function deactivateCustomer(
	customerId
) {

	if (!customerPermissions.delete) {

		showMsg(
			"You do not have permission to deactivate customers."
		);

		return;
	}

	if (
		!confirm(
			"Deactivate this customer?"
		)
	) {
		return;
	}

	await changeCustomerStatus(
		customerId,
		false
	);
}


async function activateCustomer(
	customerId
) {

	if (!customerPermissions.update) {

		showMsg(
			"You do not have permission to activate customers."
		);

		return;
	}

	if (
		!confirm(
			"Activate this customer?"
		)
	) {
		return;
	}

	await changeCustomerStatus(
		customerId,
		true
	);
}


async function changeCustomerStatus(
	customerId,
	active
) {

	const token =
		localStorage.getItem(
			"token"
		);

	const tenantId =
		localStorage.getItem(
			"tenantId"
		);

	const url =
		active
			? `${API_BASE}/saas/customers/${customerId}/activate` +
			`?tenantId=${encodeURIComponent(tenantId)}`
			: `${API_BASE}/saas/customers/${customerId}` +
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
					"Unable to update customer status."
				)
			);

			return;
		}

		showMsg(
			active
				? "Customer activated successfully."
				: "Customer deactivated successfully.",
			"success"
		);

		await loadCustomers();

	} catch (error) {

		console.error(
			"Customer status error:",
			error
		);

		showMsg(
			"Unable to update customer status."
		);
	}
}


function renderCustomers(
	customers
) {

	const tableBody =
		document.getElementById(
			"customerTableBody"
		);

	if (!tableBody) {
		return;
	}

	const list =
		Array.isArray(customers)
			? customers
			: [];

	if (!list.length) {

		tableBody.innerHTML = `
			<tr>
				<td colspan="10">

					<div class="customer-state">

						<div class="customer-state-icon">
							<i class="bi bi-people-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No customers found
						</h5>

						<p class="text-muted mb-0">
							Add a customer or use a different search keyword.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tableBody.innerHTML =
		list.map(
			function(customer, index) {

				const customerId =
					Number(
						customer.id
					);

				return `
					<tr>

						<td>
							<strong>
								${index + 1}
							</strong>
						</td>

						<td>

							<div class="customer-profile">

								<div class="customer-profile-icon">
									<i class="bi bi-person-fill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(customer.customerName)}
									</strong>

									<div class="small text-muted">
										${safe(customer.customerCode)}
									</div>

								</div>

							</div>

						</td>

						<td>

							<span class="customer-chip">

								<i class="bi bi-ui-checks-grid"></i>

								${safe(
					formatCustomerType(
						customer.customerType
					)
				)}

							</span>

						</td>

						<td>

							<div>
								<strong>
									${safe(customer.contactPersonName)}
								</strong>
							</div>

							<div class="small text-muted">
								${safe(customer.mobile)}
							</div>

							<div class="small text-muted">
								${safe(customer.email)}
							</div>

						</td>

						<td>

							<div>

								<span class="customer-chip">
									${safe(customer.gstin)}
								</span>

							</div>

							<div class="small text-muted mt-1">
								${safe(customer.drugLicenseNumber)}
							</div>

						</td>

						<td>
							${safe(
					buildCustomerLocation(
						customer
					)
				)}
						</td>

						<td>

							<strong>
								${formatCurrency(
					customer.creditLimit
				)}
							</strong>

							<div class="small text-muted">
								${Number(
					customer.paymentTermsDays || 0
				)} days
							</div>

						</td>

						<td>

							<span class="customer-chip">

								<i class="bi bi-percent"></i>

								${formatPercentage(
					customer.discountPercentage
				)}

							</span>

						</td>

						<td>
							${customerStatusBadge(
					customer.active
				)}
						</td>

						<td>

							<div class="customer-actions">

								<button type="button"
										class="btn btn-sm btn-outline-primary edit-customer-btn"
										onclick="editCustomer(${customerId})">

									<i class="bi bi-pencil-square"></i>
									Edit

								</button>

								${customer.active
						? `
										<button type="button"
												class="btn btn-sm btn-outline-danger deactivate-customer-btn"
												onclick="deactivateCustomer(${customerId})">

											<i class="bi bi-x-circle"></i>
											Deactivate

										</button>
									`
						: `
										<button type="button"
												class="btn btn-sm btn-outline-success activate-customer-btn"
												onclick="activateCustomer(${customerId})">

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

	applyCustomerActionVisibility();
}


function applyCustomerActionVisibility() {

	document
		.querySelectorAll(
			".edit-customer-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					customerPermissions.update
						? ""
						: "none";
			}
		);

	document
		.querySelectorAll(
			".activate-customer-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					customerPermissions.update
						? ""
						: "none";
			}
		);

	document
		.querySelectorAll(
			".deactivate-customer-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					customerPermissions.delete
						? ""
						: "none";
			}
		);
}


function updateCustomerSummary() {

	setAnimatedNumber(
		"totalCustomerCount",
		customerList.length
	);

	setAnimatedNumber(
		"activeCustomerCount",
		customerList.filter(
			function(customer) {

				return (
					customer.active === true
				);
			}
		).length
	);

	setAnimatedNumber(
		"gstCustomerCount",
		customerList.filter(
			function(customer) {

				return Boolean(
					String(
						customer.gstin || ""
					).trim()
				);
			}
		).length
	);

	const totalCredit =
		customerList.reduce(
			function(total, customer) {

				return (
					total +
					Number(
						customer.creditLimit || 0
					)
				);
			},
			0
		);

	const element =
		document.getElementById(
			"totalCustomerCreditLimit"
		);

	if (element) {

		element.textContent =
			formatCurrency(
				totalCredit
			);
	}
}


function validateCustomerPayload(
	payload
) {

	if (!payload.customerCode) {
		return "Customer code is required.";
	}

	if (!payload.customerName) {
		return "Customer name is required.";
	}

	if (!payload.customerType) {
		return "Customer type is required.";
	}

	if (
		payload.email &&
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/
			.test(payload.email)
	) {
		return "Please enter a valid email address.";
	}

	if (payload.openingBalance < 0) {
		return "Opening balance cannot be negative.";
	}

	if (payload.creditLimit < 0) {
		return "Credit limit cannot be negative.";
	}

	if (payload.paymentTermsDays < 0) {
		return "Payment terms cannot be negative.";
	}

	if (
		payload.discountPercentage < 0 ||
		payload.discountPercentage > 100
	) {
		return "Discount percentage must be between 0 and 100.";
	}

	return "";
}


async function refreshCustomers() {

	setValue(
		"customerSearchKeyword",
		""
	);

	await loadCustomers();
}


function clearCustomerForm() {

	[
		"customerId",
		"customerCode",
		"customerName",
		"customerType",
		"contactPersonName",
		"mobile",
		"alternateMobile",
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

			setValue(
				id,
				""
			);
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

	setValue(
		"discountPercentage",
		"0"
	);
}


function customerStatusBadge(
	active
) {

	if (active === true) {

		return `
			<span class="customer-status active">

				<i class="bi bi-check-circle-fill"></i>
				Active

			</span>
		`;
	}

	return `
		<span class="customer-status inactive">

			<i class="bi bi-x-circle-fill"></i>
			Inactive

		</span>
	`;
}


function formatCustomerType(
	value
) {

	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(
			/\b\w/g,
			function(character) {

				return character.toUpperCase();
			}
		);
}


function buildCustomerLocation(
	customer
) {

	return [
		customer.city,
		customer.district,
		customer.state,
		customer.pincode
	]
		.filter(
			function(value) {

				return Boolean(
					String(
						value || ""
					).trim()
				);
			}
		)
		.join(", ");
}


function showCustomerLoadingState() {

	const tableBody =
		document.getElementById(
			"customerTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="10">

				<div class="customer-state">

					<div class="customer-state-icon">
						<i class="bi bi-people-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading customers
					</h5>

					<p class="text-muted mb-0">
						Please wait while customer records are prepared.
					</p>

				</div>

			</td>
		</tr>
	`;
}


function showCustomerErrorState(
	message
) {

	const tableBody =
		document.getElementById(
			"customerTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="10">

				<div class="customer-state">

					<div class="customer-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load customers
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


function formatPercentage(
	value
) {

	const percentage =
		Number(value || 0);

	return `${percentage.toFixed(2)}%`;
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

		button.disabled =
			true;

		return;
	}

	button.innerHTML =
		button.dataset.originalHtml ||
		button.innerHTML;

	button.disabled =
		false;
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
		document.getElementById(
			"msg"
		);

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

	const duration =
		450;

	const startTime =
		performance.now();

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {

		element.textContent =
			target;

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
				difference * eased
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