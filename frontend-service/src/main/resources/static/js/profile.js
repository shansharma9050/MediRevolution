let currentProfile = null;
let currentLogoObjectUrl = null;

document.addEventListener("DOMContentLoaded", function() {
	applyRoleBasedMenuForProfile();
	setupProfileByRole();
	loadMyProfile();
});

function applyRoleBasedMenuForProfile() {
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

function setupProfileByRole() {
	const role =
		localStorage.getItem("role");

	const profileRole =
		document.getElementById(
			"profileRole"
		);

	if (profileRole) {
		profileRole.innerText =
			role || "-";
	}

	const allowed = [
		"WHOLESALER",
		"RETAILER",
		"DOCTOR",
		"HOSPITAL",
		"PATIENT"
	];

	if (!allowed.includes(role)) {
		alert(
			"Profile management is available for Wholesaler, Retailer, Doctor, Hospital and Patient only."
		);

		window.location.href =
			"/dashboard";

		return;
	}

	hideAllRoleFields();

	showElement("businessNameBlock");
	showElement("ownerNameBlock");
	showElement("drugLicenseBlock");
	showElement("gstBlock");
	hideElement("registrationBlock");
	hideElement("specializationBlock");
	showElement("bankDetailsBlock");
	showElement("documentBlock");
	showElement("contactPersonNameBlock");
	showElement("contactPersonMobileBlock");
	showElement("experienceYearsBlock");

	if (role === "WHOLESALER") {
		setText(
			"businessNameLabel",
			"Wholesaler Business Name"
		);
	}

	if (role === "RETAILER") {
		setText(
			"businessNameLabel",
			"Medical Store Name"
		);
	}

	if (role === "DOCTOR") {
		setText(
			"businessNameLabel",
			"Hospital / Clinic Name"
		);

		hideElement("drugLicenseBlock");
		hideElement("gstBlock");

		showElement("registrationBlock");
		showElement("specializationBlock");

		const specializationLabel =
			document.querySelector(
				"#specializationBlock label"
			);

		if (specializationLabel) {
			specializationLabel.innerText =
				"Specialization";
		}
	}

	if (role === "HOSPITAL") {
		setText(
			"businessNameLabel",
			"Hospital Name"
		);

		hideElement("drugLicenseBlock");

		showElement("registrationBlock");
		showElement("specializationBlock");

		const specializationLabel =
			document.querySelector(
				"#specializationBlock label"
			);

		if (specializationLabel) {
			specializationLabel.innerText =
				"Hospital Type";
		}
	}

	if (role === "PATIENT") {
		showFields("field-patient");

		hideElement("businessNameBlock");
		hideElement("ownerNameBlock");
		hideElement("drugLicenseBlock");
		hideElement("gstBlock");
		hideElement("registrationBlock");
		hideElement("specializationBlock");
		hideElement("bankDetailsBlock");
		hideElement("documentBlock");
		hideElement("contactPersonNameBlock");
		hideElement("contactPersonMobileBlock");
		hideElement("experienceYearsBlock");

		const pageSubtitle =
			document.querySelector(
				".mr-page-subtitle"
			);

		if (pageSubtitle) {
			pageSubtitle.innerText =
				"Manage your patient profile, medical history and emergency contact details.";
		}
	}
}

function hideAllRoleFields() {
	document
		.querySelectorAll(
			".field-wholesaler, .field-retailer, .field-doctor, .field-hospital, .field-patient"
		)
		.forEach(
			function(field) {
				field.style.display = "none";
			}
		);
}

function showFields(className) {
	document
		.querySelectorAll("." + className)
		.forEach(
			function(field) {
				field.style.display = "block";
			}
		);
}

function showElement(id) {
	const element =
		document.getElementById(id);

	if (element) {
		element.style.display = "block";
	}
}

function hideElement(id) {
	const element =
		document.getElementById(id);

	if (element) {
		element.style.display = "none";
	}
}

function setText(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.innerText = value;
	}
}

async function loadMyProfile() {
	const token =
		localStorage.getItem("token");

	const endpoint =
		getMyProfileEndpoint();

	if (!endpoint) {
		showProfileMessage(
			"Invalid role. Unable to load profile."
		);

		return;
	}

	setProfileLoading(true);

	try {
		const response =
			await fetch(
				`${API_BASE}${endpoint}`,
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
			currentProfile = null;

			showProfileMessage(
				"Profile not found. Please fill and save your profile.",
				"warning"
			);

			prefillBasicUser();
			return;
		}

		currentProfile = result;
		fillProfile(result || {});

	} catch (error) {
		console.error(
			"Load profile error:",
			error
		);

		showProfileMessage(
			"User service not reachable."
		);

	} finally {
		setProfileLoading(false);
	}
}

function fillForm(profile) {
	const role =
		localStorage.getItem("role");

	if (role === "WHOLESALER") {
		setValue(
			"businessName",
			profile.businessName
		);

		setValue(
			"ownerName",
			profile.ownerName
		);
	}

	if (role === "RETAILER") {
		setValue(
			"businessName",
			profile.storeName
		);

		setValue(
			"ownerName",
			profile.ownerName
		);
	}

	if (role === "DOCTOR") {
		setValue(
			"businessName",
			profile.clinicName
		);

		setValue(
			"ownerName",
			profile.doctorName
		);

		setValue(
			"experienceYears",
			profile.experienceYears
		);

		setValue(
			"registrationNumber",
			profile.registrationNumber
		);

		setValue(
			"specialization",
			profile.specialization
		);
	}

	if (role === "HOSPITAL") {
		setValue(
			"businessName",
			profile.hospitalName
		);

		setValue(
			"ownerName",
			profile.contactPersonName
		);

		setValue(
			"registrationNumber",
			profile.registrationNumber
		);

		setValue(
			"specialization",
			profile.hospitalType
		);
	}

	if (role === "PATIENT") {
		setValue(
			"patientName",
			profile.patientName
		);

		setValue(
			"gender",
			profile.gender
		);

		setValue(
			"dateOfBirth",
			profile.dateOfBirth
		);

		setValue(
			"bloodGroup",
			profile.bloodGroup
		);

		setValue(
			"medicalHistory",
			profile.medicalHistory
		);

		setValue(
			"emergencyContactName",
			profile.emergencyContactName
		);

		setValue(
			"emergencyContactMobile",
			profile.emergencyContactMobile
		);
	}

	setValue(
		"drugLicenseNumber",
		profile.drugLicenseNumber
	);

	setValue(
		"gstNumber",
		profile.gstNumber
	);

	setValue(
		"email",
		profile.email
	);

	setValue(
		"mobile",
		profile.mobile
	);

	setValue(
		"address",
		profile.address
	);

	setValue(
		"state",
		profile.state
	);

	setValue(
		"district",
		profile.district
	);

	setValue(
		"pincode",
		profile.pincode
	);

	setValue(
		"contactPersonName",
		profile.contactPersonName
	);

	setValue(
		"contactPersonMobile",
		profile.contactPersonMobile
	);

	setValue(
		"bankName",
		profile.bankName
	);

	setValue(
		"accountHolderName",
		profile.accountHolderName
	);

	setValue(
		"accountNumber",
		profile.accountNumber
	);

	setValue(
		"ifscCode",
		profile.ifscCode
	);

	setValue(
		"branchName",
		profile.branchName
	);

	setValue(
		"profileLogoUrl",
		profile.profileLogoUrl
	);

	setValue(
		"documentUrl",
		profile.documentUrl
	);

	updateProfilePreview(profile);
	updateLogoPreview();
	updateDocumentPreview();
}

function fillProfile(profile) {
	fillForm(profile);
}

function updateProfilePreview(profile = {}) {
	const profileNamePreview =
		document.getElementById(
			"profileNamePreview"
		);

	if (profileNamePreview) {
		profileNamePreview.innerText =
			getValue("patientName") ||
			getValue("businessName") ||
			getValue("ownerName") ||
			"MediRevolution Profile";
	}

	const profileEmailPreview =
		document.getElementById(
			"profileEmailPreview"
		);

	if (profileEmailPreview) {
		profileEmailPreview.innerText =
			getValue("email") ||
			localStorage.getItem("email") ||
			"";
	}

	const verificationStatus =
		document.getElementById(
			"verificationStatus"
		);

	if (verificationStatus) {
		const status =
			profile.verificationStatus ||
			"PENDING";

		verificationStatus.innerHTML = `
			<i class="bi ${status === "APPROVED" ? "bi-patch-check-fill" : "bi-hourglass-split"}"></i>
			${escapeHtml(status)}
		`;

		verificationStatus.className =
			"profile-verification-badge " +
			(
				status === "APPROVED"
					? "bg-success text-white"
					: status === "REJECTED"
						? "bg-danger text-white"
						: "bg-warning text-dark"
			);
	}
}

async function saveProfile() {
	const token =
		localStorage.getItem("token");

	if (!validateProfile()) {
		return false;
	}

	const payload =
		buildProfilePayload();

	const method =
		currentProfile
			? "PUT"
			: "POST";

	const endpoint =
		currentProfile
			? getUpdateProfileEndpoint()
			: getCreateProfileEndpoint();

	if (!endpoint) {
		showProfileMessage(
			"Invalid role. Unable to save profile."
		);

		return false;
	}

	setButtonLoading(
		"saveProfileBtn",
		currentProfile
			? "Updating Profile..."
			: "Saving Profile...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}${endpoint}`,
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
			showProfileMessage(
				getErrorMessage(
					result,
					"Unable to save profile"
				)
			);

			return false;
		}

		currentProfile = result || payload;

		fillProfile(
			currentProfile
		);

		showProfileMessage(
			"Profile saved successfully",
			"success"
		);

		return true;

	} catch (error) {
		console.error(
			"Save profile error:",
			error
		);

		showProfileMessage(
			"User service not reachable."
		);

		return false;

	} finally {
		setButtonLoading(
			"saveProfileBtn",
			"Save Profile",
			false
		);
	}
}

function buildProfilePayload() {
	const role =
		localStorage.getItem("role");

	if (role === "PATIENT") {
		return {
			patientName:
				getValue("patientName"),

			email:
				getValue("email"),

			mobile:
				getValue("mobile"),

			gender:
				getValue("gender"),

			dateOfBirth:
				getValue("dateOfBirth"),

			bloodGroup:
				getValue("bloodGroup"),

			address:
				getValue("address"),

			state:
				getValue("state"),

			district:
				getValue("district"),

			pincode:
				getValue("pincode"),

			medicalHistory:
				getValue("medicalHistory"),

			emergencyContactName:
				getValue("emergencyContactName"),

			emergencyContactMobile:
				getValue("emergencyContactMobile"),

			profileLogoUrl:
				getValue("profileLogoUrl")
		};
	}

	const payload = {
		email:
			getValue("email"),

		mobile:
			getValue("mobile"),

		address:
			getValue("address"),

		state:
			getValue("state"),

		district:
			getValue("district"),

		pincode:
			getValue("pincode"),

		contactPersonName:
			getValue("contactPersonName"),

		contactPersonMobile:
			getValue("contactPersonMobile"),

		bankName:
			getValue("bankName"),

		accountHolderName:
			getValue("accountHolderName"),

		accountNumber:
			getValue("accountNumber"),

		ifscCode:
			getValue("ifscCode"),

		branchName:
			getValue("branchName"),

		profileLogoUrl:
			getValue("profileLogoUrl"),

		documentUrl:
			getValue("documentUrl")
	};

	if (role === "WHOLESALER") {
		payload.businessName =
			getValue("businessName");

		payload.ownerName =
			getValue("ownerName");

		payload.drugLicenseNumber =
			getValue("drugLicenseNumber");

		payload.gstNumber =
			getValue("gstNumber");
	}

	if (role === "RETAILER") {
		payload.storeName =
			getValue("businessName");

		payload.ownerName =
			getValue("ownerName");

		payload.drugLicenseNumber =
			getValue("drugLicenseNumber");

		payload.gstNumber =
			getValue("gstNumber");
	}

	if (role === "DOCTOR") {
		payload.doctorName =
			getValue("ownerName") ||
			getValue("businessName");

		payload.clinicName =
			getValue("businessName");

		payload.registrationNumber =
			getValue("registrationNumber");

		payload.specialization =
			getValue("specialization");

		payload.experienceYears =
			toIntegerOrNull(
				getValue("experienceYears")
			);
	}

	if (role === "HOSPITAL") {
		payload.hospitalName =
			getValue("businessName");

		payload.registrationNumber =
			getValue("registrationNumber");

		payload.hospitalType =
			getValue("specialization");
	}

	return payload;
}

function validateProfile() {
	const role =
		localStorage.getItem("role");

	if (role === "PATIENT") {
		if (!getValue("patientName")) {
			showProfileMessage(
				"Patient name is required"
			);

			return false;
		}

		if (!getValue("email")) {
			showProfileMessage(
				"Email is required"
			);

			return false;
		}

		if (!getValue("mobile")) {
			showProfileMessage(
				"Mobile number is required"
			);

			return false;
		}

		if (!getValue("gender")) {
			showProfileMessage(
				"Gender is required"
			);

			return false;
		}

		if (!getValue("dateOfBirth")) {
			showProfileMessage(
				"Date of birth is required"
			);

			return false;
		}

		return true;
	}

	if (!getValue("businessName")) {
		showProfileMessage(
			"Business/Profile name is required"
		);

		return false;
	}

	if (!getValue("email")) {
		showProfileMessage(
			"Email is required"
		);

		return false;
	}

	return true;
}

function getCreateProfileEndpoint() {
	const role =
		localStorage.getItem("role");

	if (role === "WHOLESALER") {
		return "/users/profiles/wholesaler";
	}

	if (role === "RETAILER") {
		return "/users/profiles/retailer";
	}

	if (role === "DOCTOR") {
		return "/users/profiles/doctor";
	}

	if (role === "HOSPITAL") {
		return "/users/profiles/hospital";
	}

	if (role === "PATIENT") {
		return "/users/profiles/patient";
	}

	return "";
}

function getUpdateProfileEndpoint() {
	const role =
		localStorage.getItem("role");

	if (role === "WHOLESALER") {
		return "/users/profiles/me/wholesaler";
	}

	if (role === "RETAILER") {
		return "/users/profiles/me/retailer";
	}

	if (role === "DOCTOR") {
		return "/users/profiles/me/doctor";
	}

	if (role === "HOSPITAL") {
		return "/users/profiles/me/hospital";
	}

	if (role === "PATIENT") {
		return "/users/profiles/me/patient";
	}

	return "";
}

function getMyProfileEndpoint() {
	return getUpdateProfileEndpoint();
}

function prefillBasicUser() {
	setValue(
		"email",
		localStorage.getItem("email")
	);

	const profileEmailPreview =
		document.getElementById(
			"profileEmailPreview"
		);

	if (profileEmailPreview) {
		profileEmailPreview.innerText =
			localStorage.getItem("email") ||
			"";
	}
}

async function updateLogoPreview() {
	const logoUrl =
		getValue("profileLogoUrl");

	const image =
		document.getElementById(
			"profileLogoPreview"
		);

	if (!image || !logoUrl) {
		return;
	}

	const token =
		localStorage.getItem("token");

	try {
		const response =
			await fetch(
				buildFileUrl(logoUrl),
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			return;
		}

		const blob =
			await response.blob();

		if (currentLogoObjectUrl) {
			URL.revokeObjectURL(
				currentLogoObjectUrl
			);
		}

		currentLogoObjectUrl =
			URL.createObjectURL(blob);

		image.src =
			currentLogoObjectUrl;

	} catch (error) {
		console.error(
			"Profile logo preview error:",
			error
		);
	}
}

function getValue(id) {
	const element =
		document.getElementById(id);

	if (!element) {
		return "";
	}

	return element.value
		? element.value.trim()
		: "";
}

function setValue(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.value =
			value ?? "";
	}
}

function showProfileMessage(
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
		4000
	);
}

async function uploadProfileLogo() {
	const fileInput =
		document.getElementById(
			"profileLogoFile"
		);

	if (
		!fileInput ||
		!fileInput.files ||
		!fileInput.files.length
	) {
		showProfileMessage(
			"Please select logo file"
		);

		return;
	}

	const file =
		fileInput.files[0];

	if (!file.type.startsWith("image/")) {
		showProfileMessage(
			"Only image file allowed for logo"
		);

		return;
	}

	setButtonLoading(
		"uploadProfileLogoBtn",
		"Uploading Logo...",
		true
	);

	try {
		const response =
			await uploadFile(
				"/users/files/upload/logo",
				file
			);

		if (response) {
			setValue(
				"profileLogoUrl",
				response.fileUrl
			);

			await updateLogoPreview();

			const saved =
				await saveProfile();

			if (saved) {
				showProfileMessage(
					"Logo uploaded successfully",
					"success"
				);
			}
		}

	} finally {
		setButtonLoading(
			"uploadProfileLogoBtn",
			"Upload Logo",
			false
		);
	}
}

async function uploadDocument() {
	const fileInput =
		document.getElementById(
			"documentFile"
		);

	if (
		!fileInput ||
		!fileInput.files ||
		!fileInput.files.length
	) {
		showProfileMessage(
			"Please select document file"
		);

		return;
	}

	const file =
		fileInput.files[0];

	const allowed = [
		"application/pdf",
		"image/png",
		"image/jpeg",
		"image/jpg",
		"image/webp"
	];

	if (!allowed.includes(file.type)) {
		showProfileMessage(
			"Only PDF or image document allowed"
		);

		return;
	}

	setButtonLoading(
		"uploadDocumentBtn",
		"Uploading Document...",
		true
	);

	try {
		const response =
			await uploadFile(
				"/users/files/upload/document",
				file
			);

		if (response) {
			setValue(
				"documentUrl",
				response.fileUrl
			);

			updateDocumentPreview();

			const saved =
				await saveProfile();

			if (saved) {
				showProfileMessage(
					"Document uploaded successfully",
					"success"
				);
			}
		}

	} finally {
		setButtonLoading(
			"uploadDocumentBtn",
			"Upload Document",
			false
		);
	}
}

async function uploadFile(
	apiPath,
	file
) {
	const token =
		localStorage.getItem("token");

	const formData =
		new FormData();

	formData.append(
		"file",
		file
	);

	try {
		const response =
			await fetch(
				`${API_BASE}${apiPath}`,
				{
					method: "POST",

					headers: {
						"Authorization":
							"Bearer " + token
					},

					body: formData
				}
			);

		const result =
			await readJsonSafely(response);

		if (!response.ok) {
			showProfileMessage(
				getErrorMessage(
					result,
					"File upload failed"
				)
			);

			return null;
		}

		return result;

	} catch (error) {
		console.error(
			"Upload file error:",
			error
		);

		showProfileMessage(
			"Upload service not reachable"
		);

		return null;
	}
}

function updateDocumentPreview() {
	const documentUrl =
		getValue("documentUrl");

	const link =
		document.getElementById(
			"documentPreviewLink"
		);

	if (!link) {
		return;
	}

	link.style.display =
		documentUrl
			? "flex"
			: "none";
}

async function viewUploadedDocument() {
	const documentUrl =
		getValue("documentUrl");

	const token =
		localStorage.getItem("token");

	if (!documentUrl) {
		showProfileMessage(
			"Document not found"
		);

		return;
	}

	try {
		const response =
			await fetch(
				buildFileUrl(documentUrl),
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			showProfileMessage(
				"Unable to open document"
			);

			return;
		}

		const blob =
			await response.blob();

		const fileUrl =
			window.URL.createObjectURL(blob);

		window.open(
			fileUrl,
			"_blank",
			"noopener"
		);

		window.setTimeout(
			function() {
				window.URL.revokeObjectURL(
					fileUrl
				);
			},
			60000
		);

	} catch (error) {
		console.error(
			"Open document error:",
			error
		);

		showProfileMessage(
			"File service not reachable"
		);
	}
}

function buildFileUrl(fileUrl) {
	if (
		/^https?:\/\//i.test(fileUrl)
	) {
		return fileUrl;
	}

	return `${API_BASE}${fileUrl}`;
}

function setProfileLoading(isLoading) {
	const overlay =
		document.getElementById(
			"profileLoadingOverlay"
		);

	if (overlay) {
		overlay.classList.toggle(
			"active",
			Boolean(isLoading)
		);
	}
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

function toIntegerOrNull(value) {
	const numberValue =
		parseInt(value, 10);

	return Number.isFinite(numberValue)
		? numberValue
		: null;
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

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}