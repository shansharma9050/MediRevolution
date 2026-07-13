let saleModal;
let stockOptions = [];
let allSales = [];

let pharmacyPermissions = {
	create: false,
	update: false,
	delete: false,
	print: false
};

let isLoadingSales = false;
let isLoadingStocks = false;
let isLoadingPatients = false;
let isSavingSale = false;
let isDownloadingInvoice = false;

document.addEventListener("DOMContentLoaded", async function() {
	const allowed =
		await protectSaasPage(
			"PHARMACY",
			"VIEW"
		);

	if (!allowed) {
		return;
	}

	const tenantId =
		localStorage.getItem("tenantId");

	const tenantName =
		localStorage.getItem("tenantName");

	if (!tenantId) {
		alert("Please select SaaS workspace first.");
		window.location.href = "/saas/workspaces";
		return;
	}

	setText(
		"tenantNameText",
		tenantName || "your workspace"
	);

	const saleModalElement =
		document.getElementById(
			"saleModal"
		);

	if (saleModalElement) {
		saleModal =
			bootstrap.Modal.getOrCreateInstance(
				saleModalElement
			);
	}

	await applyPharmacyButtonPermissions();

	await Promise.all([
		loadPatientsDropdown(),
		loadStockOptions()
	]);

	await loadSales();
});

async function loadSales() {
	if (isLoadingSales) {
		return;
	}

	isLoadingSales = true;

	showSalesLoadingState();

	pharmacySetButtonLoading(
		"refreshSalesBtn",
		"Refreshing...",
		true
	);

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
				`${API_BASE}/saas/pharmacy/sales?${query.toString()}`,
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
			await pharmacySafeJson(
				response
			);

		if (!response.ok) {
			allSales = [];

			const message =
				getApiErrorMessage(
					result,
					"Unable to load sales."
				);

			showMsg(message);
			showSalesErrorState(message);
			updateSalesSummary();

			return;
		}

		allSales =
			normalizeArrayResponse(
				result
			);

		allSales.sort(
			function(a, b) {
				return (
					safeDateTimestamp(
						b.saleDateTime
					) -
					safeDateTimestamp(
						a.saleDateTime
					)
				);
			}
		);

		renderSales(allSales);
		updateSalesSummary();

		await applyPharmacyButtonPermissions();

	} catch (error) {
		console.error(
			"Load pharmacy sales error:",
			error
		);

		allSales = [];

		showMsg(
			"SaaS service not reachable."
		);

		showSalesErrorState(
			"SaaS pharmacy service is currently unavailable."
		);

		updateSalesSummary();

	} finally {
		isLoadingSales = false;

		pharmacySetButtonLoading(
			"refreshSalesBtn",
			"Refresh",
			false
		);
	}
}

function filterSales() {
	const keyword =
		getValue(
			"saleSearchBox"
		).toLowerCase();

	const statusFilter =
		getValue(
			"saleStatusFilter"
		).toUpperCase();

	const filtered =
		allSales.filter(
			function(sale) {
				const searchableText = [
					sale.saleNumber,
					sale.patientName,
					sale.patientMobile,
					sale.status
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				const keywordMatches =
					!keyword ||
					searchableText.includes(
						keyword
					);

				const normalizedStatus =
					normalizeSaleStatus(
						sale.status
					);

				const statusMatches =
					!statusFilter ||
					normalizedStatus ===
					statusFilter;

				return (
					keywordMatches &&
					statusMatches
				);
			}
		);

	renderSales(filtered);
}

function renderSales(sales) {
	const tbody =
		document.getElementById(
			"salesTableBody"
		);

	if (!tbody) {
		return;
	}

	const list =
		Array.isArray(sales)
			? sales
			: [];

	if (!list.length) {
		tbody.innerHTML = `
			<tr>
				<td colspan="7">

					<div class="pharmacy-state">

						<div class="pharmacy-state-icon">
							<i class="bi bi-bag-x-fill"></i>
						</div>

						<h5 class="fw-bold text-primary">
							No pharmacy sales found
						</h5>

						<p class="text-muted mb-0">
							Create a medicine sale or change the selected filters.
						</p>

					</div>

				</td>
			</tr>
		`;

		return;
	}

	tbody.innerHTML =
		list.map(
			function(sale, index) {
				const invoiceId =
					safeNumber(
						sale.invoiceId
					);

				const tenantId =
					safeNumber(
						sale.tenantId
					);

				return `
					<tr style="--row-delay:${Math.min(index * 55, 330)}ms">

						<td>
							<strong class="text-primary">
								${safe(sale.saleNumber)}
							</strong>

							<div class="text-muted small">
								${formatDateTime(sale.saleDateTime)}
							</div>
						</td>

						<td>
							<div class="pharmacy-person">

								<div class="pharmacy-person-icon">
									<i class="bi bi-person-fill"></i>
								</div>

								<div>
									<strong class="text-primary">
										${safe(sale.patientName)}
									</strong>

									<div class="text-muted small">
										${safe(sale.patientMobile)}
									</div>
								</div>

							</div>
						</td>

						<td>
							<strong>₹${formatAmount(sale.totalAmount)}</strong>
						</td>

						<td>
							₹${formatAmount(sale.paidAmount)}
						</td>

						<td>
							₹${formatAmount(sale.dueAmount)}
						</td>

						<td>
							${getSaleStatusBadge(sale.status)}
						</td>

						<td>
							${invoiceId
						? `
									<button type="button"
											id="invoicePdfBtn_${invoiceId}"
											class="btn btn-sm btn-outline-secondary print-pharmacy-btn"
											onclick="downloadInvoicePdf(${invoiceId}, ${tenantId})">
										<i class="bi bi-file-earmark-pdf-fill me-1"></i>
										Invoice PDF
									</button>
								`
						: "-"
					}
						</td>

					</tr>
				`;
			}
		).join("");

	applyPharmacyButtonPermissions();
}

async function applyPharmacyButtonPermissions() {
	const [
		canCreate,
		canUpdate,
		canDelete,
		canPrint
	] =
		await Promise.all([
			hasSaasPermission(
				"PHARMACY",
				"CREATE"
			),
			hasSaasPermission(
				"PHARMACY",
				"UPDATE"
			),
			hasSaasPermission(
				"PHARMACY",
				"DELETE"
			),
			hasSaasPermission(
				"PHARMACY",
				"PRINT"
			)
		]);

	pharmacyPermissions = {
		create:
			Boolean(canCreate),

		update:
			Boolean(canUpdate),

		delete:
			Boolean(canDelete),

		print:
			Boolean(canPrint)
	};

	showOrHideById(
		"addMedicineBtn",
		pharmacyPermissions.create
	);

	showOrHideById(
		"createSaleBtn",
		pharmacyPermissions.create
	);

	showOrHideByClass(
		"edit-medicine-btn",
		pharmacyPermissions.update
	);

	showOrHideByClass(
		"delete-medicine-btn",
		pharmacyPermissions.delete
	);

	showOrHideByClass(
		"print-pharmacy-btn",
		pharmacyPermissions.print
	);
}

async function downloadInvoicePdf(
	invoiceId,
	tenantId
) {
	if (isDownloadingInvoice) {
		return;
	}

	if (!pharmacyPermissions.print) {
		showMsg(
			"You do not have permission to print pharmacy invoices."
		);

		return;
	}

	const numericInvoiceId =
		toPositiveNumberOrNull(
			invoiceId
		);

	const numericTenantId =
		toPositiveNumberOrNull(
			tenantId
		) ||
		toPositiveNumberOrNull(
			localStorage.getItem(
				"tenantId"
			)
		);

	if (!numericInvoiceId) {
		showMsg(
			"Invalid invoice selected."
		);

		return;
	}

	const token =
		localStorage.getItem(
			"token"
		);

	if (!token) {
		alert(
			"Session expired. Please login again."
		);

		window.location.href =
			"/login";

		return;
	}

	isDownloadingInvoice = true;

	pharmacySetButtonLoading(
		`invoicePdfBtn_${numericInvoiceId}`,
		"Downloading...",
		true
	);

	try {
		const query =
			new URLSearchParams({
				tenantId:
					String(
						numericTenantId
					)
			});

		const response =
			await fetch(
				`${API_BASE}/saas/billing/invoices/${encodeURIComponent(numericInvoiceId)}/pdf?${query.toString()}`,
				{
					method: "GET",

					headers: {
						"Authorization":
							"Bearer " + token
					}
				}
			);

		if (!response.ok) {
			const result =
				await pharmacySafeJson(
					response
				);

			throw new Error(
				getApiErrorMessage(
					result,
					"Unable to download invoice PDF."
				)
			);
		}

		const blob =
			await response.blob();

		if (!blob.size) {
			throw new Error(
				"Invoice PDF is empty."
			);
		}

		const fileUrl =
			window.URL.createObjectURL(
				blob
			);

		const link =
			document.createElement(
				"a"
			);

		link.href =
			fileUrl;

		link.download =
			`invoice-${numericInvoiceId}.pdf`;

		document.body.appendChild(
			link
		);

		link.click();
		link.remove();

		setTimeout(
			function() {
				window.URL.revokeObjectURL(
					fileUrl
				);
			},
			1000
		);

		showMsg(
			"Invoice PDF downloaded successfully.",
			"success"
		);

	} catch (error) {
		console.error(
			"Download pharmacy invoice error:",
			error
		);

		showMsg(
			error.message ||
			"Something went wrong while downloading invoice PDF."
		);

	} finally {
		isDownloadingInvoice = false;

		pharmacySetButtonLoading(
			`invoicePdfBtn_${numericInvoiceId}`,
			"Invoice PDF",
			false
		);
	}
}

function openSaleModal() {
	if (!pharmacyPermissions.create) {
		showMsg(
			"You do not have permission to create pharmacy sales."
		);

		return;
	}

	const availableStocks =
		getAvailableStockOptions();

	if (!availableStocks.length) {
		showMsg(
			"No available medicine stock found."
		);

		return;
	}

	clearSaleForm();
	addSaleRow();

	if (saleModal) {
		saleModal.show();
	}
}

async function saveSale() {
	if (isSavingSale) {
		return;
	}

	if (!pharmacyPermissions.create) {
		showMsg(
			"You do not have permission to create pharmacy sales."
		);

		return;
	}

	const payload = {
		tenantId:
			toPositiveNumberOrNull(
				localStorage.getItem(
					"tenantId"
				)
			),

		patientId:
			toPositiveNumberOrNull(
				getValue("patientId")
			),

		discountAmount:
			toNonNegativeNumber(
				getValue(
					"discountAmount"
				)
			),

		taxAmount:
			toNonNegativeNumber(
				getValue(
					"taxAmount"
				)
			),

		paidAmount:
			toNonNegativeNumber(
				getValue(
					"paidAmount"
				)
			),

		paymentMode:
			getValue("paymentMode"),

		items:
			collectSaleItems()
	};

	if (!payload.tenantId) {
		showMsg(
			"Please select SaaS workspace first."
		);

		return;
	}

	if (!payload.patientId) {
		showMsg(
			"Please select patient."
		);

		return;
	}

	if (!payload.items.length) {
		showMsg(
			"Please add at least one valid sale item."
		);

		return;
	}

	if (
		payload.paidAmount > 0 &&
		!payload.paymentMode
	) {
		showMsg(
			"Please select payment mode."
		);

		return;
	}

	const validationError =
		validateSaleRows();

	if (validationError) {
		showMsg(
			validationError
		);

		return;
	}

	isSavingSale = true;

	pharmacySetButtonLoading(
		"saveSaleBtn",
		"Saving...",
		true
	);

	try {
		const response =
			await fetch(
				`${API_BASE}/saas/pharmacy/sales`,
				{
					method:
						"POST",

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
			await pharmacySafeJson(
				response
			);

		if (!response.ok) {
			showMsg(
				getApiErrorMessage(
					result,
					"Unable to save sale."
				)
			);

			return;
		}

		if (saleModal) {
			saleModal.hide();
		}

		clearSaleForm();

		showMsg(
			"Medicine sale completed successfully.",
			"success"
		);

		await Promise.all([
			loadStockOptions(),
			loadSales()
		]);

	} catch (error) {
		console.error(
			"Save pharmacy sale error:",
			error
		);

		showMsg(
			"Something went wrong while saving sale."
		);

	} finally {
		isSavingSale = false;

		pharmacySetButtonLoading(
			"saveSaleBtn",
			"Save Sale",
			false
		);
	}
}

function addSaleRow() {
	const tbody =
		document.getElementById(
			"saleRows"
		);

	if (!tbody) {
		return;
	}

	const row =
		document.createElement(
			"tr"
		);

	const medicineCell =
		document.createElement(
			"td"
		);

	const availableCell =
		document.createElement(
			"td"
		);

	const priceCell =
		document.createElement(
			"td"
		);

	const quantityCell =
		document.createElement(
			"td"
		);

	const totalCell =
		document.createElement(
			"td"
		);

	const actionCell =
		document.createElement(
			"td"
		);

	const select =
		document.createElement(
			"select"
		);

	select.className =
		"form-select sale-stock";

	select.addEventListener(
		"change",
		function() {
			updateSaleRowInfo(this);
		}
	);

	buildStockOptions(
		select
	);

	availableCell.className =
		"available-qty";

	availableCell.textContent =
		"-";

	priceCell.className =
		"sale-price";

	priceCell.textContent =
		"₹0.00";

	const quantity =
		document.createElement(
			"input"
		);

	quantity.type =
		"number";

	quantity.className =
		"form-control sale-qty";

	quantity.value =
		"1";

	quantity.min =
		"1";

	quantity.addEventListener(
		"input",
		function() {
			updateSaleRowTotal(
				this
			);
		}
	);

	totalCell.className =
		"line-total fw-bold text-primary";

	totalCell.textContent =
		"₹0.00";

	const removeButton =
		document.createElement(
			"button"
		);

	removeButton.type =
		"button";

	removeButton.className =
		"btn btn-sm btn-outline-danger";

	removeButton.innerHTML =
		'<i class="bi bi-trash-fill"></i>';

	removeButton.addEventListener(
		"click",
		function() {
			removeSaleRow(this);
		}
	);

	medicineCell.appendChild(
		select
	);

	quantityCell.appendChild(
		quantity
	);

	actionCell.appendChild(
		removeButton
	);

	row.appendChild(
		medicineCell
	);

	row.appendChild(
		availableCell
	);

	row.appendChild(
		priceCell
	);

	row.appendChild(
		quantityCell
	);

	row.appendChild(
		totalCell
	);

	row.appendChild(
		actionCell
	);

	tbody.appendChild(
		row
	);

	updateSalePreview();
}

function buildStockOptions(select) {
	const placeholder =
		document.createElement(
			"option"
		);

	placeholder.value =
		"";

	placeholder.textContent =
		"Select Medicine Batch";

	select.appendChild(
		placeholder
	);

	getAvailableStockOptions()
		.forEach(
			function(stock) {
				const option =
					document.createElement(
						"option"
					);

				option.value =
					String(stock.id);

				option.dataset.medicineId =
					String(
						stock.medicineId
					);

				option.dataset.qty =
					String(
						toNonNegativeNumber(
							stock.currentQuantity
						)
					);

				option.dataset.price =
					String(
						toNonNegativeNumber(
							stock.salePrice
						)
					);

				option.textContent =
					`${stock.medicineName || "Medicine"} | ` +
					`Batch: ${stock.batchNumber || "-"} | ` +
					`Qty: ${toNonNegativeNumber(stock.currentQuantity)} | ` +
					`₹${formatAmount(stock.salePrice)}`;

				select.appendChild(
					option
				);
			}
		);
}

function getAvailableStockOptions() {
	return stockOptions.filter(
		function(stock) {
			return (
				toNonNegativeNumber(
					stock.currentQuantity
				) > 0 &&
				stock.expired !== true
			);
		}
	);
}

function removeSaleRow(button) {
	const row =
		button.closest("tr");

	if (row) {
		row.remove();
	}

	if (
		!document.querySelector(
			"#saleRows tr"
		)
	) {
		addSaleRow();
	}

	updateSalePreview();
}

function updateSaleRowInfo(select) {
	const option =
		select.options[
		select.selectedIndex
		];

	const row =
		select.closest("tr");

	if (!row) {
		return;
	}

	const selectedStockId =
		select.value;

	if (
		selectedStockId &&
		isDuplicateStockSelection(
			select,
			selectedStockId
		)
	) {
		showMsg(
			"This medicine batch is already selected."
		);

		select.value =
			"";
	}

	const activeOption =
		select.options[
		select.selectedIndex
		];

	const availableQty =
		toNonNegativeNumber(
			activeOption?.dataset.qty
		);

	const salePrice =
		toNonNegativeNumber(
			activeOption?.dataset.price
		);

	const availableCell =
		row.querySelector(
			".available-qty"
		);

	const priceCell =
		row.querySelector(
			".sale-price"
		);

	const quantityInput =
		row.querySelector(
			".sale-qty"
		);

	if (availableCell) {
		availableCell.textContent =
			select.value
				? String(availableQty)
				: "-";
	}

	if (priceCell) {
		priceCell.textContent =
			select.value
				? `₹${formatAmount(salePrice)}`
				: "₹0.00";
	}

	if (quantityInput) {
		quantityInput.max =
			select.value
				? String(availableQty)
				: "";
	}

	updateSaleRowTotal(
		quantityInput
	);
}

function isDuplicateStockSelection(
	currentSelect,
	stockId
) {
	return Array.from(
		document.querySelectorAll(
			"#saleRows .sale-stock"
		)
	).some(
		function(select) {
			return (
				select !== currentSelect &&
				select.value === stockId
			);
		}
	);
}

function updateSaleRowTotal(input) {
	const row =
		input?.closest("tr");

	if (!row) {
		updateSalePreview();
		return;
	}

	const select =
		row.querySelector(
			".sale-stock"
		);

	const option =
		select?.options[
		select.selectedIndex
		];

	const price =
		toNonNegativeNumber(
			option?.dataset.price
		);

	const quantity =
		toNonNegativeNumber(
			input?.value
		);

	const totalCell =
		row.querySelector(
			".line-total"
		);

	if (totalCell) {
		totalCell.textContent =
			`₹${formatAmount(price * quantity)}`;
	}

	updateSalePreview();
}

function collectSaleItems() {
	const items = [];

	document.querySelectorAll(
		"#saleRows tr"
	).forEach(
		function(row) {
			const select =
				row.querySelector(
					".sale-stock"
				);

			const quantityInput =
				row.querySelector(
					".sale-qty"
				);

			if (
				!select ||
				!quantityInput
			) {
				return;
			}

			const option =
				select.options[
				select.selectedIndex
				];

			const stockId =
				toPositiveNumberOrNull(
					select.value
				);

			const medicineId =
				toPositiveNumberOrNull(
					option?.dataset.medicineId
				);

			const quantity =
				toPositiveNumberOrNull(
					quantityInput.value
				);

			if (
				!stockId ||
				!medicineId ||
				!quantity
			) {
				return;
			}

			items.push({
				stockId:
					stockId,

				medicineId:
					medicineId,

				quantity:
					quantity
			});
		}
	);

	return items;
}

function validateSaleRows() {
	const selectedStockIds =
		new Set();

	const rows =
		Array.from(
			document.querySelectorAll(
				"#saleRows tr"
			)
		);

	for (const row of rows) {
		const select =
			row.querySelector(
				".sale-stock"
			);

		const quantityInput =
			row.querySelector(
				".sale-qty"
			);

		if (!select?.value) {
			continue;
		}

		const option =
			select.options[
			select.selectedIndex
			];

		const stockId =
			select.value;

		const quantity =
			Number(
				quantityInput?.value
			);

		const availableQty =
			Number(
				option?.dataset.qty ||
				0
			);

		if (
			selectedStockIds.has(
				stockId
			)
		) {
			return "Duplicate medicine batch selected.";
		}

		selectedStockIds.add(
			stockId
		);

		if (
			!Number.isFinite(quantity) ||
			quantity <= 0
		) {
			return "Sale quantity must be greater than 0.";
		}

		if (
			quantity > availableQty
		) {
			return "Sale quantity cannot exceed available stock.";
		}
	}

	return "";
}

function updateSalePreview() {
	let subtotal = 0;

	document.querySelectorAll(
		"#saleRows tr"
	).forEach(
		function(row) {
			const select =
				row.querySelector(
					".sale-stock"
				);

			const quantityInput =
				row.querySelector(
					".sale-qty"
				);

			const option =
				select?.options[
				select.selectedIndex
				];

			const price =
				toNonNegativeNumber(
					option?.dataset.price
				);

			const quantity =
				toNonNegativeNumber(
					quantityInput?.value
				);

			subtotal +=
				price * quantity;
		}
	);

	const discount =
		toNonNegativeNumber(
			getValue(
				"discountAmount"
			)
		);

	const tax =
		toNonNegativeNumber(
			getValue(
				"taxAmount"
			)
		);

	const paid =
		toNonNegativeNumber(
			getValue(
				"paidAmount"
			)
		);

	const total =
		Math.max(
			0,
			subtotal -
			discount +
			tax
		);

	const due =
		Math.max(
			0,
			total - paid
		);

	setText(
		"previewSubtotal",
		formatAmount(subtotal)
	);

	setText(
		"previewDiscount",
		formatAmount(discount)
	);

	setText(
		"previewTax",
		formatAmount(tax)
	);

	setText(
		"previewTotal",
		formatAmount(total)
	);

	setText(
		"previewDue",
		formatAmount(due)
	);
}

async function loadStockOptions() {
	if (isLoadingStocks) {
		return;
	}

	isLoadingStocks = true;

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
				`${API_BASE}/saas/inventory/stocks?${query.toString()}`,
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
			await pharmacySafeJson(
				response
			);

		stockOptions =
			response.ok
				? normalizeArrayResponse(
					result
				)
				: [];

		stockOptions.sort(
			function(a, b) {
				return String(
					a.medicineName || ""
				).localeCompare(
					String(
						b.medicineName ||
						""
					),
					"en",
					{
						sensitivity:
							"base"
					}
				);
			}
		);

		if (!response.ok) {
			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load medicine stock."
				)
			);
		}

	} catch (error) {
		console.error(
			"Load pharmacy stock options error:",
			error
		);

		stockOptions = [];

		showMsg(
			"SaaS service not reachable while loading stock."
		);

	} finally {
		isLoadingStocks = false;
	}
}

async function loadPatientsDropdown() {
	if (isLoadingPatients) {
		return;
	}

	isLoadingPatients = true;

	const select =
		document.getElementById(
			"patientId"
		);

	if (!select) {
		isLoadingPatients = false;
		return;
	}

	select.innerHTML = `
		<option value="">
			Loading patients...
		</option>
	`;

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
				`${API_BASE}/saas/patients?${query.toString()}`,
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
			await pharmacySafeJson(
				response
			);

		select.innerHTML = `
			<option value="">
				Select Patient
			</option>
		`;

		if (!response.ok) {
			showMsg(
				getApiErrorMessage(
					result,
					"Unable to load patients."
				)
			);

			return;
		}

		normalizeArrayResponse(
			result
		).forEach(
			function(patient) {
				if (!patient.id) {
					return;
				}

				const option =
					document.createElement(
						"option"
					);

				option.value =
					String(patient.id);

				option.textContent =
					`${patient.patientName || "Patient"}` +
					`${patient.mobile ? ` (${patient.mobile})` : ""}`;

				select.appendChild(
					option
				);
			}
		);

	} catch (error) {
		console.error(
			"Load pharmacy patients error:",
			error
		);

		select.innerHTML = `
			<option value="">
				Service unavailable
			</option>
		`;

	} finally {
		isLoadingPatients = false;
	}
}

function clearSaleForm() {
	[
		"patientId",
		"paymentMode"
	].forEach(
		function(id) {
			setValue(id, "");
		}
	);

	setValue(
		"paidAmount",
		"0"
	);

	setValue(
		"discountAmount",
		"0"
	);

	setValue(
		"taxAmount",
		"0"
	);

	const saleRows =
		document.getElementById(
			"saleRows"
		);

	if (saleRows) {
		saleRows.innerHTML =
			"";
	}

	updateSalePreview();
}

function updateSalesSummary() {
	setAnimatedNumber(
		"totalSaleCount",
		allSales.length
	);

	const gross =
		allSales.reduce(
			(sum, sale) =>
				sum +
				toNonNegativeNumber(
					sale.totalAmount
				),
			0
		);

	const collected =
		allSales.reduce(
			(sum, sale) =>
				sum +
				toNonNegativeNumber(
					sale.paidAmount
				),
			0
		);

	const due =
		allSales.reduce(
			(sum, sale) =>
				sum +
				toNonNegativeNumber(
					sale.dueAmount
				),
			0
		);

	setText(
		"grossSaleAmount",
		formatShortMoney(gross)
	);

	setText(
		"collectedAmount",
		formatShortMoney(collected)
	);

	setText(
		"totalDueAmount",
		formatShortMoney(due)
	);
}

function normalizeSaleStatus(status) {
	const normalized =
		String(
			status || ""
		).toUpperCase();

	if (
		[
			"PAID",
			"COMPLETED",
			"SUCCESS"
		].includes(normalized)
	) {
		return "PAID";
	}

	if (
		[
			"PARTIAL",
			"PARTIALLY_PAID"
		].includes(normalized)
	) {
		return "PARTIAL";
	}

	if (
		[
			"DUE",
			"UNPAID",
			"PENDING"
		].includes(normalized)
	) {
		return "DUE";
	}

	return normalized || "OTHER";
}

function getSaleStatusBadge(status) {
	const normalized =
		normalizeSaleStatus(
			status
		);

	if (normalized === "PAID") {
		return `
			<span class="pharmacy-status-pill paid">
				<i class="bi bi-check-circle-fill"></i>
				Paid
			</span>
		`;
	}

	if (normalized === "PARTIAL") {
		return `
			<span class="pharmacy-status-pill partial">
				<i class="bi bi-hourglass-split"></i>
				Partial
			</span>
		`;
	}

	if (normalized === "DUE") {
		return `
			<span class="pharmacy-status-pill due">
				<i class="bi bi-exclamation-circle-fill"></i>
				Due
			</span>
		`;
	}

	return `
		<span class="pharmacy-status-pill other">
			<i class="bi bi-info-circle-fill"></i>
			${escapeHtml(normalized)}
		</span>
	`;
}

function showSalesLoadingState() {
	const tbody =
		document.getElementById(
			"salesTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `
		<tr>
			<td colspan="7">

				<div class="pharmacy-state">

					<div class="pharmacy-state-icon pharmacy-loading">
						<i class="bi bi-capsule-pill"></i>
					</div>

					<h5 class="fw-bold text-primary">
						Loading pharmacy sales
					</h5>

					<p class="text-muted mb-0">
						Please wait while medicine sales are prepared.
					</p>

				</div>

			</td>
		</tr>
	`;
}

function showSalesErrorState(message) {
	const tbody =
		document.getElementById(
			"salesTableBody"
		);

	if (!tbody) {
		return;
	}

	tbody.innerHTML = `
		<tr>
			<td colspan="7">

				<div class="pharmacy-state">

					<div class="pharmacy-state-icon bg-danger">
						<i class="bi bi-exclamation-triangle-fill"></i>
					</div>

					<h5 class="fw-bold text-danger">
						Unable to load pharmacy sales
					</h5>

					<p class="text-muted mb-0">
						${escapeHtml(message)}
					</p>

				</div>

			</td>
		</tr>
	`;
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

function setValue(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.value =
			value === null ||
				value === undefined
				? ""
				: String(value);
	}
}

function setText(id, value) {
	const element =
		document.getElementById(id);

	if (element) {
		element.innerText =
			value ?? "";
	}
}

async function pharmacySafeJson(response) {
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
	const msg =
		document.getElementById(
			"msg"
		);

	if (!msg) {
		alert(message);
		return;
	}

	msg.innerHTML = `
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
			if (msg) {
				msg.innerHTML =
					"";
			}
		},
		5000
	);
}

function pharmacySetButtonLoading(
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

		button.disabled =
			true;
	} else {
		button.innerHTML =
			button.dataset.originalHtml ||
			button.innerHTML;

		button.disabled =
			false;
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

function toNonNegativeNumber(value) {
	const number =
		Number(value);

	return Number.isFinite(number) &&
		number >= 0
		? number
		: 0;
}

function safeDateTimestamp(value) {
	const date =
		new Date(value);

	return Number.isNaN(
		date.getTime()
	)
		? 0
		: date.getTime();
}

function formatDateTime(value) {
	if (!value) {
		return "-";
	}

	const date =
		new Date(value);

	if (
		Number.isNaN(
			date.getTime()
		)
	) {
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

function formatAmount(value) {
	const number =
		Number(value);

	if (!Number.isFinite(number)) {
		return "0.00";
	}

	return number.toLocaleString(
		"en-IN",
		{
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}
	);
}

function formatShortMoney(value) {
	const amount =
		toNonNegativeNumber(
			value
		);

	if (amount >= 10000000) {
		return `₹${(amount / 10000000).toFixed(1)}Cr`;
	}

	if (amount >= 100000) {
		return `₹${(amount / 100000).toFixed(1)}L`;
	}

	if (amount >= 1000) {
		return `₹${(amount / 1000).toFixed(1)}K`;
	}

	return `₹${amount.toFixed(0)}`;
}

function safeNumber(value) {
	const number =
		Number(value);

	return Number.isFinite(number)
		? number
		: 0;
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