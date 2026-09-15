"use strict";


/*
 * ============================================================
 * ACTION RENDERER
 * ============================================================
 *
 * Overrides only action rules.
 * Existing 35 KB diagnostics implementation remains intact.
 */

getActionButtons =
	function(
		orderId,
		order
	) {

		const status =
			String(
				order?.status || ""
			)
				.toUpperCase();


		const type =
			String(
				order?.diagnosticType
				||
				diagnosticType
				||
				"LAB"
			)
				.toUpperCase();


		let html =
			"";


		/*
		 * --------------------------------------------------------
		 * ORDERED
		 * --------------------------------------------------------
		 */

		if (
			status
				=== "ORDERED"
		) {

			if (
				type === "LAB"
			) {

				html += `
					<button
						type="button"
						class="btn btn-sm btn-outline-warning update-order-btn"
						onclick="updateStatus(${orderId}, 'SAMPLE_COLLECTED')">

						<i class="bi bi-droplet-fill me-1"></i>
						Sample

					</button>
				`;

			} else {

				html += `
					<button
						type="button"
						class="btn btn-sm btn-outline-primary update-order-btn"
						onclick="updateStatus(${orderId}, 'IN_PROCESS')">

						<i class="bi bi-activity me-1"></i>
						Start

					</button>
				`;
			}


			html += `
				<button
					type="button"
					class="btn btn-sm btn-outline-danger update-order-btn"
					onclick="cancelDiagnosticOrder(${orderId})">

					<i class="bi bi-x-circle me-1"></i>
					Cancel

				</button>
			`;
		}


		/*
		 * --------------------------------------------------------
		 * LAB SAMPLE → PROCESS
		 * --------------------------------------------------------
		 */

		if (
			status
				=== "SAMPLE_COLLECTED"
		) {

			html += `
				<button
					type="button"
					class="btn btn-sm btn-outline-primary update-order-btn"
					onclick="updateStatus(${orderId}, 'IN_PROCESS')">

					<i class="bi bi-activity me-1"></i>
					Process

				</button>
			`;
		}


		/*
		 * --------------------------------------------------------
		 * RESULT
		 * --------------------------------------------------------
		 */

		if (
			status
				=== "IN_PROCESS"
		) {

			html += `
				<button
					type="button"
					class="btn btn-sm btn-outline-success result-order-btn"
					onclick="openResultModal(${orderId})">

					<i class="bi bi-clipboard2-check-fill me-1"></i>
					Result

				</button>
			`;
		}


		/*
		 * --------------------------------------------------------
		 * REPORT
		 * --------------------------------------------------------
		 */

		if (
			status
				=== "REPORT_READY"
		) {

			html += `
				<button
					type="button"
					id="downloadReportBtn_${orderId}"
					class="btn btn-sm btn-outline-secondary print-report-btn"
					onclick="downloadPdf(${orderId})">

					<i class="bi bi-file-earmark-pdf-fill me-1"></i>
					PDF

				</button>

				<button
					type="button"
					class="btn btn-sm btn-outline-success update-order-btn"
					onclick="updateStatus(${orderId}, 'DELIVERED')">

					<i class="bi bi-send-check-fill me-1"></i>
					Deliver

				</button>
			`;
		}


		if (
			status
				=== "DELIVERED"
		) {

			html += `
				<button
					type="button"
					id="downloadReportBtn_${orderId}"
					class="btn btn-sm btn-outline-secondary print-report-btn"
					onclick="downloadPdf(${orderId})">

					<i class="bi bi-file-earmark-pdf-fill me-1"></i>
					PDF

				</button>
			`;
		}


		/*
		 * --------------------------------------------------------
		 * BILLING
		 * --------------------------------------------------------
		 */

		if (
			status
				!== "CANCELLED"
		) {

			if (
				!order.invoiceId
			) {

				html += `
					<button
						type="button"
						class="btn btn-sm btn-outline-secondary"
						onclick="createInvoice(${orderId})">

						<i class="bi bi-receipt me-1"></i>
						Invoice

					</button>
				`;

			} else {

				html += `
					<button
						type="button"
						class="btn btn-sm btn-outline-success"
						onclick="downloadInvoicePdf(${order.invoiceId})">

						<i class="bi bi-file-earmark-pdf-fill me-1"></i>
						Invoice PDF

					</button>
				`;
			}
		}


		return html || "-";
	};


/*
 * ============================================================
 * CANCEL
 * ============================================================
 */

async function cancelDiagnosticOrder(
	orderId
) {

	if (
		!diagnosticPermissions.update
	) {

		showMsg(
			"You do not have permission to cancel diagnostic orders."
		);

		return;
	}


	if (
		!window.confirm(
			"Cancel this diagnostic order?"
		)
	) {

		return;
	}


	await updateStatus(
		orderId,
		"CANCELLED"
	);
}


/*
 * ============================================================
 * RESULT MODAL GUARD
 * ============================================================
 */

if (
	typeof openResultModal
		=== "function"
) {

	const baseOpenResultModal =
		openResultModal;


	openResultModal =
		function(
			orderId
		) {

			const order =
				Array.isArray(
					allOrders
				)
					?
					allOrders.find(
						item =>
							Number(
								item.id
							)
								===
							Number(
								orderId
							)
					)
					:
					null;


			if (
				!order
				||
				String(
					order.status || ""
				)
					.toUpperCase()
					!== "IN_PROCESS"
			) {

				showMsg(
					"Result can be entered only for an IN PROCESS diagnostic order."
				);

				return;
			}


			baseOpenResultModal(
				orderId
			);
		};
}


/*
 * ============================================================
 * REFRESH PERMISSION-AWARE BUTTONS
 * ============================================================
 */

document.addEventListener(
	"DOMContentLoaded",
	function() {

		if (
			typeof renderOrders
				!== "function"
		) {

			return;
		}


		const originalRenderOrders =
			renderOrders;


		renderOrders =
			function(
				orders
			) {

				originalRenderOrders(
					orders
				);


				applyDiagnosticButtonPermissions();
			};
	}
);