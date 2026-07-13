let medicineList = [];
let isLoadingMedicines = false;
let isSearchingMedicines = false;
let isSavingMedicine = false;

document.addEventListener("DOMContentLoaded", function() {
	allowOnlyMedicineMasterRoles();
	applyRoleBasedMenuForPage();
	loadMedicines();
});

function allowOnlyMedicineMasterRoles() {
	const role =
		localStorage.getItem("role");

	if (
		role !== "WHOLESALER" &&
		role !== "SUPER_ADMIN"
	) {
		alert(
			"Access denied. Only WHOLESALER or SUPER_ADMIN can access Medicine Master."
		);

		window.location.href =
			"/dashboard";
	}
}

function applyRoleBasedMenuForPage() {
	const role =
		localStorage.getItem("role");

	document
		.querySelectorAll("[data-role]")
		.forEach(
			function(item) {

				const allowedRoles =
					item
						.getAttribute("data-role")
						.split(" ");

				if (!allowedRoles.includes(role)) {
					item.style.display = "none";
				}

			}
		);
}

function openAddMedicinePanel() {
	const panel =
		document.getElementById(
			"addMedicinePanel"
		);

	if (!panel) {
		return;
	}

	panel.style.display = "block";

	window.setTimeout(
		function() {
			panel.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		},
		80
	);
}

function closeAddMedicinePanel() {
	const panel =
		document.getElementById(
			"addMedicinePanel"
		);

	if (panel) {
		panel.style.display = "none";
	}

	clearMedicineForm();
}

async function loadMedicines() {
	if (isLoadingMedicines) {
		return;
	}

	isLoadingMedicines = true;

	const token =
		localStorage.getItem("token");

	showMedicineLoadingState();

	try {
		const response =
			await fetch(
				`${API_BASE}/medicines`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			medicineList = [];

			showMedicineMessage(
				getErrorMessage(
					result,
					"Unable to load medicines"
				)
			);

			showMedicineErrorState(
				getErrorMessage(
					result,
					"Unable to load medicines"
				)
			);

			setSummaryValue(
				"totalMedicines",
				0
			);

			return;
		}

		medicineList =
			Array.isArray(result)
				? result
				: [];

		renderMedicines(
			medicineList
		);

	} catch (error) {
		console.error(
			"Load medicines error:",
			error
		);

		medicineList = [];

		showMedicineMessage(
			"Server not reachable. Please check medicine-service/api-gateway."
		);

		showMedicineErrorState(
			"Medicine service is currently unavailable."
		);

		setSummaryValue(
			"totalMedicines",
			0
		);

	} finally {
		isLoadingMedicines = false;
	}
}

function searchMedicinesOnEnter(event) {
	if (event.key === "Enter") {
		event.preventDefault();
		searchMedicines();
	}
}

async function searchMedicines() {
	if (isSearchingMedicines) {
		return;
	}

	const keyword =
		document
			.getElementById("searchKeyword")
			?.value
			.trim() || "";

	if (!keyword) {
		await loadMedicines();
		return;
	}

	const token =
		localStorage.getItem("token");

	isSearchingMedicines = true;

	showMedicineLoadingState();

	setButtonLoading(
		"searchMedicineMasterBtn",
		"Searching...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/medicines/search?keyword=${encodeURIComponent(keyword)}`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			medicineList = [];

			showMedicineMessage(
				getErrorMessage(
					result,
					"Search failed"
				)
			);

			showMedicineErrorState(
				getErrorMessage(
					result,
					"Search failed"
				)
			);

			setSummaryValue(
				"totalMedicines",
				0
			);

			return;
		}

		medicineList =
			Array.isArray(result)
				? result
				: [];

		renderMedicines(
			medicineList
		);

	} catch (error) {
		console.error(
			"Search medicines error:",
			error
		);

		medicineList = [];

		showMedicineMessage(
			"Server not reachable. Please try again."
		);

		showMedicineErrorState(
			"Medicine search service is currently unavailable."
		);

		setSummaryValue(
			"totalMedicines",
			0
		);

	} finally {
		isSearchingMedicines = false;

		setButtonLoading(
			"searchMedicineMasterBtn",
			"Search",
			false
		);
	}
}

async function resetMedicineSearch() {
	const input =
		document.getElementById(
			"searchKeyword"
		);

	if (input) {
		input.value = "";
	}

	await loadMedicines();
}

async function addMedicine() {
	if (isSavingMedicine) {
		return;
	}

	const data = {
		medicineName:
			getValue("medicineName"),

		brandName:
			getValue("brandName"),

		composition:
			getValue("composition"),

		manufacturer:
			getValue("manufacturer"),

		category:
			getValue("category"),

		medicineType:
			getValue("medicineType"),

		imageUrl:
			getValue("imageUrl"),

		description:
			getValue("description")
	};

	if (!data.medicineName) {
		showMedicineMessage(
			"Medicine name is required"
		);

		return;
	}

	if (!data.brandName) {
		showMedicineMessage(
			"Brand name is required"
		);

		return;
	}

	if (!data.composition) {
		showMedicineMessage(
			"Composition is required"
		);

		return;
	}

	if (!data.manufacturer) {
		showMedicineMessage(
			"Manufacturer is required"
		);

		return;
	}

	if (!data.category) {
		showMedicineMessage(
			"Category is required"
		);

		return;
	}

	if (!data.medicineType) {
		showMedicineMessage(
			"Medicine type is required"
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	isSavingMedicine = true;

	setButtonLoading(
		"saveMedicineBtn",
		"Saving Medicine...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/medicines`,
				{
					method: "POST",

					headers: {
						"Content-Type":
							"application/json",

						"Authorization":
							"Bearer " + token
					},

					body:
						JSON.stringify(data)
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showMedicineMessage(
				getErrorMessage(
					result,
					"Unable to add medicine"
				)
			);

			return;
		}

		showMedicineMessage(
			"Medicine added successfully",
			"success"
		);

		closeAddMedicinePanel();

		await loadMedicines();

	} catch (error) {
		console.error(
			"Add medicine error:",
			error
		);

		showMedicineMessage(
			"Server not reachable. Please try again."
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

function renderMedicines(medicines) {
	const table =
		document.getElementById(
			"medicineTable"
		);

	if (!table) {
		return;
	}

	const list =
		Array.isArray(medicines)
			? medicines
			: [];

	setSummaryValue(
		"totalMedicines",
		list.length
	);

	if (!list.length) {
		table.innerHTML = `
			<tr>
				<td colspan="8">

					<div class="medicine-state">

						<div class="medicine-state-icon">
							<i class="bi bi-capsule-pill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No medicines found
						</h5>

						<p class="text-muted mb-3">
							Add your first medicine master record or try another search.
						</p>

						<button type="button"
								class="btn btn-medi"
								style="width:auto;"
								onclick="openAddMedicinePanel()">

							<i class="bi bi-plus-circle-fill me-1"></i>
							Add Medicine
						</button>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	list.forEach(
		function(medicine, index) {

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>

						<div class="medicine-profile">

							<div class="medicine-profile-icon">
								<i class="bi bi-capsule-pill"></i>
							</div>

							<div>

								<strong class="text-primary">
									${safe(medicine.medicineName)}
								</strong>

								<div class="text-muted small">
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

						<span class="medicine-chip">
							<i class="bi bi-grid-fill"></i>
							${safe(medicine.category)}
						</span>

					</td>

					<td>

						<span class="medicine-chip">
							<i class="bi bi-ui-checks-grid"></i>
							${safe(medicine.medicineType)}
						</span>

					</td>

					<td>
						${medicineStatusBadge(medicine.active)}
					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;
}

function medicineStatusBadge(active) {
	if (active) {
		return `
			<span class="medicine-status-pill active">

				<i class="bi bi-check2-circle"></i>
				Active

			</span>
		`;
	}

	return `
		<span class="medicine-status-pill inactive">

			<i class="bi bi-x-circle"></i>
			Inactive

		</span>
	`;
}

function showMedicineLoadingState() {
	const table =
		document.getElementById(
			"medicineTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="medicine-state">

					<div class="medicine-state-icon medicine-loading-icon">
						<i class="bi bi-capsule-pill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading medicines
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare medicine master data.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showMedicineErrorState(message) {
	const table =
		document.getElementById(
			"medicineTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="medicine-state">

					<div class="medicine-state-icon bg-danger">
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

function clearMedicineForm() {
	[
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

			const element =
				document.getElementById(id);

			if (element) {
				element.value = "";
			}

		}
	);
}

function getValue(id) {
	const element =
		document.getElementById(id);

	return element
		? element.value.trim()
		: "";
}

function showMedicineMessage(
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

	setTimeout(
		function() {
			if (msg) {
				msg.innerHTML = "";
			}
		},
		3500
	);
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

function setSummaryValue(
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
		Number(element.textContent) || 0;

	const difference =
		target - start;

	const duration = 500;
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

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}