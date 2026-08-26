'use strict';

let salesOrderList = [];
let salesOrderCustomers = [];
let salesOrderMedicines = [];
let salesOrderStocks = [];
let salesOrderItemSequence = 0;
let customerMedicineCatalog = [];
let customerCart = [];

let isLoadingSalesOrders = false;
let isSavingSalesOrder = false;
let isUpdatingSalesOrder = false;
let isConvertingSalesOrder = false;
let isLoadingCustomerCatalog = false;
let isPlacingCustomerOrder = false;

let salesOrderDetailsModal = null;
let salesOrderStatusModal = null;
let convertSalesOrderModal = null;

let salesOrderPermissions = {
	create: false,
	update: false,
	delete: false,
	createSale: false
};

const CUSTOMER_CART_KEY = 'saasCustomerSalesOrderCart';

/* =========================================================
   PAGE BOOTSTRAP
========================================================= */

document.addEventListener('DOMContentLoaded', async function() {
	const tenantId = localStorage.getItem('tenantId');

	if (!tenantId) {
		alert('Please select SaaS workspace first.');
		window.location.href = '/saas/workspaces';
		return;
	}

	const role = getNormalizedSaasRole();

	if (role === 'WHOLESALER') {
		await initializeWholesalerSalesOrders();
		return;
	}

	if (role === 'SAAS_CUSTOMER') {
		await initializeCustomerSalesOrders();
		return;
	}

	alert('Sales Orders are not available for this account.');
	window.location.href = '/saas/dashboard';
});

function getNormalizedSaasRole() {
	return String(localStorage.getItem('role') || '')
		.trim()
		.toUpperCase()
		.replace(/^ROLE_/, '');
}

/* =========================================================
   WHOLESALER INITIALIZATION
========================================================= */

async function initializeWholesalerSalesOrders() {
	const tenantType = getTenantType();

	if (tenantType !== 'WHOLESALER') {
		alert('Sales Orders are available only for Wholesaler workspaces.');
		window.location.href = '/saas/dashboard';
		return;
	}

	const allowed = await protectSaasPage('SALES_ORDERS', 'VIEW');
	if (!allowed) return;

	initializeSalesOrderPage();
	initializeSalesOrderModals();
	initializeWholesalerSalesOrderEvents();

	await loadSalesOrderPermissions();
	setDefaultSalesOrderDates();

	await Promise.all([
		loadSalesOrderCustomers(),
		loadSalesOrderMedicines(),
		loadSalesOrderStocks(),
		loadSalesOrderSummary(),
		loadSalesOrders()
	]);

	addSalesOrderItemRow();
}

function initializeWholesalerSalesOrderEvents() {
	const customerSelect = document.getElementById('salesOrderCustomerId');
	if (customerSelect && !customerSelect.dataset.bound) {
		customerSelect.dataset.bound = 'true';
		customerSelect.addEventListener('change', updateSelectedOrderCustomer);
	}

	const searchInput = document.getElementById('salesOrderSearchKeyword');
	if (searchInput && !searchInput.dataset.bound) {
		searchInput.dataset.bound = 'true';
		searchInput.addEventListener('keydown', function(event) {
			if (event.key === 'Enter') {
				event.preventDefault();
				searchSalesOrders();
			}
		});
	}
}

function initializeSalesOrderPage() {
	const tenantName = localStorage.getItem('tenantName') || 'your workspace';

	setText('tenantNameText', tenantName);
	setText('tenantTypeText', 'Wholesaler');
	setText('sidebarTenantName', tenantName);
	setText('navbarTenantName', tenantName);

	setText('salesOrderKicker', 'Wholesaler Order Workflow');
	setText('heroActionTitle', 'New Sales Order');
	setText('heroMeta1', 'Wholesaler only');
	setText('heroMeta2', 'Stock validation');
	setText('heroMeta3', 'Order to sale conversion');
	setText('salesOrderHistoryTitle', 'Sales Order History');
	setText('orderPartyHeader', 'Customer');
	setText('orderConversionHeader', 'Converted Sale');

	const description = document.getElementById('salesOrderHeroDescription');
	if (description) {
		description.innerHTML = 'Create customer orders, validate stock availability, track fulfilment status and convert confirmed orders directly into FEFO-based sales for <strong id="tenantNameText">' + escapeHtml(tenantName) + '</strong>.';
	}

	showOrHideById('addSalesOrderBtn', true);
	showOrHideById('salesOrderFormPanel', false);
	showOrHideById('customerMedicinePanel', false);
	showOrHideById('customerCartPanel', false);
}

/* =========================================================
   CUSTOMER INITIALIZATION
========================================================= */

async function initializeCustomerSalesOrders() {

    const tenantType = getTenantType();

    if (tenantType !== 'WHOLESALER') {

        alert('Your assigned workspace is not a wholesaler workspace.');

        window.location.href = '/saas/dashboard';

        return;
    }

    const allowed =
        await protectSaasPage('SALES_ORDERS', 'VIEW');

    if (!allowed) {
        return;
    }

    initializeCustomerSalesOrderPage();

    initializeSalesOrderModals();

    initializeCustomerSalesOrderEvents();

    loadCustomerCart();

    await Promise.all([
        loadCustomerMedicineCatalog(),
        loadCustomerSalesOrders(),
        loadCustomerSalesOrderSummary()
    ]);

    // IMPORTANT:
    // Catalog is now loaded, so cart can resolve fresh prices.
    renderCustomerCart();
}

function initializeCustomerSalesOrderPage() {
	const tenantName = localStorage.getItem('tenantName') || 'your wholesaler';

	setText('tenantNameText', tenantName);
	setText('tenantTypeText', 'Retail Customer');
	setText('sidebarTenantName', tenantName);
	setText('navbarTenantName', tenantName);

	setText('salesOrderKicker', 'Medicine Ordering');
	setText('heroActionTitle', 'Order Medicines');
	setText('heroMeta1', 'Assigned wholesaler');
	setText('heroMeta2', 'Live stock availability');
	setText('heroMeta3', 'Track order status');
	setText('salesOrderHistoryTitle', 'My Orders');
	setText('orderPartyHeader', 'Wholesaler');
	setText('orderConversionHeader', '');

	const description = document.getElementById('salesOrderHeroDescription');
	if (description) {
		description.innerHTML = 'Search medicines available in <strong>' + escapeHtml(tenantName) + '</strong> inventory, add them to your cart and place your order.';
	}

	showOrHideById('addSalesOrderBtn', false);
	showOrHideById('salesOrderFormPanel', false);
	showOrHideById('customerMedicinePanel', true);
	showOrHideById('customerCartPanel', true);

	setText('summaryLabel1', 'My Orders');
	setText('summaryLabel2', 'Pending');
	setText('summaryLabel3', 'Accepted');
	setText('summaryLabel4', 'On The Way');
	setText('summaryLabel5', 'Completed');
	setText('summaryLabel6', 'My Order Value');

	setValue('salesOrderSearchKeyword', '');
	const search = document.getElementById('salesOrderSearchKeyword');
	if (search) search.placeholder = 'Search my order';
}

function initializeCustomerSalesOrderEvents() {
	const medicineSearch = document.getElementById('customerMedicineSearch');
	if (medicineSearch && !medicineSearch.dataset.bound) {
		medicineSearch.dataset.bound = 'true';
		medicineSearch.addEventListener('keydown', function(event) {
			if (event.key === 'Enter') {
				event.preventDefault();
				searchCustomerMedicines();
			}
		});
	}

	const orderSearch = document.getElementById('salesOrderSearchKeyword');
	if (orderSearch && !orderSearch.dataset.bound) {
		orderSearch.dataset.bound = 'true';
		orderSearch.addEventListener('input', function() {
			filterCustomerOrdersLocally(this.value);
		});
	}
}

function getTenantType() {
	return String(localStorage.getItem('tenantType') || '')
		.trim()
		.toUpperCase();
}

/* =========================================================
   MODALS
========================================================= */

function initializeSalesOrderModals() {
	const detailsElement = document.getElementById('salesOrderDetailsModal');
	const statusElement = document.getElementById('salesOrderStatusModal');
	const convertElement = document.getElementById('convertSalesOrderModal');

	if (detailsElement) {
		salesOrderDetailsModal = bootstrap.Modal.getOrCreateInstance(detailsElement);
	}
	if (statusElement) {
		salesOrderStatusModal = bootstrap.Modal.getOrCreateInstance(statusElement);
	}
	if (convertElement) {
		convertSalesOrderModal = bootstrap.Modal.getOrCreateInstance(convertElement);
	}
}

/* =========================================================
   WHOLESALER PERMISSIONS
========================================================= */

async function loadSalesOrderPermissions() {
	const [canCreate, canUpdate, canDelete, canCreateSale] = await Promise.all([
		hasSaasPermission('SALES_ORDERS', 'CREATE'),
		hasSaasPermission('SALES_ORDERS', 'UPDATE'),
		hasSaasPermission('SALES_ORDERS', 'DELETE'),
		hasSaasPermission('SALES', 'CREATE')
	]);

	salesOrderPermissions = {
		create: Boolean(canCreate),
		update: Boolean(canUpdate),
		delete: Boolean(canDelete),
		createSale: Boolean(canCreateSale)
	};

	showOrHideById('addSalesOrderBtn', salesOrderPermissions.create);
	applySalesOrderActionVisibility();
}

/* =========================================================
   WHOLESALER DATA
========================================================= */

async function loadSalesOrderCustomers() {
	const tenantId = localStorage.getItem('tenantId');
	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/customers?tenantId=${encodeURIComponent(tenantId)}&activeOnly=true`
	);

	if (!result.ok) {
		salesOrderCustomers = [];
		showMsg(getSalesOrderErrorMessage(result.data, 'Unable to load customers.'));
		populateSalesOrderCustomerDropdown();
		return;
	}

	salesOrderCustomers = Array.isArray(result.data) ? result.data : [];
	populateSalesOrderCustomerDropdown();
}

function populateSalesOrderCustomerDropdown() {
	const select = document.getElementById('salesOrderCustomerId');
	if (!select) return;

	select.innerHTML = '<option value="">Select Customer</option>';

	salesOrderCustomers.forEach(function(customer) {
		const option = document.createElement('option');
		option.value = customer.id;
		option.textContent = `${customer.customerName || 'Customer'} (${customer.customerCode || '-'})`;
		select.appendChild(option);
	});
}

function updateSelectedOrderCustomer() {
	const customerId = getNumberValue('salesOrderCustomerId');
	const customer = salesOrderCustomers.find(function(item) {
		return Number(item.id) === Number(customerId);
	});

	const detailsElement = document.getElementById('selectedOrderCustomerDetails');
	if (!detailsElement) return;

	if (!customer) {
		detailsElement.textContent = 'Select customer';
		return;
	}

	detailsElement.innerHTML = `
        <div>
            <strong class="text-primary">${escapeHtml(customer.customerType || 'Customer')}</strong>
            <span class="text-muted ms-2">Credit: ${formatCurrency(customer.creditLimit)}</span>
        </div>
    `;

	const addressField = document.getElementById('salesOrderShippingAddress');
	if (addressField && !String(addressField.value || '').trim()) {
		addressField.value = buildCustomerAddress(customer);
	}
}

function buildCustomerAddress(customer) {
	return [customer.address, customer.city, customer.district, customer.state, customer.pincode]
		.filter(function(value) {
			return Boolean(String(value || '').trim());
		})
		.join(', ');
}

async function loadSalesOrderMedicines() {
	const tenantId = localStorage.getItem('tenantId');
	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/medicine-master?tenantId=${encodeURIComponent(tenantId)}`
	);

	if (!result.ok) {
		salesOrderMedicines = [];
		showMsg(getSalesOrderErrorMessage(result.data, 'Unable to load medicines.'));
		refreshSalesOrderMedicineDropdowns();
		return;
	}

	salesOrderMedicines = Array.isArray(result.data) ? result.data : [];
	refreshSalesOrderMedicineDropdowns();
}

async function loadSalesOrderStocks() {
	const tenantId = localStorage.getItem('tenantId');
	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/inventory/stocks?tenantId=${encodeURIComponent(tenantId)}`
	);

	salesOrderStocks = result.ok && Array.isArray(result.data) ? result.data : [];
}

async function loadSalesOrderSummary() {
	const tenantId = localStorage.getItem('tenantId');
	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/sales-orders/summary?tenantId=${encodeURIComponent(tenantId)}`
	);

	if (!result.ok) {
		resetSalesOrderSummary();
		return;
	}

	const summary = result.data || {};
	setAnimatedNumber('totalSalesOrders', summary.totalOrders);
	setAnimatedNumber('pendingSalesOrders', summary.pendingOrders);
	setAnimatedNumber('confirmedSalesOrders', summary.confirmedOrders);
	setAnimatedNumber('dispatchedSalesOrders', summary.dispatchedOrders);
	setAnimatedNumber('deliveredSalesOrders', summary.deliveredOrders);
	setText('totalSalesOrderValue', formatCurrency(summary.totalOrderValue));
}

async function loadCustomerSalesOrderSummary() {
	const tenantId = localStorage.getItem('tenantId');
	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/sales-orders/customer/summary?tenantId=${encodeURIComponent(tenantId)}`
	);

	if (!result.ok) {
		resetSalesOrderSummary();
		return;
	}

	const summary = result.data || {};
	setAnimatedNumber('totalSalesOrders', summary.totalOrders);
	setAnimatedNumber('pendingSalesOrders', summary.pendingOrders);
	setAnimatedNumber('confirmedSalesOrders', summary.confirmedOrders);
	setAnimatedNumber('dispatchedSalesOrders', summary.dispatchedOrders);
	setAnimatedNumber('deliveredSalesOrders', summary.deliveredOrders);
	setText('totalSalesOrderValue', formatCurrency(summary.totalOrderValue));
}

function resetSalesOrderSummary() {
	['totalSalesOrders', 'pendingSalesOrders', 'confirmedSalesOrders', 'dispatchedSalesOrders', 'deliveredSalesOrders']
		.forEach(function(id) { setText(id, '0'); });
	setText('totalSalesOrderValue', formatCurrency(0));
}

async function loadSalesOrders() {
	if (isLoadingSalesOrders) return;
	isLoadingSalesOrders = true;
	showSalesOrderLoadingState();
	setButtonLoading('refreshSalesOrderBtn', 'Refreshing...', true);

	const tenantId = localStorage.getItem('tenantId');
	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/sales-orders?tenantId=${encodeURIComponent(tenantId)}`
	);

	isLoadingSalesOrders = false;
	setButtonLoading('refreshSalesOrderBtn', 'Refresh', false);

	if (!result.ok) {
		salesOrderList = [];
		const message = getSalesOrderErrorMessage(result.data, 'Unable to load sales orders.');
		showSalesOrderErrorState(message);
		showMsg(message);
		return;
	}

	salesOrderList = Array.isArray(result.data) ? result.data : [];
	renderSalesOrders(salesOrderList);
}

async function loadCustomerSalesOrders() {
	if (isLoadingSalesOrders) return;
	isLoadingSalesOrders = true;
	showSalesOrderLoadingState();
	setButtonLoading('refreshSalesOrderBtn', 'Refreshing...', true);

	const tenantId = localStorage.getItem('tenantId');
	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/sales-orders/customer?tenantId=${encodeURIComponent(tenantId)}`
	);

	isLoadingSalesOrders = false;
	setButtonLoading('refreshSalesOrderBtn', 'Refresh', false);

	if (!result.ok) {
		salesOrderList = [];
		const message = getSalesOrderErrorMessage(result.data, 'Unable to load your orders.');
		showSalesOrderErrorState(message);
		showMsg(message);
		return;
	}

	salesOrderList = Array.isArray(result.data) ? result.data : [];
	renderSalesOrders(salesOrderList);
}

async function searchSalesOrders() {
	if (getNormalizedSaasRole() === 'SAAS_CUSTOMER') {
		filterCustomerOrdersLocally(getValue('salesOrderSearchKeyword'));
		return;
	}

	const keyword = getValue('salesOrderSearchKeyword');
	if (!keyword) {
		await loadSalesOrders();
		return;
	}

	showSalesOrderLoadingState();
	setButtonLoading('searchSalesOrderBtn', 'Searching...', true);

	const tenantId = localStorage.getItem('tenantId');
	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/sales-orders/search?tenantId=${encodeURIComponent(tenantId)}&keyword=${encodeURIComponent(keyword)}`
	);

	setButtonLoading('searchSalesOrderBtn', 'Search', false);

	if (!result.ok) {
		showSalesOrderErrorState(getSalesOrderErrorMessage(result.data, 'Unable to search sales orders.'));
		return;
	}

	renderSalesOrders(Array.isArray(result.data) ? result.data : []);
}

function filterCustomerOrdersLocally(keyword) {
	const normalized = String(keyword || '').trim().toLowerCase();
	if (!normalized) {
		renderSalesOrders(salesOrderList);
		return;
	}

	const filtered = salesOrderList.filter(function(order) {
		return JSON.stringify(order).toLowerCase().includes(normalized);
	});

	renderSalesOrders(filtered);
}

/* =========================================================
   CUSTOMER CATALOG / CART
========================================================= */

async function loadCustomerMedicineCatalog(keyword = '') {
	if (isLoadingCustomerCatalog) return;
	isLoadingCustomerCatalog = true;

	const grid = document.getElementById('customerMedicineGrid');
	if (grid) {
		grid.innerHTML = `
            <div class="col-12">
                <div class="sales-order-state">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="text-muted mt-3 mb-0">Loading available medicines...</p>
                </div>
            </div>
        `;
	}

	const tenantId = localStorage.getItem('tenantId');
	const url = `${API_BASE}/saas/sales-orders/customer/catalog?tenantId=${encodeURIComponent(tenantId)}&keyword=${encodeURIComponent(keyword || '')}`;
	const result = await salesOrderApiRequest(url);
	isLoadingCustomerCatalog = false;

	if (!result.ok) {
		customerMedicineCatalog = [];
		renderCustomerMedicineCatalog([]);
		showMsg(getSalesOrderErrorMessage(result.data, 'Unable to load available medicines.'));
		return;
	}

	customerMedicineCatalog = Array.isArray(result.data) ? result.data : [];
	renderCustomerMedicineCatalog(customerMedicineCatalog);
}

async function searchCustomerMedicines() {
	await loadCustomerMedicineCatalog(getValue('customerMedicineSearch'));
}

function getCustomerMedicinePrice(medicine) {

	const candidates = [
		medicine?.price,
		medicine?.saleRate,
		medicine?.salePrice,
		medicine?.unitPrice,
		medicine?.mrp
	];

	for (const value of candidates) {

		const number = Number(value);

		if (Number.isFinite(number) && number > 0) {
			return number;
		}
	}

	return 0;
}



function renderCustomerMedicineCatalog(list) {

	const grid =
		document.getElementById(
			'customerMedicineGrid'
		);

	if (!grid) {
		return;
	}

	if (
		!Array.isArray(list) ||
		!list.length
	) {

		grid.innerHTML = `

            <div class="col-12">

                <div class="sales-order-state">

                    <div class="sales-order-state-icon">

                        <i class="bi bi-capsule"></i>

                    </div>

                    <h5 class="fw-bold text-primary">
                        No medicines found
                    </h5>

                    <p class="text-muted mb-0">
                        No medicine currently matches your
                        search or has available stock.
                    </p>

                </div>

            </div>

        `;

		return;
	}

	grid.innerHTML = list.map(function(medicine) {

		const medicineId =
			Number(
				medicine.medicineId ??
				medicine.id ??
				0
			);

		const available =
			Number(
				medicine.availableQuantity ??
				medicine.currentQuantity ??
				0
			);

		const price = getCustomerMedicinePrice(medicine);

		const gst =
			Number(
				medicine.gstPercentage ?? 0
			);

		const stockClass =
			available > 0
				? 'text-success'
				: 'text-danger';

		return `

            <div class="col-xl-4 col-lg-6">

                <article class="customer-medicine-card">

                    <div class="d-flex justify-content-between gap-2 mb-2">

                        <span class="customer-badge">

                            <i class="bi bi-capsule-pill"></i>

                            ${escapeHtml(
			medicine.medicineType ||
			'Medicine'
		)}

                        </span>

                        <span class="small fw-bold ${stockClass}">

                            ${available}
                            available

                        </span>

                    </div>

                    <h6>

                        ${escapeHtml(
			medicine.medicineName || '-'
		)}

                    </h6>

                    <div class="small text-muted">

                        ${escapeHtml(
			[
				medicine.strength,
				medicine.unit,
				medicine.manufacturer
			]
				.filter(Boolean)
				.join(' • ') || '-'
		)}

                    </div>

                    <div class="customer-price mt-3">

                        ${formatCurrency(price)}

                    </div>

                    <div class="small text-muted mb-1">

                        per unit / pack

                    </div>

                    ${gst > 0
				? `
                                <div class="small text-muted mb-3">
                                    GST ${gst.toFixed(2)}%
                                </div>
                              `
				: `
                                <div class="small text-muted mb-3">
                                    Inclusive / applicable taxes calculated at order time
                                </div>
                              `
			}

                    <div class="d-flex gap-2 align-items-center">

                        <input

                            type="number"

                            class="form-control customer-qty"

                            value="1"

                            min="1"

                            max="${available}"

                            id="customerQty_${medicineId}"

                            ${available <= 0 ? 'disabled' : ''}

                        >

                        <button

                            type="button"

                            class="btn btn-medi"

                            ${available <= 0
				? 'disabled'
				: ''
			}

                            onclick="addMedicineToCustomerCart(${medicineId})"

                        >

                            <i class="bi bi-cart-plus me-1"></i>

                            Add

                        </button>

                    </div>

                </article>

            </div>

        `;

	}).join('');

}

function addMedicineToCustomerCart(medicineId) {

	const medicine =
		customerMedicineCatalog.find(
			function(item) {

				return Number(
					item.medicineId ??
					item.id
				) === Number(medicineId);

			}
		);

	if (!medicine) {

		showMsg(
			'Medicine details not found.'
		);

		return;
	}

	const available =
		Number(
			medicine.availableQuantity ??
			medicine.currentQuantity ??
			0
		);

	const qtyInput =
		document.getElementById(
			`customerQty_${Number(medicineId)}`
		);

	let quantity =
		Number(
			qtyInput?.value || 1
		);

	if (
		!Number.isFinite(quantity) ||
		quantity < 1
	) {

		quantity = 1;
	}

	if (quantity > available) {

		showMsg(
			`Only ${available} units are available.`
		);

		return;
	}

	const price = getCustomerMedicinePrice(medicine);

	if (price <= 0) {

		showMsg(
			`Sale price is not configured for ${medicine.medicineName}. Please contact the wholesaler.`
		);

		return;
	}

	const existing =
		customerCart.find(
			function(item) {

				return Number(item.medicineId) ===
					Number(medicineId);

			}
		);

	if (existing) {

		const newQty =
			Number(existing.quantity) +
			quantity;

		if (
			newQty >
			Number(existing.availableQuantity)
		) {

			showMsg(
				`Only ${existing.availableQuantity} units are available for ${existing.medicineName}.`
			);

			return;
		}

		existing.quantity =
			newQty;

	} else {

		customerCart.push({

			medicineId:
				Number(medicineId),

			medicineName:
				medicine.medicineName,

			medicineType:
				medicine.medicineType,

			manufacturer:
				medicine.manufacturer,

			strength:
				medicine.strength,

			unit:
				medicine.unit,

			availableQuantity:
				available,

			saleRate:
				price,

			gstPercentage:
				Number(
					medicine.gstPercentage ?? 0
				),

			quantity:
				quantity

		});

	}

	persistCustomerCart();

	renderCustomerCart();

	showMsg(
		`${medicine.medicineName || 'Medicine'} added to cart.`,
		'success'
	);
}

function renderCustomerCart() {

    const container =
        document.getElementById('customerCartContainer');

    if (!container) {
        return;
    }

    const totalItems = customerCart.reduce(
        function(sum, item) {
            return sum + Number(item.quantity || 0);
        },
        0
    );

    setText('customerCartCount', totalItems);

    if (!customerCart.length) {

        container.innerHTML = `
            <div class="sales-order-state">

                <div class="sales-order-state-icon">
                    <i class="bi bi-cart-x"></i>
                </div>

                <h5 class="fw-bold text-primary">
                    Your cart is empty
                </h5>

                <p class="text-muted mb-0">
                    Search the available medicine inventory and add products to your order.
                </p>

            </div>
        `;

        return;
    }

    let subtotal = 0;

    const itemsHtml = customerCart.map(
        function(item, index) {
			
			const medicine =
		customerMedicineCatalog.find(
			function(item) {

				return Number(item.medicineId ?? item.id) === Number(item.medicineId);

			}
		);

            const unitPrice =
                getCustomerMedicinePrice(medicine);


            /*
             * -----------------------------------------------------
             * QUANTITY
             * -----------------------------------------------------
             */

            const quantity = Math.max(
                1,
                Number(item.quantity || 1)
            );


            /*
             * -----------------------------------------------------
             * LINE TOTAL
             * -----------------------------------------------------
             */

            const lineTotal =
                quantity * unitPrice;

            subtotal += lineTotal;


            /*
             * -----------------------------------------------------
             * AVAILABLE QUANTITY
             * -----------------------------------------------------
             */

            const availableQuantity =
                Math.max(
                    0,
                    Number(item.availableQuantity || 0)
                );


            /*
             * -----------------------------------------------------
             * MEDICINE DETAILS
             * -----------------------------------------------------
             */

            const medicineDetails = [

                item.strength,
                item.unit,
                item.manufacturer

            ]
                .filter(
                    function(value) {
                        return Boolean(
                            String(value || '').trim()
                        );
                    }
                )
                .join(' • ') || '-';


            /*
             * -----------------------------------------------------
             * CART ITEM HTML
             * -----------------------------------------------------
             */

            return `
                <div class="customer-cart-item mb-3">

                    <div class="row g-3 align-items-center">

                        <!-- MEDICINE -->
                        <div class="col-lg-4">

                            <strong class="text-primary">
                                ${escapeHtml(
                                    item.medicineName || '-'
                                )}
                            </strong>

                            <div class="small text-muted">
                                ${escapeHtml(
                                    medicineDetails
                                )}
                            </div>

                        </div>


                        <!-- UNIT PRICE -->
                        <div class="col-lg-2">

                            <div class="small text-muted">
                                Unit Price
                            </div>

                            <strong class="text-primary">
                                ${formatCurrency(unitPrice)}
                            </strong>

                        </div>


                        <!-- QUANTITY -->
                        <div class="col-lg-3">

                            <div class="qty-control">

                                <button
                                    class="btn btn-sm btn-outline-secondary"
                                    type="button"
                                    onclick="changeCustomerCartQuantity(${index}, -1)"
                                    ${quantity <= 1 ? 'disabled' : ''}
                                >
                                    −
                                </button>


                                <input
                                    class="form-control form-control-sm"
                                    type="number"
                                    min="1"
                                    max="${availableQuantity}"
                                    value="${quantity}"
                                    onchange="setCustomerCartQuantity(${index}, this.value)"
                                >


                                <button
                                    class="btn btn-sm btn-outline-secondary"
                                    type="button"
                                    onclick="changeCustomerCartQuantity(${index}, 1)"
                                    ${quantity >= availableQuantity ? 'disabled' : ''}
                                >
                                    +
                                </button>

                            </div>

                            <div class="small text-muted mt-1">
                                Available: ${availableQuantity}
                            </div>

                        </div>


                        <!-- LINE TOTAL -->
                        <div class="col-lg-3 text-end">

                            <div class="small text-muted">
                                Line Total
                            </div>

                            <strong class="text-primary">
                                ${formatCurrency(lineTotal)}
                            </strong>


                            <button
                                type="button"
                                class="btn btn-sm btn-outline-danger d-block ms-auto mt-2"
                                onclick="removeCustomerCartItem(${index})"
                            >
                                <i class="bi bi-trash"></i>
                            </button>

                        </div>

                    </div>

                </div>
            `;
        }
    ).join('');


    /*
     * ---------------------------------------------------------
     * CART SUMMARY
     * ---------------------------------------------------------
     */

    container.innerHTML = `

        ${itemsHtml}


        <div class="customer-cart-summary">

            <div class="d-flex justify-content-between">

                <span>
                    Subtotal
                </span>

                <strong>
                    ${formatCurrency(subtotal)}
                </strong>

            </div>


            <div class="d-flex justify-content-between border-top pt-3 mt-2">

                <span class="fw-bold text-primary">
                    Estimated Order Total
                </span>

                <strong class="text-primary">
                    ${formatCurrency(subtotal)}
                </strong>

            </div>


            <div class="small text-muted mt-2">

                Final applicable taxes, discounts and charges are calculated
                by the server at order creation.

            </div>


            <div class="d-flex justify-content-end mt-3">

                <button
                    type="button"
                    class="btn btn-medi"
                    id="customerPlaceOrderBtn"
                    onclick="placeCustomerSalesOrder()"
                >

                    <i class="bi bi-check2-circle me-1"></i>

                    Place Order

                </button>

            </div>

        </div>

    `;
}
function changeCustomerCartQuantity(index, delta) {
	const item = customerCart[index];
	if (!item) return;
	setCustomerCartQuantity(index, Number(item.quantity) + Number(delta));
}

function setCustomerCartQuantity(index, value) {
	const item = customerCart[index];
	if (!item) return;

	let quantity = Number(value || 1);
	if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;

	if (quantity > Number(item.availableQuantity)) {
		quantity = Number(item.availableQuantity);
		showMsg(`Only ${quantity} units are available for ${item.medicineName}.`);
	}

	item.quantity = quantity;
	persistCustomerCart();
	renderCustomerCart();
}

function removeCustomerCartItem(index) {
	customerCart.splice(index, 1);
	persistCustomerCart();
	renderCustomerCart();
}

function loadCustomerCart() {

	try {

		const raw =
			localStorage.getItem(
				CUSTOMER_CART_KEY
			);

		const parsed =
			raw
				? JSON.parse(raw)
				: [];

		customerCart =
			Array.isArray(parsed)
				? parsed
				: [];

		/*
		 * Remove invalid / zero-price cart entries.
		 * Catalog will provide fresh pricing.
		 */
		customerCart =
			customerCart.filter(
				function(item) {

					return (
						item &&
						Number(item.medicineId) > 0 &&
						Number(item.quantity) > 0
					);

				}
			);

	} catch (error) {

		console.error(
			'Unable to load customer cart',
			error
		);

		customerCart = [];

	}

}

function persistCustomerCart() {
	localStorage.setItem(CUSTOMER_CART_KEY, JSON.stringify(customerCart));
}

async function placeCustomerSalesOrder() {
	if (isPlacingCustomerOrder) return;

	if (!customerCart.length) {
		showMsg('Add at least one medicine to your cart.');
		return;
	}

	const tenantId = Number(localStorage.getItem('tenantId'));
	if (!tenantId) {
		showMsg('Your workspace is missing. Please select your workspace again.');
		return;
	}

	const payload = {
		tenantId: tenantId,
		expectedDeliveryDate: null,
		shippingAddress: '',
		remarks: '',
		items: customerCart.map(function(item) {
			return {
				medicineId: Number(item.medicineId),
				quantity: Number(item.quantity)
			};
		})
	};

	isPlacingCustomerOrder = true;
	setButtonLoading('customerPlaceOrderBtn', 'Placing Order...', true);

	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/sales-orders/customer`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		}
	);

	isPlacingCustomerOrder = false;
	setButtonLoading('customerPlaceOrderBtn', 'Place Order', false);

	if (!result.ok) {
		showMsg(getSalesOrderErrorMessage(result.data, 'Unable to place order.'));
		return;
	}

	customerCart = [];
	persistCustomerCart();
	renderCustomerCart();

	showMsg(`Order ${result.data?.orderNumber || ''} placed successfully.`, 'success');

	await Promise.all([
		loadCustomerSalesOrders(),
		loadCustomerSalesOrderSummary(),
		loadCustomerMedicineCatalog(getValue('customerMedicineSearch'))
	]);
}

/* =========================================================
   WHOLESALER CREATE FORM
========================================================= */

function setDefaultSalesOrderDates() {
	const today = new Date().toISOString().substring(0, 10);
	setValue('salesOrderDate', today);
	setValue('convertSaleDate', today);
}

function openSalesOrderForm() {
	if (!salesOrderPermissions.create) {
		showMsg('You do not have permission to create sales orders.');
		return;
	}

	if (!salesOrderCustomers.length) {
		showMsg('Create an active customer before creating an order.');
		return;
	}

	if (!salesOrderMedicines.length) {
		showMsg('No tenant medicines are available.');
		return;
	}

	const panel = document.getElementById('salesOrderFormPanel');
	if (!panel) return;

	panel.style.display = 'block';
	panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeSalesOrderForm() {
	const panel = document.getElementById('salesOrderFormPanel');
	if (panel) panel.style.display = 'none';
}

function addSalesOrderItemRow() {
	salesOrderItemSequence++;
	const rowId = salesOrderItemSequence;
	const tbody = document.getElementById('salesOrderItemsBody');
	if (!tbody) return;

	const row = document.createElement('tr');
	row.id = `salesOrderItemRow_${rowId}`;
	row.innerHTML = `
        <td><select class="form-select item-order-medicine" onchange="handleSalesOrderMedicineChange(this)">${buildSalesOrderMedicineOptions()}</select></td>
        <td><span class="customer-badge item-order-available"><i class="bi bi-boxes"></i>0</span></td>
        <td><input type="number" class="form-control item-order-quantity" value="1" min="1" oninput="calculateSalesOrderTotals()"></td>
        <td><input type="number" class="form-control item-order-rate" value="0" min="0" step="0.01" oninput="calculateSalesOrderTotals()"></td>
        <td><input type="number" class="form-control item-order-discount" value="0" min="0" max="100" step="0.01" oninput="calculateSalesOrderTotals()"></td>
        <td><input type="number" class="form-control item-order-gst" value="0" min="0" max="100" step="0.01" oninput="calculateSalesOrderTotals()"></td>
        <td><strong class="item-order-line-total text-primary">₹0</strong></td>
        <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeSalesOrderItemRow(${rowId})"><i class="bi bi-trash"></i></button></td>
    `;

	tbody.appendChild(row);
	calculateSalesOrderTotals();
}

function removeSalesOrderItemRow(rowId) {
	const rows = document.querySelectorAll('#salesOrderItemsBody tr');
	if (rows.length <= 1) {
		showMsg('At least one order item is required.');
		return;
	}
	document.getElementById(`salesOrderItemRow_${rowId}`)?.remove();
	calculateSalesOrderTotals();
}

function buildSalesOrderMedicineOptions() {
	let html = '<option value="">Select Medicine</option>';

	salesOrderMedicines.forEach(function(medicine) {
		const available = getAvailableOrderQuantity(medicine.id);
		const details = [medicine.strength, medicine.unit, medicine.manufacturer].filter(Boolean).join(' - ');
		html += `<option value="${Number(medicine.id)}">${escapeHtml(medicine.medicineName)}${details ? ` (${escapeHtml(details)})` : ''} — Stock ${available}</option>`;
	});

	return html;
}

function refreshSalesOrderMedicineDropdowns() {
	document.querySelectorAll('.item-order-medicine').forEach(function(select) {
		const currentValue = select.value;
		select.innerHTML = buildSalesOrderMedicineOptions();
		select.value = currentValue;
	});
}

function handleSalesOrderMedicineChange(select) {
	const row = select.closest('tr');
	if (!row) return;

	const medicineId = Number(select.value || 0);
	const available = getAvailableOrderQuantity(medicineId);
	const availableElement = row.querySelector('.item-order-available');

	if (availableElement) {
		availableElement.innerHTML = `<i class="bi bi-boxes"></i>${available}`;
		availableElement.classList.toggle('text-danger', available <= 0);
	}

	const suggestedStock = getSuggestedOrderStock(medicineId);
	if (suggestedStock) {
		const rateInput = row.querySelector('.item-order-rate');
		const gstInput = row.querySelector('.item-order-gst');
		if (rateInput && Number(rateInput.value || 0) === 0) {
			rateInput.value = Number(suggestedStock.salePrice || suggestedStock.mrp || 0);
		}
		if (gstInput && Number(gstInput.value || 0) === 0) {
			gstInput.value = Number(suggestedStock.gstPercentage || 0);
		}
	}

	const customer = getSelectedOrderCustomer();
	const discountInput = row.querySelector('.item-order-discount');
	if (customer && discountInput && Number(discountInput.value || 0) === 0) {
		discountInput.value = Number(customer.discountPercentage || 0);
	}

	calculateSalesOrderTotals();
}

function getAvailableOrderQuantity(medicineId) {
	const orderDate = getValue('salesOrderDate');
	const requiredDate = orderDate ? new Date(orderDate + 'T00:00:00') : new Date();
	requiredDate.setHours(0, 0, 0, 0);

	return salesOrderStocks
		.filter(function(stock) {
			if (Number(stock.medicineId) !== Number(medicineId)) return false;
			if (stock.active === false) return false;
			if (Number(stock.currentQuantity || 0) <= 0) return false;
			if (!stock.expiryDate) return true;
			return new Date(stock.expiryDate + 'T00:00:00') >= requiredDate;
		})
		.reduce(function(total, stock) {
			return total + Number(stock.currentQuantity || 0);
		}, 0);
}

function getSuggestedOrderStock(medicineId) {
	return salesOrderStocks
		.filter(function(stock) {
			return Number(stock.medicineId) === Number(medicineId) && Number(stock.currentQuantity || 0) > 0 && stock.active !== false && !Boolean(stock.expired);
		})
		.sort(function(a, b) {
			if (!a.expiryDate && !b.expiryDate) return 0;
			if (!a.expiryDate) return 1;
			if (!b.expiryDate) return -1;
			return new Date(a.expiryDate) - new Date(b.expiryDate);
		})[0] || null;
}

function calculateSalesOrderTotals() {
	let grossAmount = 0;
	let discountAmount = 0;
	let taxableAmount = 0;
	let gstAmount = 0;

	document.querySelectorAll('#salesOrderItemsBody tr').forEach(function(row) {
		const quantity = numberFromRow(row, '.item-order-quantity');
		const rate = numberFromRow(row, '.item-order-rate');
		const discount = numberFromRow(row, '.item-order-discount');
		const gst = numberFromRow(row, '.item-order-gst');

		const rowGross = quantity * rate;
		const rowDiscount = rowGross * discount / 100;
		const rowTaxable = rowGross - rowDiscount;
		const rowGst = rowTaxable * gst / 100;
		const lineTotal = rowTaxable + rowGst;

		grossAmount += rowGross;
		discountAmount += rowDiscount;
		taxableAmount += rowTaxable;
		gstAmount += rowGst;

		const lineElement = row.querySelector('.item-order-line-total');
		if (lineElement) lineElement.textContent = formatCurrency(lineTotal);
	});

	const otherCharges = getNumberValue('salesOrderOtherCharges');
	const roundOff = getNumberValue('salesOrderRoundOff');
	const grandTotal = taxableAmount + gstAmount + otherCharges + roundOff;

	setText('salesOrderGrossAmount', formatCurrency(grossAmount));
	setText('salesOrderDiscountAmount', formatCurrency(discountAmount));
	setText('salesOrderTaxableAmount', formatCurrency(taxableAmount));
	setText('salesOrderGstAmount', formatCurrency(gstAmount));
	setText('salesOrderGrandTotal', formatCurrency(grandTotal));
}

async function saveSalesOrder() {
	if (isSavingSalesOrder) return;
	if (!salesOrderPermissions.create) {
		showMsg('You do not have permission to create sales orders.');
		return;
	}

	const payload = buildSalesOrderPayload();
	if (!validateSalesOrderPayload(payload)) return;

	isSavingSalesOrder = true;
	setButtonLoading('saveSalesOrderBtn', 'Saving Order...', true);

	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/sales-orders`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		}
	);

	isSavingSalesOrder = false;
	setButtonLoading('saveSalesOrderBtn', 'Save Order', false);

	if (!result.ok) {
		showMsg(getSalesOrderErrorMessage(result.data, 'Unable to save sales order.'));
		return;
	}

	showMsg('Sales order created successfully.', 'success');
	clearSalesOrderForm();
	closeSalesOrderForm();
	await Promise.all([loadSalesOrders(), loadSalesOrderSummary()]);
}

function buildSalesOrderPayload() {
	const items = [];
	document.querySelectorAll('#salesOrderItemsBody tr').forEach(function(row) {
		items.push({
			medicineId: numberFromRow(row, '.item-order-medicine'),
			quantity: numberFromRow(row, '.item-order-quantity'),
			saleRate: numberFromRow(row, '.item-order-rate'),
			discountPercentage: numberFromRow(row, '.item-order-discount'),
			gstPercentage: numberFromRow(row, '.item-order-gst')
		});
	});

	return {
		tenantId: Number(localStorage.getItem('tenantId')),
		orderDate: getValue('salesOrderDate') || null,
		expectedDeliveryDate: getValue('salesOrderExpectedDate') || null,
		customerId: getNumberValue('salesOrderCustomerId'),
		shippingAddress: getValue('salesOrderShippingAddress'),
		otherCharges: getNumberValue('salesOrderOtherCharges'),
		roundOffAmount: getNumberValue('salesOrderRoundOff'),
		remarks: getValue('salesOrderRemarks'),
		items: items
	};
}

function validateSalesOrderPayload(payload) {
	if (!payload.tenantId) return showOrderValidation('Please select SaaS workspace first.');
	if (!payload.customerId) return showOrderValidation('Please select customer.');
	if (payload.expectedDeliveryDate && payload.orderDate && payload.expectedDeliveryDate < payload.orderDate) return showOrderValidation('Expected delivery date cannot be before order date.');
	if (!payload.items.length) return showOrderValidation('At least one order item is required.');

	const medicineIds = new Set();
	for (let index = 0; index < payload.items.length; index++) {
		const item = payload.items[index];
		const rowNumber = index + 1;

		if (!item.medicineId) return showOrderValidation(`Please select medicine in row ${rowNumber}.`);
		if (medicineIds.has(item.medicineId)) return showOrderValidation(`Medicine is repeated in row ${rowNumber}.`);
		medicineIds.add(item.medicineId);
		if (!item.quantity || item.quantity <= 0) return showOrderValidation(`Quantity must be greater than 0 in row ${rowNumber}.`);

		const available = getAvailableOrderQuantity(item.medicineId);
		if (item.quantity > available) return showOrderValidation(`Insufficient stock in row ${rowNumber}. Available quantity is ${available}.`);
		if (item.saleRate < 0) return showOrderValidation(`Sale rate cannot be negative in row ${rowNumber}.`);
		if (item.discountPercentage < 0 || item.discountPercentage > 100) return showOrderValidation(`Discount must be between 0 and 100 in row ${rowNumber}.`);
		if (item.gstPercentage < 0 || item.gstPercentage > 100) return showOrderValidation(`GST must be between 0 and 100 in row ${rowNumber}.`);
	}

	if (payload.otherCharges < 0) return showOrderValidation('Other charges cannot be negative.');
	return true;
}

function showOrderValidation(message) {
	showMsg(message);
	return false;
}

function clearSalesOrderForm() {
	setDefaultSalesOrderDates();
	setValue('salesOrderExpectedDate', '');
	setValue('salesOrderCustomerId', '');
	setValue('salesOrderShippingAddress', '');
	setValue('salesOrderOtherCharges', '0');
	setValue('salesOrderRoundOff', '0');
	setValue('salesOrderRemarks', '');

	const itemsBody = document.getElementById('salesOrderItemsBody');
	if (itemsBody) itemsBody.innerHTML = '';

	addSalesOrderItemRow();
	updateSelectedOrderCustomer();
	calculateSalesOrderTotals();
}

async function refreshSalesOrders() {
	setValue('salesOrderSearchKeyword', '');
	const role = getNormalizedSaasRole();

	if (role === 'SAAS_CUSTOMER') {
		await Promise.all([loadCustomerSalesOrders(), loadCustomerSalesOrderSummary(), loadCustomerMedicineCatalog(getValue('customerMedicineSearch'))]);
	} else {
		await Promise.all([loadSalesOrders(), loadSalesOrderSummary(), loadSalesOrderStocks()]);
		refreshSalesOrderMedicineDropdowns();
	}
}

/* =========================================================
   RENDER ORDERS
========================================================= */

function renderSalesOrders(orders) {
	const tbody = document.getElementById('salesOrderTableBody');
	if (!tbody) return;

	const list = Array.isArray(orders) ? orders : [];
	const role = getNormalizedSaasRole();

	if (!list.length) {
		tbody.innerHTML = `
            <tr><td colspan="10"><div class="sales-order-state">
                <div class="sales-order-state-icon"><i class="bi bi-clipboard2-check-fill"></i></div>
                <h5 class="fw-bold text-primary">No sales orders found</h5>
                <p class="text-muted mb-0">${role === 'SAAS_CUSTOMER' ? 'Your placed medicine orders will appear here.' : 'Create your first wholesaler sales order.'}</p>
            </div></td></tr>
        `;
		return;
	}

	tbody.innerHTML = list.map(function(order, index) {
		const partyName = role === 'SAAS_CUSTOMER' ? (order.wholesalerName || localStorage.getItem('tenantName') || '-') : (order.customerName || '-');
		const partyCode = role === 'SAAS_CUSTOMER' ? (order.wholesalerCode || '-') : (order.customerCode || '-');
		const conversion = role === 'SAAS_CUSTOMER' ? '-' : (order.convertedSaleNumber ? `<span class="order-status converted"><i class="bi bi-receipt-cutoff"></i>${escapeHtml(order.convertedSaleNumber)}</span>` : '-');

		return `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td><strong class="text-primary">${escapeHtml(order.orderNumber)}</strong><div class="small text-muted">${formatDate(order.orderDate)}</div></td>
                <td><strong>${escapeHtml(partyName)}</strong><div class="small text-muted">${escapeHtml(partyCode)}</div></td>
                <td>${formatDate(order.expectedDeliveryDate)}</td>
                <td>${Array.isArray(order.items) ? order.items.length : 0} items</td>
                <td>${Number(order.totalQuantity || 0)}</td>
                <td><strong>${formatCurrency(order.grandTotal)}</strong></td>
                <td>${salesOrderStatusBadge(order.orderStatus)}</td>
                <td>${conversion}</td>
                <td>${buildSalesOrderActionButtons(order)}</td>
            </tr>
        `;
	}).join('');

	applySalesOrderActionVisibility();
}

function buildSalesOrderActionButtons(order) {
	const orderId = Number(order.id);
	const status = String(order.orderStatus || '').toUpperCase();
	const role = getNormalizedSaasRole();

	if (role === 'SAAS_CUSTOMER') {
		return `<div class="order-actions"><button type="button" class="btn btn-sm btn-outline-primary" onclick="showSalesOrderDetails(${orderId})"><i class="bi bi-eye"></i> View</button></div>`;
	}

	let buttons = `<button type="button" class="btn btn-sm btn-outline-primary" onclick="showSalesOrderDetails(${orderId})"><i class="bi bi-eye"></i> View</button>`;

	if (status === 'PENDING') {
		buttons += `<button type="button" class="btn btn-sm btn-outline-success update-order-action" onclick="openSalesOrderStatusAction(${orderId}, 'CONFIRM')"><i class="bi bi-check-circle"></i> Confirm</button>`;
		buttons += `<button type="button" class="btn btn-sm btn-outline-danger update-order-action" onclick="openSalesOrderStatusAction(${orderId}, 'REJECT')"><i class="bi bi-x-circle"></i> Reject</button>`;
	}
	if (status === 'CONFIRMED') {
		buttons += `<button type="button" class="btn btn-sm btn-outline-primary update-order-action" onclick="openSalesOrderStatusAction(${orderId}, 'DISPATCH')"><i class="bi bi-truck"></i> Dispatch</button>`;
		buttons += `<button type="button" class="btn btn-sm btn-outline-success convert-order-action" onclick="openConvertSalesOrder(${orderId})"><i class="bi bi-arrow-repeat"></i> Convert</button>`;
	}
	if (status === 'DISPATCHED') {
		buttons += `<button type="button" class="btn btn-sm btn-outline-success update-order-action" onclick="openSalesOrderStatusAction(${orderId}, 'DELIVER')"><i class="bi bi-box2-heart"></i> Deliver</button>`;
		buttons += `<button type="button" class="btn btn-sm btn-outline-success convert-order-action" onclick="openConvertSalesOrder(${orderId})"><i class="bi bi-arrow-repeat"></i> Convert</button>`;
	}
	if (status === 'DELIVERED') {
		buttons += `<button type="button" class="btn btn-sm btn-outline-success convert-order-action" onclick="openConvertSalesOrder(${orderId})"><i class="bi bi-arrow-repeat"></i> Convert</button>`;
	}
	if (['PENDING', 'CONFIRMED', 'DISPATCHED'].includes(status)) {
		buttons += `<button type="button" class="btn btn-sm btn-outline-danger delete-order-action" onclick="openSalesOrderStatusAction(${orderId}, 'CANCEL')"><i class="bi bi-slash-circle"></i> Cancel</button>`;
	}

	return `<div class="order-actions">${buttons}</div>`;
}

function applySalesOrderActionVisibility() {
	const role = getNormalizedSaasRole();
	const customer = role === 'SAAS_CUSTOMER';

	document.querySelectorAll('.update-order-action').forEach(function(button) {
		button.style.display = customer ? 'none' : (salesOrderPermissions.update ? '' : 'none');
	});

	document.querySelectorAll('.delete-order-action').forEach(function(button) {
		button.style.display = customer ? 'none' : (salesOrderPermissions.delete ? '' : 'none');
	});

	document.querySelectorAll('.convert-order-action').forEach(function(button) {
		button.style.display = customer ? 'none' : (salesOrderPermissions.update && salesOrderPermissions.createSale ? '' : 'none');
	});
}

/* =========================================================
   DETAILS / STATUS / CONVERSION
========================================================= */

function showSalesOrderDetails(orderId) {
	const order = findSalesOrder(orderId);
	if (!order) {
		showMsg('Sales order details not found.');
		return;
	}

	const role = getNormalizedSaasRole();
	const items = Array.isArray(order.items) ? order.items : [];
	const timeline = Array.isArray(order.timeline) ? order.timeline : [];
	const content = document.getElementById('salesOrderDetailsContent');
	if (!content) return;

	const partyLabel = role === 'SAAS_CUSTOMER' ? 'Wholesaler' : 'Customer';
	const partyName = role === 'SAAS_CUSTOMER' ? (order.wholesalerName || localStorage.getItem('tenantName') || '-') : order.customerName;
	const partyCode = role === 'SAAS_CUSTOMER' ? (order.wholesalerCode || '-') : (order.customerCode || '-');

	content.innerHTML = `
        <div class="row g-3 mb-4">
            <div class="col-md-4"><div class="order-detail-card"><span class="order-detail-label">Order Number</span><div class="order-detail-value">${escapeHtml(order.orderNumber)}</div></div></div>
            <div class="col-md-4"><div class="order-detail-card"><span class="order-detail-label">Order Date</span><div class="order-detail-value">${formatDate(order.orderDate)}</div></div></div>
            <div class="col-md-4"><div class="order-detail-card"><span class="order-detail-label">Status</span><div class="order-detail-value">${salesOrderStatusBadge(order.orderStatus)}</div></div></div>
            <div class="col-md-6"><div class="order-detail-card"><span class="order-detail-label">${partyLabel}</span><div class="order-detail-value">${escapeHtml(partyName)}</div></div></div>
            <div class="col-md-3"><div class="order-detail-card"><span class="order-detail-label">Code</span><div class="order-detail-value">${escapeHtml(partyCode)}</div></div></div>
            <div class="col-md-3"><div class="order-detail-card"><span class="order-detail-label">Expected Delivery</span><div class="order-detail-value">${formatDate(order.expectedDeliveryDate)}</div></div></div>
            <div class="col-12"><div class="order-detail-card"><span class="order-detail-label">Shipping Address</span><div class="order-detail-value">${escapeHtml(order.shippingAddress || '-')}</div></div></div>
        </div>
        <div class="table-responsive mb-4"><table class="table table-bordered align-middle"><thead><tr><th>Medicine</th><th>Quantity</th><th>Rate</th><th>Discount</th><th>GST</th><th>Total</th></tr></thead><tbody>
            ${items.map(function(item) {
		return `<tr><td><strong>${escapeHtml(item.medicineName)}</strong><div class="small text-muted">${escapeHtml(item.manufacturer || '-')}</div></td><td>${Number(item.quantity || 0)}</td><td>${formatCurrency(item.saleRate)}</td><td>${Number(item.discountPercentage || 0).toFixed(2)}%</td><td>${Number(item.gstPercentage || 0).toFixed(2)}%</td><td><strong>${formatCurrency(item.lineTotal)}</strong></td></tr>`;
	}).join('')}
        </tbody></table></div>
        <div class="row g-3 mb-4">
            <div class="col-md-3"><div class="order-detail-card"><span class="order-detail-label">Gross Amount</span><div class="order-detail-value">${formatCurrency(order.grossAmount)}</div></div></div>
            <div class="col-md-3"><div class="order-detail-card"><span class="order-detail-label">Discount</span><div class="order-detail-value">${formatCurrency(order.discountAmount)}</div></div></div>
            <div class="col-md-3"><div class="order-detail-card"><span class="order-detail-label">GST</span><div class="order-detail-value">${formatCurrency(order.gstAmount)}</div></div></div>
            <div class="col-md-3"><div class="order-detail-card"><span class="order-detail-label">Grand Total</span><div class="order-detail-value">${formatCurrency(order.grandTotal)}</div></div></div>
        </div>
        ${role === 'WHOLESALER' && order.convertedSaleNumber ? `<div class="alert alert-success"><i class="bi bi-check-circle-fill me-1"></i>Order converted to sale: <strong>${escapeHtml(order.convertedSaleNumber)}</strong></div>` : ''}
        ${order.rejectionReason ? `<div class="alert alert-danger"><strong>Rejection Reason:</strong> ${escapeHtml(order.rejectionReason)}</div>` : ''}
        ${order.cancellationReason ? `<div class="alert alert-danger"><strong>Cancellation Reason:</strong> ${escapeHtml(order.cancellationReason)}</div>` : ''}
        <div class="mt-4"><h6 class="fw-bold text-primary mb-3">Order Timeline</h6><div class="order-timeline">
            ${timeline.length ? timeline.map(function(entry) { return `<div class="order-timeline-item"><div class="d-flex justify-content-between gap-3"><strong>${escapeHtml(entry.statusLabel)}</strong><small>${formatDateTime(entry.createdAt)}</small></div>${entry.remarks ? `<small>${escapeHtml(entry.remarks)}</small>` : ''}</div>`; }).join('') : '<p class="text-muted">No timeline records found.</p>'}
        </div></div>
    `;

	if (salesOrderDetailsModal) salesOrderDetailsModal.show();
}

function openSalesOrderStatusAction(orderId, actionType) {
	if (getNormalizedSaasRole() !== 'WHOLESALER') return;
	const order = findSalesOrder(orderId);
	if (!order) {
		showMsg('Sales order not found.');
		return;
	}

	const configuration = {
		CONFIRM: { eyebrow: 'Stock Verification', title: 'Confirm Sales Order', label: 'Remarks', placeholder: 'Confirmation remarks', required: false },
		REJECT: { eyebrow: 'Order Rejection', title: 'Reject Sales Order', label: 'Rejection Reason *', placeholder: 'Enter rejection reason', required: true },
		DISPATCH: { eyebrow: 'Order Dispatch', title: 'Dispatch Sales Order', label: 'Dispatch Remarks', placeholder: 'Courier, vehicle or dispatch details', required: false },
		DELIVER: { eyebrow: 'Order Delivery', title: 'Mark Order Delivered', label: 'Delivery Remarks', placeholder: 'Delivery acknowledgement', required: false },
		CANCEL: { eyebrow: 'Order Cancellation', title: 'Cancel Sales Order', label: 'Cancellation Reason *', placeholder: 'Enter cancellation reason', required: true }
	};

	const config = configuration[actionType];
	if (!config) return;

	setValue('statusActionOrderId', order.id);
	setValue('statusActionType', actionType);
	setValue('statusActionRemarks', '');
	setText('statusActionEyebrow', config.eyebrow);
	setText('statusActionTitle', config.title);
	setText('statusActionRemarksLabel', config.label);
	setText('statusActionOrderLabel', `${order.orderNumber} — ${order.customerName || '-'}`);

	const remarks = document.getElementById('statusActionRemarks');
	if (remarks) {
		remarks.placeholder = config.placeholder;
		remarks.dataset.required = config.required ? 'true' : 'false';
	}

	if (salesOrderStatusModal) salesOrderStatusModal.show();
}

async function submitSalesOrderStatusAction() {
	if (isUpdatingSalesOrder) return;

	const orderId = getNumberValue('statusActionOrderId');
	const actionType = getValue('statusActionType');
	const remarks = getValue('statusActionRemarks');
	const remarksElement = document.getElementById('statusActionRemarks');

	if (remarksElement?.dataset.required === 'true' && !remarks) {
		showMsg('Reason is required for this action.');
		return;
	}

	const endpoint = { CONFIRM: 'confirm', REJECT: 'reject', DISPATCH: 'dispatch', DELIVER: 'deliver', CANCEL: 'cancel' }[actionType];
	if (!endpoint) return;

	isUpdatingSalesOrder = true;
	setButtonLoading('submitStatusActionBtn', 'Updating...', true);

	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/sales-orders/${orderId}/${endpoint}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				tenantId: Number(localStorage.getItem('tenantId')),
				remarks: remarks
			})
		}
	);

	isUpdatingSalesOrder = false;
	setButtonLoading('submitStatusActionBtn', 'Continue', false);

	if (!result.ok) {
		showMsg(getSalesOrderErrorMessage(result.data, 'Unable to update sales order.'));
		return;
	}

	if (salesOrderStatusModal) salesOrderStatusModal.hide();
	showMsg('Sales order updated successfully.', 'success');
	await Promise.all([loadSalesOrders(), loadSalesOrderSummary()]);
}

function openConvertSalesOrder(orderId) {
	if (getNormalizedSaasRole() !== 'WHOLESALER') return;
	if (!salesOrderPermissions.update || !salesOrderPermissions.createSale) {
		showMsg('You do not have permission to convert this order to sale.');
		return;
	}

	const order = findSalesOrder(orderId);
	if (!order) {
		showMsg('Sales order not found.');
		return;
	}

	setValue('convertOrderId', order.id);
	setText('convertOrderLabel', `${order.orderNumber} — ${order.customerName} — ${formatCurrency(order.grandTotal)}`);
	setValue('convertSaleDate', new Date().toISOString().substring(0, 10));
	setValue('convertPaidAmount', '0');
	setValue('convertSaleRemarks', `Converted from sales order ${order.orderNumber}`);

	if (convertSalesOrderModal) convertSalesOrderModal.show();
}

async function convertSalesOrderToSale() {
	if (isConvertingSalesOrder) return;

	const orderId = getNumberValue('convertOrderId');
	const order = findSalesOrder(orderId);
	if (!order) {
		showMsg('Sales order not found.');
		return;
	}

	const paidAmount = getNumberValue('convertPaidAmount');
	if (paidAmount < 0) {
		showMsg('Paid amount cannot be negative.');
		return;
	}
	if (paidAmount > Number(order.grandTotal || 0)) {
		showMsg('Paid amount cannot exceed order grand total.');
		return;
	}

	isConvertingSalesOrder = true;
	setButtonLoading('convertToSaleBtn', 'Converting...', true);

	const result = await salesOrderApiRequest(
		`${API_BASE}/saas/sales-orders/${orderId}/convert-to-sale`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				tenantId: Number(localStorage.getItem('tenantId')),
				saleDate: getValue('convertSaleDate') || null,
				paidAmount: paidAmount,
				remarks: getValue('convertSaleRemarks')
			})
		}
	);

	isConvertingSalesOrder = false;
	setButtonLoading('convertToSaleBtn', 'Convert to Sale', false);

	if (!result.ok) {
		showMsg(getSalesOrderErrorMessage(result.data, 'Unable to convert order to sale.'));
		return;
	}

	if (convertSalesOrderModal) convertSalesOrderModal.hide();
	showMsg('Sales order converted to sale and inventory deducted successfully.', 'success');
	await Promise.all([loadSalesOrders(), loadSalesOrderSummary(), loadSalesOrderStocks()]);
	refreshSalesOrderMedicineDropdowns();
}

/* =========================================================
   ORDER HELPERS
========================================================= */

function findSalesOrder(orderId) {
	return salesOrderList.find(function(order) {
		return Number(order.id) === Number(orderId);
	}) || null;
}

function getSelectedOrderCustomer() {
	const customerId = getNumberValue('salesOrderCustomerId');
	return salesOrderCustomers.find(function(customer) {
		return Number(customer.id) === Number(customerId);
	}) || null;
}

function salesOrderStatusBadge(status) {
	const normalized = String(status || '').toUpperCase();
	switch (normalized) {
		case 'PENDING': return '<span class="order-status pending"><i class="bi bi-hourglass-split"></i>Pending</span>';
		case 'CONFIRMED': return '<span class="order-status confirmed"><i class="bi bi-check-circle-fill"></i>Accepted</span>';
		case 'DISPATCHED': return '<span class="order-status dispatched"><i class="bi bi-truck"></i>On The Way</span>';
		case 'DELIVERED': return '<span class="order-status delivered"><i class="bi bi-box2-heart-fill"></i>Completed</span>';
		case 'REJECTED': return '<span class="order-status rejected"><i class="bi bi-x-circle-fill"></i>Rejected</span>';
		case 'CANCELLED': return '<span class="order-status cancelled"><i class="bi bi-slash-circle-fill"></i>Cancelled</span>';
		case 'CONVERTED_TO_SALE': return '<span class="order-status converted"><i class="bi bi-arrow-repeat"></i>Converted to Sale</span>';
		default: return `<span class="order-status pending">${escapeHtml(normalized || 'Unknown')}</span>`;
	}
}

function showSalesOrderLoadingState() {
	const tbody = document.getElementById('salesOrderTableBody');
	if (!tbody) return;
	tbody.innerHTML = `<tr><td colspan="10"><div class="sales-order-state"><div class="spinner-border text-primary" role="status"></div><p class="text-muted mt-3 mb-0">Loading sales orders...</p></div></td></tr>`;
}

function showSalesOrderErrorState(message) {
	const tbody = document.getElementById('salesOrderTableBody');
	if (!tbody) return;
	tbody.innerHTML = `<tr><td colspan="10"><div class="sales-order-state text-danger"><i class="bi bi-exclamation-triangle-fill fs-1"></i><h5 class="fw-bold mt-3">Unable to load sales orders</h5><p class="text-muted mb-0">${escapeHtml(message)}</p></div></td></tr>`;
}

/* =========================================================
   API / UTILITIES
========================================================= */

async function salesOrderApiRequest(url, options = {}) {
	const token = localStorage.getItem('token');
	const headers = {
		'Authorization': 'Bearer ' + token,
		'Accept': 'application/json',
		...(options.headers || {})
	};

	try {
		const response = await fetch(url, { ...options, headers: headers });
		const data = await readSalesOrderResponse(response);
		return { ok: response.ok, status: response.status, data: data };
	} catch (error) {
		console.error('Sales order API error:', error);
		return { ok: false, status: 0, data: { message: 'Sales order service is not reachable.' } };
	}
}

async function readSalesOrderResponse(response) {
	try {
		const text = await response.text();
		if (!text.trim()) return {};
		try { return JSON.parse(text); } catch (error) { return { message: text }; }
	} catch (error) {
		return {};
	}
}

function getSalesOrderErrorMessage(data, fallback) {
	if (!data) return fallback;
	if (typeof data === 'string') return data;
	return data.message || data.error || fallback;
}

function numberFromRow(row, selector) {
	const value = Number(row.querySelector(selector)?.value || 0);
	return Number.isFinite(value) ? value : 0;
}

function getNumberValue(id) {
	const value = Number(getValue(id));
	return Number.isFinite(value) ? value : 0;
}

function getValue(id) {
	const element = document.getElementById(id);
	return element ? String(element.value || '').trim() : '';
}

function setValue(id, value) {
	const element = document.getElementById(id);
	if (element) element.value = value === null || value === undefined ? '' : value;
}

function setText(id, value) {
	const element = document.getElementById(id);
	if (element) element.textContent = value === null || value === undefined ? '' : value;
}

function showOrHideById(id, visible) {
	const element = document.getElementById(id);
	if (element) element.style.display = visible ? '' : 'none';
}

function setButtonLoading(buttonId, loadingText, isLoading) {
	const button = document.getElementById(buttonId);
	if (!button) return;

	if (isLoading) {
		if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
		button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${escapeHtml(loadingText)}`;
		button.disabled = true;
		return;
	}

	button.innerHTML = button.dataset.originalHtml || button.innerHTML;
	button.disabled = false;
}

function setAnimatedNumber(id, value) {
	const element = document.getElementById(id);
	if (!element) return;
	element.textContent = Number(value) || 0;
}

function formatCurrency(value) {
	return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatDate(value) {
	if (!value) return '-';
	const date = new Date(value + 'T00:00:00');
	if (Number.isNaN(date.getTime())) return '-';
	return date.toLocaleDateString('en-IN');
}

function formatDateTime(value) {
	if (!value) return '-';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';
	return date.toLocaleString('en-IN');
}

function showMsg(message, type = 'danger') {
	const element = document.getElementById('msg');
	if (!element) {
		alert(message);
		return;
	}
	element.innerHTML = `<div class="alert alert-${escapeHtml(type)} alert-dismissible fade show" role="alert">${escapeHtml(message)}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
