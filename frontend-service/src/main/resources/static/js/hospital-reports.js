let hospitalReportRows = [];

document.addEventListener("DOMContentLoaded", function() {
	requireHospitalRole();
	loadHospitalReports();
});

function requireHospitalRole() {
	if (localStorage.getItem("role") !== "HOSPITAL") {
		alert("Access denied. Only HOSPITAL can access this page.");
		window.location.href = "/dashboard";
	}
}

async function loadHospitalReports() {
	const token =
		localStorage.getItem("token");

	showHospitalReportLoadingState();

	try {
		const [
			patientsRes,
			inventoryRes,
			billsRes
		] = await Promise.all([
			fetch(
				`${API_BASE}/hospital/patients`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			),

			fetch(
				`${API_BASE}/hospital/inventory`,
				{
					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			),

			fetch(
				`${API_BASE}/hospital/bills`,
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

		const inventory =
			inventoryRes.ok
				? await readJsonListSafely(
					inventoryRes
				)
				: [];

		const bills =
			billsRes.ok
				? await readJsonListSafely(
					billsRes
				)
				: [];

		setSummaryValue(
			"opdCount",
			patients.filter(
				p =>
					p.patientType === "OPD"
			).length
		);

		setSummaryValue(
			"ipdCount",
			patients.filter(
				p =>
					p.patientType === "IPD"
			).length
		);

		const totalBilling =
			bills.reduce(
				(sum, bill) =>
					sum +
					Number(
						bill.totalAmount || 0
					),
				0
			);

		const billingValue =
			document.getElementById(
				"billingValue"
			);

		if (billingValue) {
			billingValue.innerText =
				formatShortMoney(totalBilling);
		}

		setSummaryValue(
			"lowStockCount",
			inventory.filter(
				item =>
					Number(item.quantity || 0) <=
					Number(item.minimumQuantity || 0)
			).length
		);

		renderBillReport(bills);

		if (
			!patientsRes.ok ||
			!inventoryRes.ok ||
			!billsRes.ok
		) {
			showHospitalReportMessage(
				"Some report data could not be loaded.",
				"warning"
			);
		}

	} catch (e) {
		console.error(
			"Hospital report load error:",
			e
		);

		setSummaryValue(
			"opdCount",
			0
		);

		setSummaryValue(
			"ipdCount",
			0
		);

		setSummaryValue(
			"lowStockCount",
			0
		);

		const billingValue =
			document.getElementById(
				"billingValue"
			);

		if (billingValue) {
			billingValue.innerText =
				"₹0";
		}

		hospitalReportRows = [];

		showHospitalReportErrorState(
			"Hospital service not reachable."
		);

		showHospitalReportMessage(
			"Hospital service not reachable."
		);
	}
}

function renderBillReport(bills) {
	const table =
		document.getElementById(
			"hospitalReportTable"
		);

	if (!table) {
		return;
	}

	const list =
		Array.isArray(bills)
			? bills
			: [];

	hospitalReportRows =
		list.map(function(bill) {

			const patient =
				bill.patient || {};

			return {
				patient:
					patient.patientName || "",

				patientType:
					patient.patientType || "",

				totalAmount:
					bill.totalAmount,

				status:
					bill.status,

				date:
					bill.createdAt
			};

		});

	if (!list.length) {
		table.innerHTML = `
			<tr>
				<td colspan="6">

					<div class="hospital-reports-state">

						<div class="hospital-reports-state-icon">
							<i class="bi bi-receipt"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No bill data found
						</h5>

						<p class="text-muted mb-0">
							Billing analytics will appear after hospital bills are created.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	let html = "";

	list.forEach(
		function(bill, index) {

			const patient =
				bill.patient || {};

			html += `
				<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

					<td>
						<strong>${index + 1}</strong>
					</td>

					<td>
						<div class="hospital-report-patient">

							<div class="hospital-report-avatar">
								<i class="bi bi-person-fill"></i>
							</div>

							<strong class="text-primary">
								${safe(patient.patientName)}
							</strong>

						</div>
					</td>

					<td>
						${patientTypeBadge(patient.patientType)}
					</td>

					<td>
						<strong class="text-primary">
							₹${formatMoney(bill.totalAmount)}
						</strong>
					</td>

					<td>
						${billStatusBadge(bill.status)}
					</td>

					<td>
						${formatDateTime(bill.createdAt)}
					</td>

				</tr>
			`;

		}
	);

	table.innerHTML = html;
}

function showHospitalReportLoadingState() {
	const table =
		document.getElementById(
			"hospitalReportTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="6">

				<div class="hospital-reports-state">

					<div class="hospital-reports-state-icon hospital-reports-loading-icon">
						<i class="bi bi-bar-chart-fill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading report
					</h5>

					<p class="text-muted mb-0">
						Please wait while we prepare hospital analytics.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showHospitalReportErrorState(message) {
	const table =
		document.getElementById(
			"hospitalReportTable"
		);

	if (!table) {
		return;
	}

	table.innerHTML = `
		<tr>
			<td colspan="6">

				<div class="hospital-reports-state">

					<div class="hospital-reports-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load report
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
}

function exportHospitalReportCsv() {
	if (!hospitalReportRows.length) {
		alert("No data to export");
		return;
	}

	const headers =
		Object.keys(
			hospitalReportRows[0]
		);

	const csvRows = [
		headers
			.map(csvEscape)
			.join(","),

		...hospitalReportRows.map(
			row =>
				headers
					.map(
						header =>
							csvEscape(
								row[header]
							)
					)
					.join(",")
		)
	];

	const csv =
		"\uFEFF" +
		csvRows.join("\n");

	const blob =
		new Blob(
			[csv],
			{
				type:
					"text/csv;charset=utf-8;"
			}
		);

	const url =
		URL.createObjectURL(blob);

	const anchor =
		document.createElement("a");

	anchor.href = url;
	anchor.download =
		`hospital-report-${getTodayFileName()}.csv`;

	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();

	URL.revokeObjectURL(url);
}

function patientTypeBadge(type) {
	if (type === "OPD") {
		return `
			<span class="hospital-report-type opd">
				<i class="bi bi-person-walking"></i>
				OPD
			</span>
		`;
	}

	if (type === "IPD") {
		return `
			<span class="hospital-report-type ipd">
				<i class="bi bi-hospital-fill"></i>
				IPD
			</span>
		`;
	}

	return `
		<span class="badge bg-secondary">
			${safe(type)}
		</span>
	`;
}

function billStatusBadge(status) {
	const value =
		String(status || "")
			.toUpperCase();

	if (value === "PAID") {
		return `
			<span class="hospital-report-status paid">
				<i class="bi bi-check2-circle"></i>
				PAID
			</span>
		`;
	}

	if (value === "PENDING") {
		return `
			<span class="hospital-report-status pending">
				<i class="bi bi-hourglass-split"></i>
				PENDING
			</span>
		`;
	}

	return `
		<span class="hospital-report-status default">
			${safe(value)}
		</span>
	`;
}

function csvEscape(value) {
	const text =
		value === null ||
			value === undefined
			? ""
			: String(value);

	return `"${text.replace(/"/g, '""')}"`;
}

function getTodayFileName() {
	const today =
		new Date();

	return [
		today.getFullYear(),
		String(
			today.getMonth() + 1
		).padStart(2, "0"),
		String(
			today.getDate()
		).padStart(2, "0")
	].join("-");
}

function formatShortMoney(value) {
	const numericValue =
		Number(value || 0);

	if (numericValue >= 100000) {
		return "₹" +
			(numericValue / 100000)
				.toFixed(1) +
			"L";
	}

	if (numericValue >= 1000) {
		return "₹" +
			(numericValue / 1000)
				.toFixed(1) +
			"K";
	}

	return "₹" +
		numericValue.toFixed(0);
}

function formatMoney(value) {
	return value === null ||
		value === undefined
		? "0.00"
		: Number(value).toFixed(2);
}

function formatDateTime(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (Number.isNaN(date.getTime())) {
		return safe(value);
	}

	return date.toLocaleString(
		"en-IN",
		{
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		}
	);
}

function setSummaryValue(id, value) {
	const element =
		document.getElementById(id);

	if (!element) {
		return;
	}

	const target =
		Number(value) || 0;

	const start =
		Number(element.textContent) || 0;

	const difference =
		target - start;

	const duration = 500;
	const startTime = performance.now();

	if (
		window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches ||
		difference === 0
	) {
		element.textContent = target;
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
			1 - Math.pow(1 - progress, 3);

		element.textContent =
			Math.round(
				start +
				difference * eased
			);

		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
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

function showHospitalReportMessage(
	message,
	type = "danger"
) {
	const msg =
		document.getElementById("msg");

	if (!msg) {
		return;
	}

	msg.innerHTML =
		`<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

	setTimeout(function() {
		if (msg) {
			msg.innerHTML = "";
		}
	}, 4000);
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
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/'/g, "&#39;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}