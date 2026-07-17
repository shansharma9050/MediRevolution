let moduleSwitchInProgress = false;

document.addEventListener("DOMContentLoaded", function() {

	initializeModulePageEntryAnimation();
	initializeSharedModuleShell();

});


function initializeSharedModuleShell() {

	const tenantName =
		localStorage.getItem("tenantName") || "Workspace";

	const navbarTenantName =
		document.getElementById("navbarTenantName");

	const sidebarTenantName =
		document.getElementById("sidebarTenantName");

	if (navbarTenantName) {
		navbarTenantName.textContent = tenantName;
	}

	if (sidebarTenantName) {
		sidebarTenantName.textContent = tenantName;
	}

}


function initializeModulePageEntryAnimation() {

	const overlay =
		document.getElementById("modulePageEntryOverlay");

	if (!overlay) {
		return;
	}

	document.body.classList.add("module-page-loading");

	window.setTimeout(function() {

		overlay.classList.add("hide");

		document.body.classList.remove("module-page-loading");

	}, 900);

	window.setTimeout(function() {

		overlay.remove();

	}, 1500);

}


function switchMediRevolutionModule() {

	if (moduleSwitchInProgress) {
		return;
	}

	moduleSwitchInProgress = true;

	const overlay =
		document.getElementById("moduleExitOverlay");

	if (!overlay) {
		window.location.href = "/module-selection";
		return;
	}

	overlay.classList.add("active");

	window.setTimeout(function() {

		window.location.href = "/module-selection";

	}, 1200);

}


function switchSaasWorkspace() {

	if (moduleSwitchInProgress) {
		return;
	}

	moduleSwitchInProgress = true;

	localStorage.removeItem("tenantId");
	localStorage.removeItem("tenantName");
	localStorage.removeItem("saasMemberRole");
	localStorage.removeItem("saasOwnerOrAdmin");
	localStorage.removeItem("saasPermissions");
	localStorage.removeItem("saasEnabledModules");

	window.SAAS_PERMISSIONS = [];
	window.SAAS_MEMBER_ROLE = null;
	window.SAAS_OWNER_OR_ADMIN = false;
	window.SAAS_ENABLED_MODULES = [];

	const overlay =
		document.getElementById("moduleExitOverlay");

	if (overlay) {

		const title =
			overlay.querySelector("h2");

		const message =
			overlay.querySelector("p");

		const icon =
			overlay.querySelector(".module-exit-icon");

		if (title) {
			title.textContent = "Switching Workspace";
		}

		if (message) {
			message.textContent =
				"Preparing your workspace selection...";
		}

		if (icon) {
			icon.innerHTML =
				'<i class="bi bi-building"></i>';
		}

		overlay.classList.add("active");

		window.setTimeout(function() {

			window.location.href = "/saas/workspaces";

		}, 1200);

		return;
	}

	window.location.href = "/saas/workspaces";
}


function togglePlatformSidebar() {

	const sidebar =
		document.getElementById("platformSidebar");

	if (sidebar) {
		sidebar.classList.toggle("show");
	}

}


function toggleSaasSidebar() {

	const sidebar =
		document.getElementById("saasSidebar");

	if (sidebar) {
		sidebar.classList.toggle("show");
	}

}


function logoutFromSaas() {

	clearMediRevolutionSession();

	window.location.replace("/");

}


function clearMediRevolutionSession() {

	const rememberedEmail =
		localStorage.getItem("rememberedEmail");

	const rememberedPassword =
		localStorage.getItem("rememberedPassword");

	localStorage.clear();

	if (rememberedEmail) {
		localStorage.setItem(
			"rememberedEmail",
			rememberedEmail
		);
	}

	if (rememberedPassword) {
		localStorage.setItem(
			"rememberedPassword",
			rememberedPassword
		);
	}

	sessionStorage.clear();

}