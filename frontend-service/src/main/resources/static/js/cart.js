let cart = [];

/*const API_BASE = "http://localhost:8080";*/

document.addEventListener("DOMContentLoaded", function() {

	loadCart();

});

function loadCart() {

	cart =
		JSON.parse(
			localStorage.getItem("mr_cart") || "[]"
		);

	renderCart();
}

function renderCart() {

	const table =
		document.getElementById("cartTable");

	if (cart.length === 0) {

		table.innerHTML =
			`
            <tr>
                <td colspan="6"
                    class="text-center text-muted">
                    Cart Empty
                </td>
            </tr>
        `;

		return;
	}

	let html = "";

	let subtotal = 0;
	let gst = 0;

	cart.forEach((item, index) => {

		const lineTotal =
			item.quantity *
			item.wholesalePrice;

		const gstAmount =
			lineTotal *
			item.gstPercentage / 100;

		subtotal += lineTotal;
		gst += gstAmount;

		html += `
        
        <tr>

            <td>
                <strong>${item.medicineName}</strong>
            </td>

            <td>
                ${item.batchNumber}
            </td>

            <td>
                ${item.quantity}
            </td>

            <td>
                ₹ ${item.wholesalePrice}
            </td>

            <td>
                ₹ ${(lineTotal + gstAmount).toFixed(2)}
            </td>

            <td>

                <button class="btn btn-danger btn-sm"
                        onclick="removeItem(${index})">
                    Remove
                </button>

            </td>

        </tr>
        
        `;
	});

	table.innerHTML = html;

	document.getElementById("itemCount").innerText =
		cart.length;

	document.getElementById("subTotal").innerText =
		subtotal.toFixed(2);

	document.getElementById("gstTotal").innerText =
		gst.toFixed(2);

	document.getElementById("grandTotal").innerText =
		(subtotal + gst).toFixed(2);
}

function removeItem(index) {

	cart.splice(index, 1);

	localStorage.setItem(
		"mr_cart",
		JSON.stringify(cart)
	);

	renderCart();
}

async function placeOrder() {

    if (cart.length === 0) {

        showMessage("Cart is empty");

        return;
    }

    const wholesalerId =
        cart[0].wholesalerAuthUserId;

    const payload = {

        wholesalerAuthUserId:
            wholesalerId,

        items:
            cart.map(item => ({

                stockId:
                    item.stockId,

                quantity:
                    item.quantity

            }))
    };

    const token =
        localStorage.getItem("token");

    try {

        const response =
            await fetch(
                `${API_BASE}/orders`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token
                    },

                    body:
                        JSON.stringify(payload)
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            showMessage(
                result.message ||
                "Order failed"
            );

            return;
        }

        localStorage.removeItem("mr_cart");

        showMessage(
            "Order placed successfully",
            "success"
        );

        setTimeout(() => {

            window.location.href =
                "/dashboard";

        }, 2000);

    } catch (e) {

        showMessage(
            "Server unavailable"
        );
    }
}

function showMessage(
    message,
    type = "danger"
) {

    document.getElementById("msg")
        .innerHTML =
        `<div class="alert alert-${type}">
            ${message}
        </div>`;
}