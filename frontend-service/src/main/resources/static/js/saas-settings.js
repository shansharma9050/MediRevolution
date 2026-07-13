document.addEventListener("DOMContentLoaded",async function() {
	  const allowed = await protectOwnerAdminPage();
    if (!allowed) return;
	
	const tenantId = localStorage.getItem("tenantId");
	const tenantName = localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	document.getElementById("tenantNameText").innerText = tenantName || "your workspace";
	
	await applySettingsButtonPermissions();

	loadSettings();
});

async function loadSettings() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	try {
		const response = await fetch(`${API_BASE}/saas/settings?tenantId=${tenantId}`, {
			headers: {
				"Authorization": "Bearer " + token
			}
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to load settings.");
			return;
		}

		fillSettings(result);

		if (result.themeColor) {
			document.documentElement.style.setProperty("--mr-navy", result.themeColor);
		}

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

async function applySettingsButtonPermissions() {
    const allowed = window.SAAS_OWNER_OR_ADMIN === true;
    showOrHideById("saveSettingsBtn", allowed);
}

async function saveSettings() {
	const token = localStorage.getItem("token");
	const tenantId = localStorage.getItem("tenantId");

	const payload = {
		tenantId: Number(tenantId),
		businessName: getValue("businessName"),
		businessType: getValue("businessType"),
		logoUrl: getValue("logoUrl"),
		address: getValue("address"),
		city: getValue("city"),
		state: getValue("state"),
		pincode: getValue("pincode"),
		country: getValue("country"),
		contactEmail: getValue("contactEmail"),
		contactMobile: getValue("contactMobile"),
		website: getValue("website"),
		gstNumber: getValue("gstNumber"),
		registrationNumber: getValue("registrationNumber"),
		themeColor: getValue("themeColor"),
		invoiceHeader: getValue("invoiceHeader"),
		invoiceFooter: getValue("invoiceFooter"),
		prescriptionHeader: getValue("prescriptionHeader"),
		prescriptionFooter: getValue("prescriptionFooter"),
		reportHeader: getValue("reportHeader"),
		reportFooter: getValue("reportFooter"),
		workingDays: getValue("workingDays"),
		openingTime: getValue("openingTime"),
		closingTime: getValue("closingTime")
	};

	if (!payload.businessName) {
		showMsg("Business name is required.");
		return;
	}

	try {
		const response = await fetch(`${API_BASE}/saas/settings`, {
			method: "PUT",
			headers: {
				"Authorization": "Bearer " + token,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		});

		const result = await safeJson(response);

		if (!response.ok) {
			showMsg(result.message || "Unable to save settings.");
			return;
		}

		localStorage.setItem("tenantName", result.businessName || payload.businessName);
		document.getElementById("tenantNameText").innerText = result.businessName || payload.businessName;

		if (result.themeColor) {
			document.documentElement.style.setProperty("--mr-navy", result.themeColor);
		}

		showMsg("Settings saved successfully.", "success");

	} catch (error) {
		console.error(error);
		showMsg("SaaS service not reachable.");
	}
}

function fillSettings(data) {
	setValue("businessName", data.businessName);
	setValue("businessType", data.businessType);
	setValue("logoUrl", data.logoUrl);
	setValue("address", data.address);
	setValue("city", data.city);
	setValue("state", data.state);
	setValue("pincode", data.pincode);
	setValue("country", data.country || "India");
	setValue("contactEmail", data.contactEmail);
	setValue("contactMobile", data.contactMobile);
	setValue("website", data.website);
	setValue("gstNumber", data.gstNumber);
	setValue("registrationNumber", data.registrationNumber);
	setValue("themeColor", data.themeColor || "#05285f");
	setValue("invoiceHeader", data.invoiceHeader);
	setValue("invoiceFooter", data.invoiceFooter);
	setValue("prescriptionHeader", data.prescriptionHeader);
	setValue("prescriptionFooter", data.prescriptionFooter);
	setValue("reportHeader", data.reportHeader);
	setValue("reportFooter", data.reportFooter);
	setValue("workingDays", data.workingDays);
	setValue("openingTime", data.openingTime);
	setValue("closingTime", data.closingTime);
}

function getValue(id) {
	const element = document.getElementById(id);
	return element ? element.value.trim() : "";
}

function setValue(id, value) {
	const element = document.getElementById(id);
	if (element) {
		element.value = value === null || value === undefined ? "" : value;
	}
}

async function safeJson(response) {
	try {
		return await response.json();
	} catch (e) {
		return {};
	}
}

function showMsg(message, type = "danger") {
	document.getElementById("msg").innerHTML =
		`<div class="alert alert-${type}">${message}</div>`;
}