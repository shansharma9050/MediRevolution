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
    document.getElementById("profileRole").innerText = role;

    if (!["WHOLESALER", "RETAILER", "DOCTOR", "HOSPITAL", "PATIENT"].includes(role)) {
        alert("Profile management is available for Wholesaler, Retailer, Doctor, Hospital and Patient only.");
        window.location.href = "/dashboard";
        return;
    }

    if (role === "WHOLESALER") {
        document.getElementById("businessNameLabel").innerText = "Wholesaler Business Name";
    }

    if (role === "RETAILER") {
        document.getElementById("businessNameLabel").innerText = "Medical Store Name";
    }

    if (role === "DOCTOR") {
        document.getElementById("businessNameLabel").innerText = "Doctor / Clinic Name";
        document.getElementById("drugLicenseBlock").style.display = "none";
        document.getElementById("gstBlock").style.display = "none";
        document.getElementById("registrationBlock").style.display = "block";
        document.getElementById("specializationBlock").style.display = "block";
    }

    if (role === "HOSPITAL") {
        document.getElementById("businessNameLabel").innerText = "Hospital Name";
        document.getElementById("drugLicenseBlock").style.display = "none";
        document.getElementById("registrationBlock").style.display = "block";
        document.getElementById("specializationBlock").style.display = "block";
        document.getElementById("specializationBlock").querySelector("label").innerText = "Hospital Type";
    }
    
    if (role === "PATIENT") {
    showFields("field-patient");
    document.getElementById("profileSubtitle").innerText =
        "Manage your patient profile, medical history and emergency contact details.";
}
}

function getProfileEndpoint(role) {
    if (role === "WHOLESALER") return "wholesaler";
    if (role === "RETAILER") return "retailer";
    if (role === "DOCTOR") return "doctor";
    if (role === "HOSPITAL") return "hospital";
}

async function loadMyProfile() {
    const role = localStorage.getItem("role");
    const endpoint = getProfileEndpoint(role);
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE}/users/profiles/me/${endpoint}`, {
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
        fillForm(result);

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
        setValue("businessName", profile.doctorName || profile.clinicName);
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

    document.getElementById("profileNamePreview").innerText =
        getValue("businessName") || "MediRevolution Profile";

    document.getElementById("profileEmailPreview").innerText =
        getValue("email") || localStorage.getItem("email");

    document.getElementById("verificationStatus").innerText =
        profile.verificationStatus || "PENDING";

    updateLogoPreview();
    updateDocumentPreview();
}

function buildPayload() {
    const role = localStorage.getItem("role");

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

async function saveProfile() {
    const role = localStorage.getItem("role");
    const endpoint = getProfileEndpoint(role);
    const token = localStorage.getItem("token");
    const payload = buildPayload();

    if (!getValue("businessName")) {
        showProfileMessage("Business/Profile name is required");
        return;
    }

    if (!getValue("email")) {
        showProfileMessage("Email is required");
        return;
    }

    try {
        let method = currentProfile ? "PUT" : "POST";

        const response = await fetch(`${API_BASE}/users/profiles/${endpoint}`, {
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
        fillForm(result);
        showProfileMessage("Profile saved successfully", "success");

    } catch (error) {
        showProfileMessage("User service not reachable.");
    }
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
    return document.getElementById(id).value.trim();
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