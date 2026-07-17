let isLoadingSettings = false;
let isSavingSettings = false;

let settingsPagePermissions = {
	save: false
};

document.addEventListener("DOMContentLoaded", async function() {

	const allowed =
		await protectOwnerAdminPage();

	if (!allowed) {
		return;
	}

	const tenantId =
		localStorage.getItem("tenantId");

	const tenantName =
		localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	setText(
		"tenantNameText",
		tenantName || "your workspace"
	);

	await applySettingsButtonPermissions();
	await loadSettings();
});


async function loadSettings() {

	if (isLoadingSettings) {
		return;
	}

	isLoadingSettings = true;

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	showSettingsLoadingState();

	try {

		const response = await fetch(
			`${API_BASE}/saas/settings?tenantId=${encodeURIComponent(tenantId)}`,
			{
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
					"Unable to load settings."
				);

			showMsg(message);
			showSettingsErrorState(message);

			return;
		}

		fillSettings(result);
		updateSettingsSummary(result);
		applyThemeColor(result.themeColor);

		showSettingsForm();

	} catch (error) {

		console.error(
			"Unable to load settings:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

		showSettingsErrorState(
			"SaaS settings service is currently unavailable."
		);

	} finally {

		isLoadingSettings = false;
	}
}


async function applySettingsButtonPermissions() {

	const allowed =
		window.SAAS_OWNER_OR_ADMIN === true;

	settingsPagePermissions = {
		save:
			Boolean(allowed)
	};

	showOrHideById(
		"saveSettingsBtn",
		settingsPagePermissions.save
	);

	showOrHideById(
		"saveSettingsBottomBtn",
		settingsPagePermissions.save
	);

	showOrHideByClass(
		"save-settings-btn",
		settingsPagePermissions.save
	);
}


async function saveSettings() {

	if (isSavingSettings) {
		return;
	}

	if (!settingsPagePermissions.save) {

		showMsg(
			"You do not have permission to update settings."
		);

		return;
	}

	const token =
		localStorage.getItem("token");

	const tenantId =
		localStorage.getItem("tenantId");

	const payload = {
		tenantId:
			Number(tenantId),

		businessName:
			getValue("businessName"),

		businessType:
			getValue("businessType"),

		logoUrl:
			getValue("logoUrl"),

		address:
			getValue("address"),

		city:
			getValue("city"),

		state:
			getValue("state"),

		pincode:
			getValue("pincode"),

		country:
			getValue("country"),

		contactEmail:
			getValue("contactEmail"),

		contactMobile:
			getValue("contactMobile"),

		website:
			getValue("website"),

		gstNumber:
			getValue("gstNumber"),

		registrationNumber:
			getValue("registrationNumber"),

		themeColor:
			getValue("themeColor"),

		invoiceHeader:
			getValue("invoiceHeader"),

		invoiceFooter:
			getValue("invoiceFooter"),

		prescriptionHeader:
			getValue("prescriptionHeader"),

		prescriptionFooter:
			getValue("prescriptionFooter"),

		reportHeader:
			getValue("reportHeader"),

		reportFooter:
			getValue("reportFooter"),

		workingDays:
			getValue("workingDays"),

		openingTime:
			getValue("openingTime"),

		closingTime:
			getValue("closingTime")
	};

	if (!payload.businessName) {

		showMsg(
			"Business name is required."
		);

		return;
	}

	isSavingSettings = true;

	setButtonLoading(
		"saveSettingsBtn",
		"Saving...",
		true
	);

	setButtonLoading(
		"saveSettingsBottomBtn",
		"Saving...",
		true
	);

	try {

		const response = await fetch(
			`${API_BASE}/saas/settings`,
			{
				method: "PUT",

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
					"Unable to save settings."
				)
			);

			return;
		}

		const savedBusinessName =
			result.businessName ||
			payload.businessName;

		localStorage.setItem(
			"tenantName",
			savedBusinessName
		);

		setText(
			"tenantNameText",
			savedBusinessName
		);

		fillSettings({
			...payload,
			...result
		});

		updateSettingsSummary({
			...payload,
			...result
		});

		applyThemeColor(
			result.themeColor ||
			payload.themeColor
		);

		showMsg(
			"Settings saved successfully.",
			"success"
		);

	} catch (error) {

		console.error(
			"Unable to save settings:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {

		isSavingSettings = false;

		setButtonLoading(
			"saveSettingsBtn",
			"Save Settings",
			false
		);

		setButtonLoading(
			"saveSettingsBottomBtn",
			"Save Settings",
			false
		);
	}
}


function fillSettings(data) {

	setValue(
		"businessName",
		data.businessName
	);

	setValue(
		"businessType",
		data.businessType
	);

	setValue(
		"logoUrl",
		data.logoUrl
	);

	setValue(
		"address",
		data.address
	);

	setValue(
		"city",
		data.city
	);

	setValue(
		"state",
		data.state
	);

	setValue(
		"pincode",
		data.pincode
	);

	setValue(
		"country",
		data.country || "India"
	);

	setValue(
		"contactEmail",
		data.contactEmail
	);

	setValue(
		"contactMobile",
		data.contactMobile
	);

	setValue(
		"website",
		data.website
	);

	setValue(
		"gstNumber",
		data.gstNumber
	);

	setValue(
		"registrationNumber",
		data.registrationNumber
	);

	setValue(
		"themeColor",
		data.themeColor || "#05285f"
	);

	setValue(
		"invoiceHeader",
		data.invoiceHeader
	);

	setValue(
		"invoiceFooter",
		data.invoiceFooter
	);

	setValue(
		"prescriptionHeader",
		data.prescriptionHeader
	);

	setValue(
		"prescriptionFooter",
		data.prescriptionFooter
	);

	setValue(
		"reportHeader",
		data.reportHeader
	);

	setValue(
		"reportFooter",
		data.reportFooter
	);

	setValue(
		"workingDays",
		data.workingDays
	);

	setValue(
		"openingTime",
		data.openingTime
	);

	setValue(
		"closingTime",
		data.closingTime
	);

	previewThemeColor();
}


function updateSettingsSummary(data) {

	setText(
		"settingsBusinessNameSummary",
		data.businessName || "-"
	);

	setText(
		"settingsBusinessTypeSummary",
		data.businessType || "-"
	);

	const locationParts = [
		data.city,
		data.state,
		data.country
	]
		.filter(Boolean);

	setText(
		"settingsLocationSummary",
		locationParts.length
			? locationParts.join(", ")
			: "-"
	);

	const openingTime =
		data.openingTime || "-";

	const closingTime =
		data.closingTime || "-";

	setText(
		"settingsWorkingHoursSummary",
		`${openingTime} - ${closingTime}`
	);
}


function previewThemeColor() {

	const color =
		getValue("themeColor") ||
		"#05285f";

	const preview =
		document.getElementById(
			"themeColorPreview"
		);

	if (preview) {
		preview.style.setProperty(
			"--settings-preview-color",
			color
		);
	}
}


function applyThemeColor(color) {

	if (!color) {
		return;
	}

	document.documentElement.style.setProperty(
		"--mr-navy",
		color
	);
}


function showSettingsLoadingState() {

	const loadingState =
		document.getElementById(
			"settingsLoadingState"
		);

	const formContainer =
		document.getElementById(
			"settingsFormContainer"
		);

	if (loadingState) {
		loadingState.style.display = "";
	}

	if (formContainer) {
		formContainer.style.display = "none";
	}
}


function showSettingsForm() {

	const loadingState =
		document.getElementById(
			"settingsLoadingState"
		);

	const formContainer =
		document.getElementById(
			"settingsFormContainer"
		);

	if (loadingState) {
		loadingState.style.display = "none";
	}

	if (formContainer) {
		formContainer.style.display = "";
	}
}


function showSettingsErrorState(message) {

	const loadingState =
		document.getElementById(
			"settingsLoadingState"
		);

	const formContainer =
		document.getElementById(
			"settingsFormContainer"
		);

	if (formContainer) {
		formContainer.style.display = "none";
	}

	if (!loadingState) {
		return;
	}

	loadingState.style.display = "";

	loadingState.innerHTML = `
		<div class="saas-settings-state">

			<div class="saas-settings-state-icon bg-danger">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h5 class="fw-bold text-danger">
				Unable to load settings
			</h5>

			<p class="text-muted mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}


async function safeJson(response) {

	try {

		const text =
			await response.text();

		if (!text.trim()) {
			return {};
		}

		try {
			return JSON.parse(text);
		} catch (error) {
			return {};
		}

	} catch (error) {
		return {};
	}
}


function getApiErrorMessage(data, fallback) {

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
		5000
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

		if (!button.dataset.originalHtml) {
			button.dataset.originalHtml =
				button.innerHTML;
		}

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


function getValue(id) {

	const element =
		document.getElementById(id);

	return element
		? String(element.value || "").trim()
		: "";
}


function setValue(id, value) {

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


function setText(id, value) {

	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value ?? "";
	}
}


function escapeHtml(value) {

	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}