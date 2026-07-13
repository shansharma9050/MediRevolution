document.addEventListener("DOMContentLoaded", function() {
	requireDoctorRole();
	loadDoctorDashboard();
});

function requireDoctorRole() {
	const role =
		localStorage.getItem("role");

	if (role !== "DOCTOR") {
		alert(
			"Access denied. Only DOCTOR can access this page."
		);

		window.location.href = "/dashboard";
	}
}

async function loadDoctorDashboard() {
	const token =
		localStorage.getItem("token");

	setDashboardLoading(true);

	try {
		const [
			patientsRes,
			prescriptionsRes,
			appointmentsRes
		] = await Promise.all([
			fetch(
				`${API_BASE}/doctor/patients`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			),

			fetch(
				`${API_BASE}/doctor/prescriptions`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			),

			fetch(
				`${API_BASE}/doctor/appointments`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			)
		]);

		const patients =
			patientsRes.ok
				? await readJsonListSafely(
					patientsRes
				)
				: [];

		const prescriptions =
			prescriptionsRes.ok
				? await readJsonListSafely(
					prescriptionsRes
				)
				: [];

		const appointments =
			appointmentsRes.ok
				? await readJsonListSafely(
					appointmentsRes
				)
				: [];

		animateCounter(
			"patientsCount",
			patients.length
		);

		animateCounter(
			"prescriptionsCount",
			prescriptions.length
		);

		animateCounter(
			"appointmentsCount",
			appointments.length
		);

		animateCounter(
			"requestedCount",
			appointments.filter(
				a =>
					a.status === "REQUESTED" ||
					a.status === "PENDING"
			).length
		);

		if (
			!patientsRes.ok ||
			!prescriptionsRes.ok ||
			!appointmentsRes.ok
		) {
			showDoctorMessage(
				"Some dashboard data could not be loaded.",
				"warning"
			);
		}

	} catch (e) {
		console.error(
			"Doctor dashboard load error:",
			e
		);

		showDoctorMessage(
			"Doctor service not reachable."
		);

		animateCounter(
			"patientsCount",
			0
		);

		animateCounter(
			"prescriptionsCount",
			0
		);

		animateCounter(
			"appointmentsCount",
			0
		);

		animateCounter(
			"requestedCount",
			0
		);

	} finally {
		setDashboardLoading(false);
	}
}

async function readJsonListSafely(response) {
	try {
		const result =
			await response.json();

		if (Array.isArray(result)) {
			return result;
		}

		if (
			result &&
			Array.isArray(result.data)
		) {
			return result.data;
		}

		if (
			result &&
			Array.isArray(result.content)
		) {
			return result.content;
		}

		return [];

	} catch (error) {
		return [];
	}
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

function setDashboardLoading(isLoading) {
	const loading =
		document.getElementById(
			"doctorDashboardLoading"
		);

	if (!loading) {
		return;
	}

	loading.classList.toggle(
		"active",
		Boolean(isLoading)
	);
}

function showDoctorMessage(
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