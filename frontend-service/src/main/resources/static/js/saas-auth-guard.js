window.SAAS_PERMISSIONS = window.SAAS_PERMISSIONS || [];
window.SAAS_MEMBER_ROLE = window.SAAS_MEMBER_ROLE || null;
window.SAAS_OWNER_OR_ADMIN = window.SAAS_OWNER_OR_ADMIN || false;

function getApiBase() {
    if (typeof API_BASE !== "undefined" && API_BASE) {
        return API_BASE;
    }

    return "http://localhost:8080";
}

function getSaasTenantId() {
    return localStorage.getItem("tenantId");
}

function isSaasMode() {
    return localStorage.getItem("saasMode") === "true";
}

function requireSaasWorkspace() {
    const tenantId = getSaasTenantId();

    if (!tenantId || !isSaasMode()) {
        alert("Please select SaaS workspace first.");
        window.location.href = "/saas/workspaces";
        return false;
    }

    return true;
}

async function loadCurrentSaasPermissions() {
    const token = localStorage.getItem("token");
    const tenantId = getSaasTenantId();

    if (!tenantId || !isSaasMode()) {
        clearSaasPermissionCache();
        return null;
    }

    if (!token || token === "undefined" || token === "null") {
        clearSaasPermissionCache();
        console.warn("JWT token not found while loading SaaS permissions");
        return null;
    }

    try {
        const response = await fetch(
            `${getApiBase()}/saas/permissions/current?tenantId=${encodeURIComponent(tenantId)}`,
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const result = await safeSaasJson(response);

        if (!response.ok) {
            console.error("Unable to load SaaS permissions", {
                status: response.status,
                statusText: response.statusText,
                body: result
            });

            clearSaasPermissionCache();
            return null;
        }

        const normalizedPermissions = normalizeSaasPermissions(result.permissions || []);

        window.SAAS_PERMISSIONS = normalizedPermissions;
        window.SAAS_MEMBER_ROLE = result.memberRole || null;
        window.SAAS_OWNER_OR_ADMIN = result.ownerOrAdmin === true;

        localStorage.setItem("saasPermissions", JSON.stringify(window.SAAS_PERMISSIONS));
        localStorage.setItem("saasMemberRole", window.SAAS_MEMBER_ROLE || "");
        localStorage.setItem("saasOwnerOrAdmin", window.SAAS_OWNER_OR_ADMIN ? "true" : "false");

        return {
            permissions: window.SAAS_PERMISSIONS,
            memberRole: window.SAAS_MEMBER_ROLE,
            ownerOrAdmin: window.SAAS_OWNER_OR_ADMIN
        };

    } catch (error) {
        console.error("Unable to load SaaS permissions", error);
        clearSaasPermissionCache();
        return null;
    }
}

function normalizeSaasPermissions(permissions) {
    if (!Array.isArray(permissions)) {
        return [];
    }

    return permissions
        .map(permission => {
            /*
                Supports backend response format 1:

                {
                    "module": "PATIENTS",
                    "permissionAction": "VIEW",
                    "allowed": true
                }

                Supports backend response format 2:

                "PATIENTS_VIEW"
            */

            if (typeof permission === "string") {
                const parts = permission.split("_");

                if (parts.length < 2) {
                    return null;
                }

                const action = parts.pop();
                const module = parts.join("_");

                return {
                    module: module.trim().toUpperCase(),
                    permissionAction: action.trim().toUpperCase(),
                    allowed: true
                };
            }

            if (typeof permission === "object" && permission !== null) {
                return {
                    module: String(permission.module || permission.moduleName || "")
                        .trim()
                        .toUpperCase(),

                    permissionAction: String(
                        permission.permissionAction ||
                        permission.actionName ||
                        permission.action ||
                        ""
                    )
                        .trim()
                        .toUpperCase(),

                    allowed: permission.allowed === true
                };
            }

            return null;
        })
        .filter(permission =>
            permission &&
            permission.module &&
            permission.permissionAction
        );
}

function clearSaasPermissionCache() {
    window.SAAS_PERMISSIONS = [];
    window.SAAS_MEMBER_ROLE = null;
    window.SAAS_OWNER_OR_ADMIN = false;

    localStorage.removeItem("saasPermissions");
    localStorage.removeItem("saasMemberRole");
    localStorage.removeItem("saasOwnerOrAdmin");
}

function loadCachedSaasPermissionsFromLocalStorage() {
    try {
        const cachedPermissions = localStorage.getItem("saasPermissions");
        const cachedMemberRole = localStorage.getItem("saasMemberRole");
        const cachedOwnerOrAdmin = localStorage.getItem("saasOwnerOrAdmin");

        if (cachedPermissions) {
            window.SAAS_PERMISSIONS = normalizeSaasPermissions(JSON.parse(cachedPermissions));
        }

        window.SAAS_MEMBER_ROLE = cachedMemberRole || null;
        window.SAAS_OWNER_OR_ADMIN = cachedOwnerOrAdmin === "true";

    } catch (error) {
        clearSaasPermissionCache();
    }
}

function hasCachedSaasPermission(module, action) {
    if (!isSaasMode()) {
        return true;
    }

    if (window.SAAS_OWNER_OR_ADMIN === true) {
        return true;
    }

    if (!module || !action) {
        return true;
    }

    const requiredModule = String(module).trim().toUpperCase();
    const requiredAction = String(action).trim().toUpperCase();

    return (window.SAAS_PERMISSIONS || []).some(permission =>
        String(permission.module || "").trim().toUpperCase() === requiredModule &&
        String(permission.permissionAction || "").trim().toUpperCase() === requiredAction &&
        permission.allowed === true
    );
}

async function hasSaasPermission(module, action) {
    if (!isSaasMode()) {
        return true;
    }

    if (!getSaasTenantId()) {
        return false;
    }

    if (window.SAAS_OWNER_OR_ADMIN === true) {
        return true;
    }

    if (!window.SAAS_PERMISSIONS || window.SAAS_PERMISSIONS.length === 0) {
        loadCachedSaasPermissionsFromLocalStorage();

        if (!window.SAAS_PERMISSIONS || window.SAAS_PERMISSIONS.length === 0) {
            await loadCurrentSaasPermissions();
        }
    }

    return hasCachedSaasPermission(module, action);
}

async function protectSaasPage(module, action = "VIEW") {
    if (!requireSaasWorkspace()) {
        return false;
    }

    await loadCurrentSaasPermissions();

    const allowed = hasCachedSaasPermission(module, action);

    if (!allowed) {
        alert("You do not have permission to access this page.");
        window.location.href = "/saas/dashboard";
        return false;
    }

    return true;
}

async function protectOwnerAdminPage() {
    if (!requireSaasWorkspace()) {
        return false;
    }

    await loadCurrentSaasPermissions();

    if (window.SAAS_OWNER_OR_ADMIN !== true) {
        alert("Only workspace owner/admin can access this page.");
        window.location.href = "/saas/dashboard";
        return false;
    }

    return true;
}

async function applySaasPermissionMenu() {
    if (!isSaasMode() || !getSaasTenantId()) {
        return;
    }

    await loadCurrentSaasPermissions();

    document.querySelectorAll("[data-saas-module]").forEach(link => {
        const module = link.getAttribute("data-saas-module");
        const action = link.getAttribute("data-saas-action") || "VIEW";

        const allowed = hasCachedSaasPermission(module, action);

        link.style.display = allowed ? "" : "none";
    });

    document.querySelectorAll("[data-owner-admin='true']").forEach(link => {
        link.style.display = window.SAAS_OWNER_OR_ADMIN === true ? "" : "none";
    });
}

async function safeSaasJson(response) {
    try {
        const text = await response.text();

        if (!text || text.trim() === "") {
            return {};
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            return {
                rawBody: text
            };
        }

    } catch (error) {
        return {};
    }
}

function showOrHideById(elementId, allowed) {
    const element = document.getElementById(elementId);

    if (element) {
        element.style.display = allowed ? "" : "none";
    }
}

function showOrHideByClass(className, allowed) {
    document.querySelectorAll("." + className).forEach(element => {
        element.style.display = allowed ? "" : "none";
    });
}

function disableByClass(className, disabled) {
    document.querySelectorAll("." + className).forEach(element => {
        element.disabled = disabled;
    });
}