const API_BASE =
	"http://localhost:8080";

/*
const API_BASE =
	"https://medirevolution-api-gateway.onrender.com";
*/

let allMedicines = [];

let isLoadingMedicines = false;
let isSearchingMedicines = false;
let isSavingMedicine = false;

let medicinePermissions = {
	create: false,
	update: false,
	delete: false
};


document.addEventListener(
	"DOMContentLoaded",
	async function() {

		/*
		 * Page access, permissions aur enabled modules load karega.
		 */
		const allowed =
			await protectSaasPage(
				"MEDICINE_MASTER",
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

		/*
		 * IMPORTANT:
		 * Selected workspace type, enabled modules aur permissions
		 * ke according sidebar links filter karega.
		 *
		 * WHOLESALER workspace me Patients, Doctors, OPD, IPD,
		 * Pharmacy, Lab aur Radiology hide ho jayenge.
		 */
		if (
			typeof applySaasPermissionMenu ===
			"function"
		) {
			await applySaasPermissionMenu();
		}

		initializeMedicinePage();

		await applyMedicinePermissions();

		await loadMedicines();

		const searchInput =
			document.getElementById(
				"searchKeyword"
			);

		if (searchInput) {

			searchInput.addEventListener(
				"keyup",
				function(event) {

					if (
						event.key ===
						"Enter"
					) {

						event.preventDefault();

						searchMedicines();
					}
				}
			);
		}
	}
);

function initializeMedicinePage() {

	const tenantName =
		localStorage.getItem(
			"tenantName"
		) || "your workspace";

	const tenantType =
		normalizeTenantType(
			localStorage.getItem(
				"tenantType"
			)
		);

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


async function applyMedicinePermissions() {

	const [
		canCreate,
		canUpdate,
		canDelete
	] =
		await Promise.all([
			hasSaasPermission(
				"MEDICINE_MASTER",
				"CREATE"
			),

			hasSaasPermission(
				"MEDICINE_MASTER",
				"UPDATE"
			),

			hasSaasPermission(
				"MEDICINE_MASTER",
				"DELETE"
			)
		]);

	medicinePermissions = {
		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		delete:
			Boolean(canDelete)
	};

	showOrHideById(
		"addMedicineBtn",
		medicinePermissions.create
	);

	applyMedicineActionVisibility();
}


async function loadMedicines() {

	if (isLoadingMedicines) {
		return;
	}

	isLoadingMedicines = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showMedicineLoadingState();

	setButtonLoading(
		"refreshMedicineBtn",
		"Refreshing...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/medicine-master?tenantId=${encodeURIComponent(tenantId)}`,
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

			allMedicines = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load medicines."
				);

			showMsg(message);

			showMedicineErrorState(
				message
			);

			updateMedicineSummary();

			return;
		}

		allMedicines =
			Array.isArray(result)
				? result
				: [];

		renderMedicines(
			allMedicines
		);

		updateMedicineSummary();

	} catch (error) {

		console.error(
			"Load medicines error:",
			error
		);

		allMedicines = [];

		showMsg(
			"Medicine service is currently unavailable."
		);

		showMedicineErrorState(
			"Unable to connect with Medicine Master service."
		);

		updateMedicineSummary();

	} finally {

		isLoadingMedicines = false;

		setButtonLoading(
			"refreshMedicineBtn",
			"Refresh",
			false
		);
	}
}


async function searchMedicines() {

	if (isSearchingMedicines) {
		return;
	}

	const keyword =
		getValue(
			"searchKeyword"
		);

	if (!keyword) {

		await loadMedicines();

		return;
	}

	isSearchingMedicines = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showMedicineLoadingState();

	setButtonLoading(
		"searchMedicineBtn",
		"Searching...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/medicine-master/search` +
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
					"Unable to search medicines."
				);

			showMsg(message);

			showMedicineErrorState(
				message
			);

			return;
		}

		renderMedicines(
			Array.isArray(result)
				? result
				: []
		);

	} catch (error) {

		console.error(
			"Search medicine error:",
			error
		);

		showMsg(
			"Unable to search medicines."
		);

		showMedicineErrorState(
			"Medicine search service is unavailable."
		);

	} finally {

		isSearchingMedicines = false;

		setButtonLoading(
			"searchMedicineBtn",
			"Search",
			false
		);
	}
}


function openCreateMedicinePanel() {

	if (!medicinePermissions.create) {

		showMsg(
			"You do not have permission to create medicines."
		);

		return;
	}

	clearMedicineForm();

	setText(
		"medicineFormEyebrow",
		"New Master Record"
	);

	setText(
		"medicineFormTitle",
		"Add New Medicine"
	);

	openMedicinePanel();
}


function editMedicine(
	medicineId
) {

	if (!medicinePermissions.update) {

		showMsg(
			"You do not have permission to update medicines."
		);

		return;
	}

	const medicine =
		allMedicines.find(
			function(item) {

				return (
					Number(item.id) ===
					Number(medicineId)
				);
			}
		);

	if (!medicine) {

		showMsg(
			"Medicine record not found."
		);

		return;
	}

	setValue(
		"medicineId",
		medicine.id
	);

	setValue(
		"medicineName",
		medicine.medicineName
	);

	setValue(
		"brandName",
		medicine.brandName
	);

	setValue(
		"composition",
		medicine.composition
	);

	setValue(
		"manufacturer",
		medicine.manufacturer
	);

	setValue(
		"category",
		medicine.category
	);

	setValue(
		"medicineType",
		medicine.medicineType
	);

	setValue(
		"imageUrl",
		medicine.imageUrl
	);

	setValue(
		"description",
		medicine.description
	);

	setText(
		"medicineFormEyebrow",
		"Update Master Record"
	);

	setText(
		"medicineFormTitle",
		"Edit Medicine"
	);

	openMedicinePanel();
}


function openMedicinePanel() {

	const panel =
		document.getElementById(
			"medicineFormPanel"
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


function closeMedicinePanel() {

	const panel =
		document.getElementById(
			"medicineFormPanel"
		);

	if (panel) {

		panel.style.display =
			"none";
	}

	clearMedicineForm();
}


async function saveMedicine() {

	if (isSavingMedicine) {
		return;
	}

	const medicineId =
		getValue(
			"medicineId"
		);

	const isUpdate =
		medicineId !== "";

	if (
		isUpdate &&
		!medicinePermissions.update
	) {

		showMsg(
			"You do not have permission to update medicines."
		);

		return;
	}

	if (
		!isUpdate &&
		!medicinePermissions.create
	) {

		showMsg(
			"You do not have permission to create medicines."
		);

		return;
	}

	const payload = {

		medicineName:
			getValue(
				"medicineName"
			),

		brandName:
			getValue(
				"brandName"
			),

		composition:
			getValue(
				"composition"
			),

		manufacturer:
			getValue(
				"manufacturer"
			),

		category:
			getValue(
				"category"
			),

		medicineType:
			getValue(
				"medicineType"
			),

		imageUrl:
			getValue(
				"imageUrl"
			),

		description:
			getValue(
				"description"
			)
	};

	const validationMessage =
		validateMedicinePayload(
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

	const tenantId =
		localStorage.getItem("tenantId");

	const url =
		isUpdate
			? `${API_BASE}/saas/medicine-master/${encodeURIComponent(medicineId)}` +
			`?tenantId=${encodeURIComponent(tenantId)}`
			: `${API_BASE}/saas/medicine-master` +
			`?tenantId=${encodeURIComponent(tenantId)}`;

	const method =
		isUpdate
			? "PUT"
			: "POST";

	isSavingMedicine = true;

	setButtonLoading(
		"saveMedicineBtn",
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
					"Unable to save medicine."
				)
			);

			return;
		}

		showMsg(
			isUpdate
				? "Medicine updated successfully."
				: "Medicine added successfully.",
			"success"
		);

		closeMedicinePanel();

		await loadMedicines();

	} catch (error) {

		console.error(
			"Save medicine error:",
			error
		);

		showMsg(
			"Unable to connect with Medicine Master service."
		);

	} finally {

		isSavingMedicine = false;

		setButtonLoading(
			"saveMedicineBtn",
			"Save Medicine",
			false
		);
	}
}


async function deactivateMedicine(
	medicineId
) {

	if (!medicinePermissions.delete) {

		showMsg(
			"You do not have permission to deactivate medicines."
		);

		return;
	}

	if (
		!confirm(
			"Deactivate this medicine?"
		)
	) {
		return;
	}

	await changeMedicineStatus(
		medicineId,
		false
	);
}


async function activateMedicine(
	medicineId
) {

	if (!medicinePermissions.update) {

		showMsg(
			"You do not have permission to activate medicines."
		);

		return;
	}

	if (
		!confirm(
			"Activate this medicine?"
		)
	) {
		return;
	}

	await changeMedicineStatus(
		medicineId,
		true
	);
}


async function changeMedicineStatus(
	medicineId,
	active
) {

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const buttonId =
		active
			? `activateMedicineBtn_${medicineId}`
			: `deactivateMedicineBtn_${medicineId}`;

	const url =
		active
			? `${API_BASE}/saas/medicine-master/${medicineId}/activate` +
			`?tenantId=${encodeURIComponent(tenantId)}`
			: `${API_BASE}/saas/medicine-master/${medicineId}` +
			`?tenantId=${encodeURIComponent(tenantId)}`;

	const method =
		active
			? "PATCH"
			: "DELETE";

	setButtonLoading(
		buttonId,
		active
			? "Activating..."
			: "Deactivating...",
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
					active
						? "Unable to activate medicine."
						: "Unable to deactivate medicine."
				)
			);

			return;
		}

		showMsg(
			active
				? "Medicine activated successfully."
				: "Medicine deactivated successfully.",
			"success"
		);

		await loadMedicines();

	} catch (error) {

		console.error(
			"Change medicine status error:",
			error
		);

		showMsg(
			"Unable to update medicine status."
		);

	} finally {

		setButtonLoading(
			buttonId,
			active
				? "Activate"
				: "Deactivate",
			false
		);
	}
}


function renderMedicines(
	medicines
) {

	const tableBody =
		document.getElementById(
			"medicineTableBody"
		);

	if (!tableBody) {
		return;
	}

	const list =
		Array.isArray(medicines)
			? medicines
			: [];

	if (!list.length) {

		tableBody.innerHTML = `
			<tr>
				<td colspan="9">

					<div class="saas-medicine-state">

						<div class="saas-medicine-state-icon">
							<i class="bi bi-capsule-pill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No medicines found
						</h5>

						<p class="text-muted mb-0">
							Add a medicine or use a different search keyword.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tableBody.innerHTML =
		list.map(
			function(medicine, index) {

				const medicineId =
					Number(
						medicine.id
					);

				return `
					<tr>

						<td>
							<strong>
								${index + 1}
							</strong>
						</td>

						<td>

							<div class="saas-medicine-profile">

								<div class="saas-medicine-profile-icon">
									<i class="bi bi-capsule-pill"></i>
								</div>

								<div>

									<strong class="text-primary">
										${safe(medicine.medicineName)}
									</strong>

									<div class="small text-muted">
										${safe(medicine.description)}
									</div>

								</div>

							</div>

						</td>

						<td>
							${safe(medicine.brandName)}
						</td>

						<td>
							${safe(medicine.composition)}
						</td>

						<td>
							${safe(medicine.manufacturer)}
						</td>

						<td>
							<span class="saas-medicine-chip">
								${safe(medicine.category)}
							</span>
						</td>

						<td>
							<span class="saas-medicine-chip">
								${safe(medicine.medicineType)}
							</span>
						</td>

						<td>
							${medicineStatusBadge(medicine.active)}
						</td>

						<td>

							<div class="saas-medicine-actions">

								<button type="button"
										class="btn btn-sm btn-outline-primary edit-medicine-btn"
										onclick="editMedicine(${medicineId})">

									<i class="bi bi-pencil-square"></i>
									Edit

								</button>

								${medicine.active
						? `
										<button type="button"
												id="deactivateMedicineBtn_${medicineId}"
												class="btn btn-sm btn-outline-danger deactivate-medicine-btn"
												onclick="deactivateMedicine(${medicineId})">

											<i class="bi bi-x-circle"></i>
											Deactivate

										</button>
									`
						: `
										<button type="button"
												id="activateMedicineBtn_${medicineId}"
												class="btn btn-sm btn-outline-success activate-medicine-btn"
												onclick="activateMedicine(${medicineId})">

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

	applyMedicineActionVisibility();
}


function applyMedicineActionVisibility() {

	document
		.querySelectorAll(
			".edit-medicine-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					medicinePermissions.update
						? ""
						: "none";
			}
		);

	document
		.querySelectorAll(
			".activate-medicine-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					medicinePermissions.update
						? ""
						: "none";
			}
		);

	document
		.querySelectorAll(
			".deactivate-medicine-btn"
		)
		.forEach(
			function(button) {

				button.style.display =
					medicinePermissions.delete
						? ""
						: "none";
			}
		);
}


function updateMedicineSummary() {

	setAnimatedNumber(
		"totalMedicineCount",
		allMedicines.length
	);

	setAnimatedNumber(
		"activeMedicineCount",
		allMedicines.filter(
			function(medicine) {

				return (
					medicine.active === true
				);
			}
		).length
	);

	setAnimatedNumber(
		"inactiveMedicineCount",
		allMedicines.filter(
			function(medicine) {

				return (
					medicine.active !== true
				);
			}
		).length
	);

	const manufacturers =
		new Set(
			allMedicines
				.map(
					function(medicine) {

						return String(
							medicine.manufacturer || ""
						)
							.trim()
							.toLowerCase();
					}
				)
				.filter(Boolean)
		);

	setAnimatedNumber(
		"manufacturerCount",
		manufacturers.size
	);
}


function validateMedicinePayload(
	payload
) {

	if (!payload.medicineName) {
		return "Medicine name is required.";
	}

	if (!payload.brandName) {
		return "Brand name is required.";
	}

	if (!payload.composition) {
		return "Composition is required.";
	}

	if (!payload.manufacturer) {
		return "Manufacturer is required.";
	}

	if (!payload.category) {
		return "Category is required.";
	}

	if (!payload.medicineType) {
		return "Medicine type is required.";
	}

	return "";
}


async function refreshMedicines() {

	setValue(
		"searchKeyword",
		""
	);

	await loadMedicines();
}


function clearMedicineForm() {

	[
		"medicineId",
		"medicineName",
		"brandName",
		"composition",
		"manufacturer",
		"category",
		"medicineType",
		"imageUrl",
		"description"
	].forEach(
		function(id) {

			setValue(
				id,
				""
			);
		}
	);
}


function medicineStatusBadge(
	active
) {

	if (active === true) {

		return `
			<span class="saas-medicine-status active">

				<i class="bi bi-check-circle-fill"></i>
				Active

			</span>
		`;
	}

	return `
		<span class="saas-medicine-status inactive">

			<i class="bi bi-x-circle-fill"></i>
			Inactive

		</span>
	`;
}


function showMedicineLoadingState() {

	const tableBody =
		document.getElementById(
			"medicineTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="9">

				<div class="saas-medicine-state">

					<div class="saas-medicine-state-icon">
						<i class="bi bi-capsule-pill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading medicines
					</h5>

					<p class="text-muted mb-0">
						Please wait while medicine records are prepared.
					</p>

				</div>

			</td>
		</tr>
	`;
}


function showMedicineErrorState(
	message
) {

	const tableBody =
		document.getElementById(
			"medicineTableBody"
		);

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = `
		<tr>
			<td colspan="9">

				<div class="saas-medicine-state">

					<div class="saas-medicine-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load medicines
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}


function normalizeTenantType(
	value
) {

	return String(value || "")
		.trim()
		.toUpperCase();
}


function formatTenantType(
	value
) {

	switch (
	normalizeTenantType(value)
	) {

		case "WHOLESALER":
			return "Wholesaler";

		case "RETAILER":
			return "Retailer";

		default:
			return "Workspace";
	}
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

		if (
			!button.dataset.originalHtml
		) {

			button.dataset.originalHtml =
				button.innerHTML;
		}

		button.innerHTML = `
			<span class="spinner-border spinner-border-sm me-2"
				  aria-hidden="true">
			</span>

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

		element.innerText =
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