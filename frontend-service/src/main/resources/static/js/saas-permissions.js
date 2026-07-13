let selectedAuthUserId = null;
let selectedMemberName = "";
let selectedMemberRole = "";

let currentPermissions = [];
let allMembers = [];
let initialPermissionSnapshot = "";

let isLoadingMembers = false;
let isLoadingPermissions = false;
let isSavingPermissions = false;

const MODULES = [
	"DASHBOARD",
	"PATIENTS",
	"APPOINTMENTS",
	"DOCTORS",
	"STAFF",
	"PRESCRIPTIONS",
	"OPD",
	"IPD",
	"BILLING",
	"PHARMACY",
	"INVENTORY",
	"LAB",
	"RADIOLOGY",
	"REPORTS",
	"NOTIFICATIONS",
	"SETTINGS",
	"PERMISSIONS"
];

const ACTIONS = [
	"VIEW",
	"CREATE",
	"UPDATE",
	"DELETE",
	"APPROVE",
	"EXPORT",
	"PRINT"
];

document.addEventListener("DOMContentLoaded", async function() {
	const memberList =
		document.getElementById(
			"memberList"
		);

	const permissionTableBody =
		document.getElementById(
			"permissionTableBody"
		);

	if (
		!memberList ||
		!permissionTableBody
	) {
		console.warn(
			"saas-permissions.js loaded on non-permissions page. Skipping."
		);

		return;
	}

	const allowed =
		await protectOwnerAdminPage();

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

	const tenantName =
		localStorage.getItem(
			"tenantName"
		);

	setText(
		"tenantNameText",
		tenantName || "your workspace"
	);

	setText(
		"moduleCount",
		MODULES.length
	);

	applyPermissionPageButtonPermissions();
	await loadMembers();
});

async function loadMembers() {
	if (isLoadingMembers) {
		return;
	}

	isLoadingMembers = true;

	setButtonLoading(
		"refreshMembersBtn",
		"Loading...",
		true
	);

	showMembersLoadingState();

	try {
		const query =
			new URLSearchParams({
				tenantId:
					localStorage.getItem(
						"tenantId"
					)
			});

		const response =
			await fetch(
				`${API_BASE}/saas/permissions/members?${query.toString()}`,
				{
					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

						"Accept":
							"application/json"
					}
				}
			);

		const result =
			await safeJson(response);

		if (!response.ok) {
			allMembers = [];

			const message =
				getApiErrorMessage(
					result,
					"Only owner/admin can manage permissions."
				);

			showMsg(message);
			showMembersErrorState(message);
			updateMemberSummary();

			return;
		}

		allMembers =
			normalizeArrayResponse(result);

		allMembers.sort(
			function(a, b) {
				const roleOrder = {
					OWNER: 0,
					ADMIN: 1
				};

				const firstRole =
					roleOrder[
					String(
						a.memberRole || ""
					).toUpperCase()
					] ?? 2;

				const secondRole =
					roleOrder[
					String(
						b.memberRole || ""
					).toUpperCase()
					] ?? 2;

				if (
					firstRole !==
					secondRole
				) {
					return (
						firstRole -
						secondRole
					);
				}

				return String(
					a.name || ""
				).localeCompare(
					String(
						b.name || ""
					),
					"en",
					{
						sensitivity:
							"base"
					}
				);
			}
		);

		renderMembers(
			allMembers
		);

		updateMemberSummary();

	} catch (error) {
		console.error(
			"Load permission members error:",
			error
		);

		allMembers = [];

		showMsg(
			"SaaS service not reachable."
		);

		showMembersErrorState(
			"SaaS permission service is currently unavailable."
		);

		updateMemberSummary();

	} finally {
		isLoadingMembers = false;

		setButtonLoading(
			"refreshMembersBtn",
			"Refresh",
			false
		);
	}
}

function filterMembers() {
	const keyword =
		getValue(
			"memberSearchBox"
		).toLowerCase();

	const filtered =
		allMembers.filter(
			function(member) {
				const searchableText = [
					member.name,
					member.email,
					member.mobile,
					member.memberRole
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return (
					!keyword ||
					searchableText.includes(
						keyword
					)
				);
			}
		);

	renderMembers(filtered);
}

function renderMembers(members) {
	const container =
		document.getElementById(
			"memberList"
		);

	if (!container) {
		return;
	}

	const list =
		Array.isArray(members)
			? members
			: [];

	if (!list.length) {
		container.innerHTML = `
			<div class="permission-state">

				<div class="permission-state-icon">
					<i class="bi bi-person-x-fill"></i>
				</div>

				<h6 class="fw-bold text-primary">
					No members found
				</h6>

				<p class="text-muted small mb-0">
					No workspace members match the current search.
				</p>

			</div>
		`;

		return;
	}

	container.innerHTML =
		list.map(
			function(member) {
				const authUserId =
					safeNumber(
						member.authUserId
					);

				const role =
					String(
						member.memberRole ||
						"MEMBER"
					).toUpperCase();

				const isOwner =
					role === "OWNER";

				const active =
					Number(
						selectedAuthUserId
					) === authUserId;

				return `
					<button type="button"
							class="member-card ${active ? "active" : ""}"
							data-auth-user-id="${authUserId}"
							onclick="selectMember(${authUserId})"
							${authUserId ? "" : "disabled"}>

						<div class="member-card-top">

							<div class="member-avatar">
								${getInitial(member.name)}
							</div>

							<div class="member-info">

								<strong>
									${safe(member.name)}
								</strong>

								<small>
									${safe(member.email)}
								</small>

								<small>
									${safe(member.mobile)}
								</small>

								<span class="member-role-pill">
									<i class="bi bi-person-badge-fill"></i>
									${safe(formatLabel(role))}
								</span>

								${isOwner
						? `
										<div class="member-owner-note">
											<i class="bi bi-shield-lock-fill me-1"></i>
											Owner permissions cannot be changed
										</div>
									`
						: ""
					}

							</div>

						</div>

					</button>
				`;
			}
		).join("");
}

function applyPermissionPageButtonPermissions() {
	const allowed =
		window.SAAS_OWNER_OR_ADMIN === true;

	showOrHideById(
		"savePermissionBtn",
		allowed
	);

	showOrHideById(
		"selectAllPermissionsBtn",
		allowed
	);

	showOrHideById(
		"clearAllPermissionsBtn",
		allowed
	);
}

async function selectMember(authUserId) {
	const numericId =
		Number(authUserId);

	if (
		!Number.isFinite(numericId) ||
		numericId <= 0
	) {
		showMsg(
			"Invalid member selected."
		);

		return;
	}

	if (
		hasUnsavedPermissionChanges() &&
		selectedAuthUserId &&
		Number(selectedAuthUserId) !==
		numericId
	) {
		const proceed =
			confirm(
				"You have unsaved permission changes. Continue without saving?"
			);

		if (!proceed) {
			return;
		}
	}

	const member =
		allMembers.find(
			item =>
				Number(
					item.authUserId
				) === numericId
		);

	if (!member) {
		showMsg(
			"Selected member was not found."
		);

		return;
	}

	selectedAuthUserId =
		numericId;

	selectedMemberName =
		String(
			member.name || "Member"
		);

	selectedMemberRole =
		String(
			member.memberRole ||
			"MEMBER"
		).toUpperCase();

	setText(
		"selectedMemberNameText",
		selectedMemberName
	);

	setText(
		"selectedMemberText",
		`${formatLabel(selectedMemberRole)} | Auth ID: ${numericId}`
	);

	setSelectedMemberAvatar(
		selectedMemberName
	);

	renderMembers(
		filterMemberListForCurrentSearch()
	);

	await loadMemberPermissions(
		numericId
	);
}

function filterMemberListForCurrentSearch() {
	const keyword =
		getValue(
			"memberSearchBox"
		).toLowerCase();

	return allMembers.filter(
		function(member) {
			const searchableText = [
				member.name,
				member.email,
				member.mobile,
				member.memberRole
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return (
				!keyword ||
				searchableText.includes(
					keyword
				)
			);
		}
	);
}

async function loadMemberPermissions(
	authUserId
) {
	if (isLoadingPermissions) {
		return;
	}

	isLoadingPermissions = true;

	showPermissionLoadingState();
	setPermissionActionButtonsDisabled(
		true
	);

	try {
		const query =
			new URLSearchParams({
				tenantId:
					localStorage.getItem(
						"tenantId"
					),

				authUserId:
					String(authUserId)
			});

		const response =
			await fetch(
				`${API_BASE}/saas/permissions/member?${query.toString()}`,
				{
					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

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
					"Unable to load permissions."
				)
			);

			currentPermissions = [];
			renderPermissionTable();
			snapshotCurrentPermissions();

			return;
		}

		currentPermissions =
			normalizeArrayResponse(result);

		renderPermissionTable();
		snapshotCurrentPermissions();
		updatePermissionSummary();

	} catch (error) {
		console.error(
			"Load member permissions error:",
			error
		);

		showMsg(
			"Unable to load permissions."
		);

		currentPermissions = [];
		renderPermissionTable();
		snapshotCurrentPermissions();

	} finally {
		isLoadingPermissions = false;

		setPermissionActionButtonsDisabled(
			selectedMemberRole ===
			"OWNER"
		);
	}
}

function renderPermissionTable() {
	const tbody =
		document.getElementById(
			"permissionTableBody"
		);

	if (!tbody) {
		return;
	}

	const disabled =
		selectedMemberRole ===
		"OWNER";

	tbody.innerHTML =
		MODULES.map(
			function(module) {
				const moduleKey =
					escapeAttribute(
						module
					);

				return `
					<tr>

						<td>

							<div class="permission-module-cell">

								<div class="permission-module-name">

									<span class="permission-module-icon">
										<i class="${getModuleIcon(module)}"></i>
									</span>

									${escapeHtml(formatLabel(module))}

								</div>

								<button type="button"
										class="permission-row-toggle"
										onclick="toggleModulePermissions('${moduleKey}')"
										${disabled ? "disabled" : ""}>

									Toggle Row
								</button>

							</div>

						</td>

						${ACTIONS.map(
					function(action) {
						const checked =
							hasExistingPermission(
								module,
								action
							);

						return `
									<td>

										<input type="checkbox"
											   class="permission-check"
											   data-module="${moduleKey}"
											   data-action="${escapeAttribute(action)}"
											   ${checked ? "checked" : ""}
											   ${disabled ? "disabled" : ""}
											   onchange="handlePermissionChange()">

									</td>
								`;
					}
				).join("")}

					</tr>
				`;
			}
		).join("");
}

function hasExistingPermission(
	module,
	action
) {
	return currentPermissions.some(
		function(permission) {
			return (
				String(
					permission.module || ""
				).toUpperCase() ===
				module &&
				String(
					permission.permissionAction ||
					""
				).toUpperCase() ===
				action &&
				permission.allowed === true
			);
		}
	);
}

function toggleModulePermissions(module) {
	if (
		selectedMemberRole ===
		"OWNER"
	) {
		return;
	}

	const checkboxes =
		Array.from(
			document.querySelectorAll(
				`.permission-check[data-module="${cssEscape(module)}"]`
			)
		);

	if (!checkboxes.length) {
		return;
	}

	const shouldCheck =
		checkboxes.some(
			checkbox =>
				!checkbox.checked
		);

	checkboxes.forEach(
		function(checkbox) {
			checkbox.checked =
				shouldCheck;
		}
	);

	handlePermissionChange();
}

function setAllPermissions(checked) {
	if (
		!selectedAuthUserId ||
		selectedMemberRole ===
		"OWNER"
	) {
		return;
	}

	document.querySelectorAll(
		".permission-check:not(:disabled)"
	).forEach(
		function(checkbox) {
			checkbox.checked =
				Boolean(checked);
		}
	);

	handlePermissionChange();
}

function handlePermissionChange() {
	updatePermissionSummary();
	updateUnsavedChangesIndicator();
}

async function savePermissions() {
	if (isSavingPermissions) {
		return;
	}

	if (!selectedAuthUserId) {
		showMsg(
			"Please select member first."
		);

		return;
	}

	if (
		selectedMemberRole ===
		"OWNER"
	) {
		showMsg(
			"Owner permissions cannot be changed."
		);

		return;
	}

	if (
		window.SAAS_OWNER_OR_ADMIN !==
		true
	) {
		showMsg(
			"Only owner/admin can manage permissions."
		);

		return;
	}

	const tenantId =
		toPositiveNumberOrNull(
			localStorage.getItem(
				"tenantId"
			)
		);

	const authUserId =
		toPositiveNumberOrNull(
			selectedAuthUserId
		);

	if (!tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	if (!authUserId) {
		showMsg(
			"Invalid member selected."
		);

		return;
	}

	const permissions =
		collectCheckedPermissions();

	const payload = {
		tenantId:
			tenantId,

		authUserId:
			authUserId,

		permissions:
			permissions
	};

	isSavingPermissions = true;

	setButtonLoading(
		"savePermissionBtn",
		"Saving...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/saas/permissions/member`,
				{
					method:
						"PUT",

					headers: {
						"Authorization":
							"Bearer " +
							localStorage.getItem(
								"token"
							),

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
					"Unable to save permissions."
				)
			);

			return;
		}

		currentPermissions =
			normalizeArrayResponse(result);

		renderPermissionTable();
		snapshotCurrentPermissions();
		updatePermissionSummary();

		showMsg(
			"Permissions saved successfully.",
			"success"
		);

	} catch (error) {
		console.error(
			"Save permissions error:",
			error
		);

		showMsg(
			"SaaS service not reachable."
		);

	} finally {
		isSavingPermissions = false;

		setButtonLoading(
			"savePermissionBtn",
			"Save Permissions",
			false
		);

		setPermissionActionButtonsDisabled(
			selectedMemberRole ===
			"OWNER"
		);
	}
}

function collectCheckedPermissions() {
	const permissions = [];

	document.querySelectorAll(
		".permission-check"
	).forEach(
		function(checkbox) {
			if (checkbox.checked) {
				permissions.push({
					module:
						checkbox.dataset.module,

					permissionAction:
						checkbox.dataset.action,

					allowed:
						true
				});
			}
		}
	);

	return permissions;
}

function snapshotCurrentPermissions() {
	initialPermissionSnapshot =
		createPermissionSnapshot();

	updateUnsavedChangesIndicator();
}

function createPermissionSnapshot() {
	return collectCheckedPermissions()
		.map(
			permission =>
				`${permission.module}:${permission.permissionAction}`
		)
		.sort()
		.join("|");
}

function hasUnsavedPermissionChanges() {
	if (!selectedAuthUserId) {
		return false;
	}

	return (
		createPermissionSnapshot() !==
		initialPermissionSnapshot
	);
}

function updateUnsavedChangesIndicator() {
	const badge =
		document.getElementById(
			"unsavedChangesBadge"
		);

	if (!badge) {
		return;
	}

	badge.classList.toggle(
		"show",
		hasUnsavedPermissionChanges()
	);
}

function setPermissionActionButtonsDisabled(
	disabled
) {
	const noMemberSelected =
		!selectedAuthUserId;

	const shouldDisable =
		Boolean(disabled) ||
		noMemberSelected;

	[
		"savePermissionBtn",
		"selectAllPermissionsBtn",
		"clearAllPermissionsBtn"
	].forEach(
		function(id) {
			const button =
				document.getElementById(
					id
				);

			if (button) {
				button.disabled =
					shouldDisable;
			}
		}
	);
}

function updateMemberSummary() {
	setAnimatedNumber(
		"totalMemberCount",
		allMembers.length
	);

	setAnimatedNumber(
		"staffMemberCount",
		allMembers.filter(
			member =>
				![
					"OWNER",
					"ADMIN"
				].includes(
					String(
						member.memberRole || ""
					).toUpperCase()
				)
		).length
	);
}

function updatePermissionSummary() {
	setAnimatedNumber(
		"grantedPermissionCount",
		collectCheckedPermissions()
			.length
	);
}

function setSelectedMemberAvatar(name) {
	const avatar =
		document.getElementById(
			"selectedMemberAvatar"
		);

	if (!avatar) {
		return;
	}

	avatar.innerHTML =
		getInitial(name);
}

function showMembersLoadingState() {
	const container =
		document.getElementById(
			"memberList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="permission-state">

			<div class="permission-state-icon permission-loading">
				<i class="bi bi-people-fill"></i>
			</div>

			<h6 class="fw-bold text-primary">
				Loading members
			</h6>

			<p class="text-muted small mb-0">
				Preparing workspace member list.
			</p>

		</div>
	`;
}

function showMembersErrorState(message) {
	const container =
		document.getElementById(
			"memberList"
		);

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="permission-state">

			<div class="permission-state-icon bg-danger">
				<i class="bi bi-exclamation-triangle-fill"></i>
			</div>

			<h6 class="fw-bold text-danger">
				Unable to load members
			</h6>

			<p class="text-muted small mb-0">
				${escapeHtml(message)}
			</p>

		</div>
	`;
}

function showPermissionLoadingState() {
	const tbody =
		document.getElementById(
			"permissionTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `
		<tr>
			<td colspan="8">

				<div class="permission-state">

					<div class="permission-state-icon permission-loading">
						<i class="bi bi-ui-checks-grid"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading permissions
					</h5>

					<p class="text-muted mb-0">
						Preparing module access for the selected member.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function getModuleIcon(module) {
	const icons = {
		DASHBOARD:
			"bi bi-speedometer2",

		PATIENTS:
			"bi bi-people-fill",

		APPOINTMENTS:
			"bi bi-calendar-check-fill",

		DOCTORS:
			"bi bi-person-badge-fill",

		STAFF:
			"bi bi-person-workspace",

		PRESCRIPTIONS:
			"bi bi-file-medical-fill",

		OPD:
			"bi bi-hospital-fill",

		IPD:
			"bi bi-bed-fill",

		BILLING:
			"bi bi-receipt-cutoff",

		PHARMACY:
			"bi bi-capsule-pill",

		INVENTORY:
			"bi bi-boxes",

		LAB:
			"bi bi-droplet-half",

		RADIOLOGY:
			"bi bi-radioactive",

		REPORTS:
			"bi bi-bar-chart-fill",

		NOTIFICATIONS:
			"bi bi-bell-fill",

		SETTINGS:
			"bi bi-gear-fill",

		PERMISSIONS:
			"bi bi-shield-lock-fill"
	};

	return (
		icons[module] ||
		"bi bi-grid-fill"
	);
}

function getInitial(value) {
	const text =
		String(value || "")
			.trim();

	if (!text) {
		return '<i class="bi bi-person-fill"></i>';
	}

	return escapeHtml(
		text.charAt(0)
			.toUpperCase()
	);
}

function formatLabel(value) {
	return String(value || "")
		.replace(/_/g, " ")
		.toLowerCase()
		.replace(
			/\b\w/g,
			character =>
				character.toUpperCase()
		);
}

function normalizeArrayResponse(result) {
	if (Array.isArray(result)) {
		return result;
	}

	if (Array.isArray(result?.data)) {
		return result.data;
	}

	if (Array.isArray(result?.content)) {
		return result.content;
	}

	return [];
}

function getValue(id) {
	const element =
		document.getElementById(id);

	return element
		? String(
			element.value || ""
		).trim()
		: "";
}

function setText(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value ?? "";
	}
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
			return {
				rawBody:
					text
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

	if (data.message) {
		return data.message;
	}

	if (data.error) {
		return data.error;
	}

	if (data.rawBody) {
		return data.rawBody;
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
	const box =
		document.getElementById(
			"msg"
		);

	if (!box) {
		alert(message);
		return;
	}

	box.innerHTML = `
		<div class="alert alert-${type} alert-dismissible fade show"
			 role="alert">

			${escapeHtml(message)}

			<button type="button"
					class="btn-close"
					data-bs-dismiss="alert"></button>

		</div>
	`;

	setTimeout(
		function() {
			if (box) {
				box.innerHTML = "";
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
		500;

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

	function update(currentTime) {
		const progress =
			Math.min(
				(currentTime - startTime) /
				duration,
				1
			);

		const eased =
			1 -
			Math.pow(
				1 - progress,
				3
			);

		element.textContent =
			Math.round(
				start +
				difference *
				eased
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

function toPositiveNumberOrNull(value) {
	const number =
		Number(value);

	return Number.isFinite(number) &&
		number > 0
		? number
		: null;
}

function safeNumber(value) {
	const number =
		Number(value);

	return Number.isFinite(number)
		? number
		: 0;
}

function cssEscape(value) {
	if (
		window.CSS &&
		typeof window.CSS.escape ===
		"function"
	) {
		return window.CSS.escape(
			String(value ?? "")
		);
	}

	return String(value ?? "")
		.replace(
			/["\\]/g,
			"\\$&"
		);
}

function escapeAttribute(value) {
	return escapeHtml(value);
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
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

window.addEventListener(
	"beforeunload",
	function(event) {
		if (
			!hasUnsavedPermissionChanges()
		) {
			return;
		}

		event.preventDefault();
		event.returnValue = "";
	}
);