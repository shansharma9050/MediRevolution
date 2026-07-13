document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadHospitalDashboard();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

async function loadHospitalDashboard() {
	const token =
		localStorage.getItem("token");

	setHospitalDashboardLoading(true);

	try {
		const response =
			await fetch(
				`${API_BASE}/hospital/dashboard-counts`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		const data =
			await readJsonSafely(response);

		if (!response.ok) {
			setDashboardCounts({
				totalPatients: 0,
				totalStaff: 0,
				inventoryItems: 0,
				totalBills: 0
			});

			showHospitalMessage(
				getErrorMessage(
					data,
					"Unable to load hospital dashboard"
				)
			);

			return;
		}

		setDashboardCounts({
			totalPatients:
				data?.totalPatients || 0,

			totalStaff:
				data?.totalStaff || 0,

			inventoryItems:
				data?.inventoryItems || 0,

			totalBills:
				data?.totalBills || 0
		});

	} catch (e) {
		console.error(
			"Hospital dashboard load error:",
			e
		);

		setDashboardCounts({
			totalPatients: 0,
			totalStaff: 0,
			inventoryItems: 0,
			totalBills: 0
		});

		showHospitalMessage(
			"Hospital service not reachable."
		);

	} finally {
		setHospitalDashboardLoading(false);
	}
}

function setDashboardCounts(data) {
	animateCounter(
		"totalPatients",
		data.totalPatients
	);

	animateCounter(
		"totalStaff",
		data.totalStaff
	);

	animateCounter(
		"inventoryItems",
		data.inventoryItems
	);

	animateCounter(
		"totalBills",
		data.totalBills
	);
}

function animateCounter(
	elementId,
	targetValue
) {
	const element =
		document.getElementById(elementId);

	if (!element) {
		return;
	}

	const startValue =
		Number(element.textContent) || 0;

	const target =
		Number(targetValue) || 0;

	const difference =
		target - startValue;

	if (
		difference === 0 ||
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches
	) {
		element.textContent = target;
		return;
	}

	const duration = 550;
	const startTime = performance.now();

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
				startValue +
				difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

function setHospitalDashboardLoading(isLoading) {
	const loading =
		document.getElementById(
			"hospitalDashboardLoading"
		);

	if (!loading) {
		return;
	}

	loading.classList.toggle(
		"active",
		Boolean(isLoading)
	);
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

function showHospitalMessage(
	message,
	type = "danger"
) {
	const msgBox =
		document.getElementById("msg");

	if (!msgBox) {
		return;
	}

	msgBox.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

	setTimeout(function() {
		if (msgBox) {
			msgBox.innerHTML = "";
		}
	}, 4000);
}

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}