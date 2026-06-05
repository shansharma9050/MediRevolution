let currentProfile = null;

document.addEventListener("DOMContentLoaded", function () {
    applyRoleBasedMenuForProfile();
    setupProfileByRole();
    loadMyProfile();
});

function applyRoleBasedMenuForProfile() {
    const role = localStorage.getItem("role");

    document.querySelectorAll("[data-role]").forEach(item => {
        const allowedRoles = item.getAttribute("data-role").split(" ");
        if (!allowedRoles.includes(role)) {
            item.style.display = "none";
        }
    });
}

function setupProfileByRole() {
    const role = localStorage.getItem("role");

    const profileRole = document.getElementById("profileRole");
    if (profileRole) {
        profileRole.innerText = role || "-";
    }

    const allowed = ["WHOLESALER", "RETAILER", "DOCTOR", "HOSPITAL", "PATIENT"];

    if (!allowed.includes(role)) {
        alert("Profile management is available for Wholesaler, Retailer, Doctor, Hospital and Patient only.");
        window.location.href = "/dashboard";
        return;
    }

    // First hide all role based fields
    hideAllRoleFields();

    // Reset common blocks
    showElement("businessNameBlock");
    showElement("ownerNameBlock");
    showElement("drugLicenseBlock");
    showElement("gstBlock");
    hideElement("registrationBlock");
    hideElement("specializationBlock");
    showElement("bankDetailsBlock");
    showElement("documentBlock");

    if (role === "WHOLESALER") {
        setText("businessNameLabel", "Wholesaler Business Name");
    }

    if (role === "RETAILER") {
        setText("businessNameLabel", "Medical Store Name");
    }

    if (role === "DOCTOR") {
        setText("businessNameLabel", "Doctor / Clinic Name");

        hideElement("drugLicenseBlock");
        hideElement("gstBlock");

        showElement("registrationBlock");
        showElement("specializationBlock");

        const specializationLabel = document.querySelector("#specializationBlock label");
        if (specializationLabel) {
            specializationLabel.innerText = "Specialization";
        }
    }

    if (role === "HOSPITAL") {
        setText("businessNameLabel", "Hospital Name");

        hideElement("drugLicenseBlock");

        showElement("registrationBlock");
        showElement("specializationBlock");

        const specializationLabel = document.querySelector("#specializationBlock label");
        if (specializationLabel) {
            specializationLabel.innerText = "Hospital Type";
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

        const pageSubtitle = document.querySelector(".mr-page-subtitle");
        if (pageSubtitle) {
            pageSubtitle.innerText = "Manage your patient profile, medical history and emergency contact details.";
        }
    }
}

function hideAllRoleFields() {
    document
        .querySelectorAll(".field-wholesaler, .field-retailer, .field-doctor, .field-hospital, .field-patient")
        .forEach(field => {
            field.style.display = "none";
        });
}

function showFields(className) {
    document.querySelectorAll("." + className).forEach(field => {
        field.style.display = "block";
    });
}

function showElement(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = "block";
    }
}

function hideElement(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = "none";
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = value;
    }
}
function getProfileEndpoint(role) {
    if (role === "WHOLESALER") return "wholesaler";
    if (role === "RETAILER") return "retailer";
    if (role === "DOCTOR") return "doctor";
    if (role === "HOSPITAL") return "hospital";
}

async function loadMyProfile() {
    const token = localStorage.getItem("token");
    const endpoint = getMyProfileEndpoint();

    if (!endpoint) {
        showProfileMessage("Invalid role. Unable to load profile.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await response.json();

        if (!response.ok) {
            showProfileMessage("Profile not found. Please fill and save your profile.", "warning");
            prefillBasicUser();
            return;
        }

        currentProfile = result;
        fillProfile(result);

    } catch (error) {
        showProfileMessage("User service not reachable.");
    }
}

function fillForm(profile) {
    const role = localStorage.getItem("role");

    if (role === "WHOLESALER") {
        setValue("businessName", profile.businessName);
        setValue("ownerName", profile.ownerName);
    }

    if (role === "RETAILER") {
        setValue("businessName", profile.storeName);
        setValue("ownerName", profile.ownerName);
    }

    if (role === "DOCTOR") {
        // IMPORTANT FIX
        // businessName field is used for clinic name
        // ownerName field is used for doctor name
        setValue("businessName", profile.clinicName);
        setValue("ownerName", profile.doctorName);

        setValue("registrationNumber", profile.registrationNumber);
        setValue("specialization", profile.specialization);
    }

    if (role === "HOSPITAL") {
        setValue("businessName", profile.hospitalName);
        setValue("ownerName", profile.contactPersonName);
        setValue("registrationNumber", profile.registrationNumber);
        setValue("specialization", profile.hospitalType);
    }

    if (role === "PATIENT") {
        setValue("patientName", profile.patientName);
        setValue("gender", profile.gender);
        setValue("dateOfBirth", profile.dateOfBirth);
        setValue("bloodGroup", profile.bloodGroup);
        setValue("medicalHistory", profile.medicalHistory);
        setValue("emergencyContactName", profile.emergencyContactName);
        setValue("emergencyContactMobile", profile.emergencyContactMobile);
    }

    setValue("drugLicenseNumber", profile.drugLicenseNumber);
    setValue("gstNumber", profile.gstNumber);
    setValue("email", profile.email);
    setValue("mobile", profile.mobile);
    setValue("address", profile.address);
    setValue("state", profile.state);
    setValue("district", profile.district);
    setValue("pincode", profile.pincode);
    setValue("contactPersonName", profile.contactPersonName);
    setValue("contactPersonMobile", profile.contactPersonMobile);
    setValue("bankName", profile.bankName);
    setValue("accountHolderName", profile.accountHolderName);
    setValue("accountNumber", profile.accountNumber);
    setValue("ifscCode", profile.ifscCode);
    setValue("branchName", profile.branchName);
    setValue("profileLogoUrl", profile.profileLogoUrl);
    setValue("documentUrl", profile.documentUrl);

    const profileNamePreview = document.getElementById("profileNamePreview");
    if (profileNamePreview) {
        profileNamePreview.innerText =
            getValue("patientName") ||
            getValue("businessName") ||
            "MediRevolution Profile";
    }

    const profileEmailPreview = document.getElementById("profileEmailPreview");
    if (profileEmailPreview) {
        profileEmailPreview.innerText =
            getValue("email") || localStorage.getItem("email") || "";
    }

    const verificationStatus = document.getElementById("verificationStatus");
    if (verificationStatus) {
        verificationStatus.innerText = profile.verificationStatus || "PENDING";
    }

    updateLogoPreview();
    updateDocumentPreview();
}
function fillProfile(profile) {
    fillForm(profile);
}

async function saveProfile() {
    const token = localStorage.getItem("token");
    const payload = buildProfilePayload();

    if (!validateProfile()) {
        return;
    }

    try {
        const method = currentProfile ? "PUT" : "POST";
        const endpoint = currentProfile ? getUpdateProfileEndpoint() : getCreateProfileEndpoint();

        if (!endpoint) {
            showProfileMessage("Invalid role. Unable to save profile.");
            return;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            showProfileMessage(result.message || "Unable to save profile");
            return;
        }

        currentProfile = result;
        fillProfile(result);
        showProfileMessage("Profile saved successfully", "success");

    } catch (error) {
        showProfileMessage("User service not reachable.");
    }
}


function buildProfilePayload() {
    const role = localStorage.getItem("role");

    if (role === "PATIENT") {
        return {
            patientName: getValue("patientName"),
            email: getValue("email"),
            mobile: getValue("mobile"),
            gender: getValue("gender"),
            dateOfBirth: getValue("dateOfBirth"),
            bloodGroup: getValue("bloodGroup"),
            address: getValue("address"),
            state: getValue("state"),
            district: getValue("district"),
            pincode: getValue("pincode"),
            medicalHistory: getValue("medicalHistory"),
            emergencyContactName: getValue("emergencyContactName"),
            emergencyContactMobile: getValue("emergencyContactMobile")
        };
    }

    let payload = {
        email: getValue("email"),
        mobile: getValue("mobile"),
        address: getValue("address"),
        state: getValue("state"),
        district: getValue("district"),
        pincode: getValue("pincode"),
        contactPersonName: getValue("contactPersonName"),
        contactPersonMobile: getValue("contactPersonMobile"),
        bankName: getValue("bankName"),
        accountHolderName: getValue("accountHolderName"),
        accountNumber: getValue("accountNumber"),
        ifscCode: getValue("ifscCode"),
        branchName: getValue("branchName"),
        profileLogoUrl: getValue("profileLogoUrl"),
        documentUrl: getValue("documentUrl")
    };

    if (role === "WHOLESALER") {
        payload.businessName = getValue("businessName");
        payload.ownerName = getValue("ownerName");
        payload.drugLicenseNumber = getValue("drugLicenseNumber");
        payload.gstNumber = getValue("gstNumber");
    }

    if (role === "RETAILER") {
        payload.storeName = getValue("businessName");
        payload.ownerName = getValue("ownerName");
        payload.drugLicenseNumber = getValue("drugLicenseNumber");
        payload.gstNumber = getValue("gstNumber");
    }

    if (role === "DOCTOR") {
        payload.doctorName = getValue("ownerName") || getValue("businessName");
        payload.clinicName = getValue("businessName");
        payload.registrationNumber = getValue("registrationNumber");
        payload.specialization = getValue("specialization");
    }

    if (role === "HOSPITAL") {
        payload.hospitalName = getValue("businessName");
        payload.registrationNumber = getValue("registrationNumber");
        payload.hospitalType = getValue("specialization");
    }

    return payload;
}

function validateProfile() {
    const role = localStorage.getItem("role");

    if (role === "PATIENT") {
        if (!getValue("patientName")) {
            showProfileMessage("Patient name is required");
            return false;
        }

        if (!getValue("email")) {
            showProfileMessage("Email is required");
            return false;
        }

        if (!getValue("mobile")) {
            showProfileMessage("Mobile number is required");
            return false;
        }

        if (!getValue("gender")) {
            showProfileMessage("Gender is required");
            return false;
        }

        if (!getValue("dateOfBirth")) {
            showProfileMessage("Date of birth is required");
            return false;
        }

        return true;
    }

    if (!getValue("businessName")) {
        showProfileMessage("Business/Profile name is required");
        return false;
    }

    if (!getValue("email")) {
        showProfileMessage("Email is required");
        return false;
    }

    return true;
}
function getCreateProfileEndpoint() {
    const role = localStorage.getItem("role");

    if (role === "WHOLESALER") return "/users/profiles/wholesaler";
    if (role === "RETAILER") return "/users/profiles/retailer";
    if (role === "DOCTOR") return "/users/profiles/doctor";
    if (role === "HOSPITAL") return "/users/profiles/hospital";
    if (role === "PATIENT") return "/users/profiles/patient";

    return "";
}

function getUpdateProfileEndpoint() {
    const role = localStorage.getItem("role");

    if (role === "WHOLESALER") return "/users/profiles/me/wholesaler";
    if (role === "RETAILER") return "/users/profiles/me/retailer";
    if (role === "DOCTOR") return "/users/profiles/me/doctor";
    if (role === "HOSPITAL") return "/users/profiles/me/hospital";
    if (role === "PATIENT") return "/users/profiles/me/patient";

    return "";
}

function getMyProfileEndpoint() {
    const role = localStorage.getItem("role");

    if (role === "WHOLESALER") return "/users/profiles/me/wholesaler";
    if (role === "RETAILER") return "/users/profiles/me/retailer";
    if (role === "DOCTOR") return "/users/profiles/me/doctor";
    if (role === "HOSPITAL") return "/users/profiles/me/hospital";
    if (role === "PATIENT") return "/users/profiles/me/patient";

    return "";
}

function prefillBasicUser() {
    setValue("email", localStorage.getItem("email"));
    document.getElementById("profileEmailPreview").innerText = localStorage.getItem("email");
}

async function updateLogoPreview() {
    const logoUrl = getValue("profileLogoUrl");
    const img = document.getElementById("profileLogoPreview");

    if (!logoUrl) return;

    const token = localStorage.getItem("token");

    const response = await fetch(API_BASE + logoUrl, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const blob = await response.blob();
    img.src = URL.createObjectURL(blob);
}

function getValue(id) {
    const el = document.getElementById(id);
    if (!el) {
        return "";
    }
    return el.value ? el.value.trim() : "";
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.value = value || "";
    }
}

function showProfileMessage(message, type = "danger") {
    document.getElementById("msg").innerHTML =
        `<div class="alert alert-${type}">${message}</div>`;

    setTimeout(() => {
        document.getElementById("msg").innerHTML = "";
    }, 4000);
}

async function uploadProfileLogo() {
    const fileInput = document.getElementById("profileLogoFile");

    if (!fileInput.files || fileInput.files.length === 0) {
        showProfileMessage("Please select logo file");
        return;
    }

    const file = fileInput.files[0];

    if (!file.type.startsWith("image/")) {
        showProfileMessage("Only image file allowed for logo");
        return;
    }

    const response = await uploadFile("/users/files/upload/logo", file);

    if (response) {
        document.getElementById("profileLogoUrl").value = response.fileUrl;
        updateLogoPreview();
        await saveProfile();
        showProfileMessage("Logo uploaded successfully", "success");
    }
}

async function uploadDocument() {
    const fileInput = document.getElementById("documentFile");

    if (!fileInput.files || fileInput.files.length === 0) {
        showProfileMessage("Please select document file");
        return;
    }

    const file = fileInput.files[0];

    const allowed = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp"
    ];

    if (!allowed.includes(file.type)) {
        showProfileMessage("Only PDF or image document allowed");
        return;
    }

    const response = await uploadFile("/users/files/upload/document", file);

    if (response) {
        document.getElementById("documentUrl").value = response.fileUrl;
        updateDocumentPreview();
        await saveProfile();
        showProfileMessage("Document uploaded successfully", "success");
    }
}

async function uploadFile(apiPath, file) {
    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE}${apiPath}`, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token
            },
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            showProfileMessage(result.message || "File upload failed");
            return null;
        }

        return result;

    } catch (error) {
        showProfileMessage("Upload service not reachable");
        return null;
    }
}

function updateDocumentPreview() {
    const documentUrl = getValue("documentUrl");
    const link = document.getElementById("documentPreviewLink");

    if (documentUrl) {
        link.style.display = "block";
    } else {
        link.style.display = "none";
    }
}

async function viewUploadedDocument() {
    const documentUrl = getValue("documentUrl");
    const token = localStorage.getItem("token");

    if (!documentUrl) {
        showProfileMessage("Document not found");
        return;
    }

    try {
        const response = await fetch(API_BASE + documentUrl, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!response.ok) {
            showProfileMessage("Unable to open document");
            return;
        }

        const blob = await response.blob();
        const fileUrl = window.URL.createObjectURL(blob);

        window.open(fileUrl, "_blank");

    } catch (error) {
        showProfileMessage("File service not reachable");
    }
}