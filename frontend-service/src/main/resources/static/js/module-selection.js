document.addEventListener("DOMContentLoaded", function() {

	if (!protectModuleSelectionPage()) {
		return;
	}

	initializeUserInformation();
	initializeCurrentYear();
	configureModulesByRole();
	initializeModuleCards();
	initializeLogout();
	initializeCardEntryAnimation();
	initializePremiumCardInteraction();
});


function protectModuleSelectionPage() {

	const token =
		localStorage.getItem("token");

	if (!token) {
		window.location.replace("/");
		return false;
	}

	return true;
}


function initializeUserInformation() {

	const userNameElement =
		document.getElementById(
			"loggedInUserName"
		);

	if (!userNameElement) {
		return;
	}

	const fullName =
		localStorage.getItem("fullName");

	const email =
		localStorage.getItem("email");

	userNameElement.textContent =
		fullName ||
		email ||
		"MediRevolution User";
}


function initializeCurrentYear() {

	const currentYearElement =
		document.getElementById(
			"currentYear"
		);

	if (currentYearElement) {
		currentYearElement.textContent =
			new Date().getFullYear();
	}
}


function configureModulesByRole() {

	const role =
		localStorage.getItem("role");

	const platformCard =
		document.querySelector(
			".platform-card"
		);

	const saasCard =
		document.querySelector(
			".saas-card"
		);

	const platformRoles = [
		"SUPER_ADMIN",
		"WHOLESALER",
		"RETAILER",
		"DOCTOR",
		"HOSPITAL",
		"PATIENT"
	];

	const saasRoles = [
		"WHOLESALER",
		"DOCTOR",
		"HOSPITAL",
		"SAAS_STAFF"
	];

	configureModuleCardAccess(
		platformCard,
		platformRoles.includes(role),
		"Main Platform is not available for this account."
	);

	configureModuleCardAccess(
		saasCard,
		saasRoles.includes(role),
		"SaaS Workspace is not available for this account."
	);
}


function configureModuleCardAccess(
	card,
	allowed,
	message
) {

	if (!card) {
		return;
	}

	const button =
		card.querySelector(
			".module-enter-button"
		);

	if (allowed) {

		card.classList.remove(
			"module-locked"
		);

		card.removeAttribute(
			"aria-disabled"
		);

		if (button) {
			button.disabled = false;
		}

		return;
	}

	card.classList.add(
		"module-locked"
	);

	card.setAttribute(
		"aria-disabled",
		"true"
	);

	if (button) {

		button.disabled = true;

		const buttonText =
			button.querySelector(
				".button-text"
			);

		if (buttonText) {
			buttonText.textContent =
				"Not Available";
		}
	}

	const description =
		card.querySelector(
			".module-description"
		);

	if (description) {
		description.textContent = message;
	}
}


function initializeCardEntryAnimation() {

	const cards =
		document.querySelectorAll(
			".module-card"
		);

	cards.forEach(
		function(card, index) {

			card.style.opacity = "0";
			card.style.transform =
				`translateY(${28 + index * 8}px) scale(.98)`;

			window.setTimeout(
				function() {

					card.style.transition =
						"opacity .7s ease, transform .75s cubic-bezier(.22, 1, .36, 1), box-shadow .42s ease, border-color .42s ease, filter .42s ease";

					card.style.opacity = "1";
					card.style.transform = "";

				},
				220 + index * 140
			);
		}
	);
}


function initializeModuleCards() {

	const moduleCards =
		document.querySelectorAll(
			".module-card"
		);

	const moduleButtons =
		document.querySelectorAll(
			".module-enter-button"
		);

	moduleCards.forEach(
		function(card) {

			card.addEventListener(
				"click",
				function(event) {

					if (
						card.classList.contains(
							"module-locked"
						)
					) {
						return;
					}

					if (
						event.target.closest(
							".module-enter-button"
						)
					) {
						return;
					}

					openSelectedModule(
						card.querySelector(
							".module-enter-button"
						),
						card
					);
				}
			);

			card.addEventListener(
				"keydown",
				function(event) {

					if (
						card.classList.contains(
							"module-locked"
						)
					) {
						return;
					}

					if (
						event.key !== "Enter" &&
						event.key !== " "
					) {
						return;
					}

					event.preventDefault();

					openSelectedModule(
						card.querySelector(
							".module-enter-button"
						),
						card
					);
				}
			);
		}
	);

	moduleButtons.forEach(
		function(button) {

			button.addEventListener(
				"click",
				function(event) {

					event.stopPropagation();

					if (button.disabled) {
						return;
					}

					openSelectedModule(
						button,
						button.closest(
							".module-card"
						)
					);
				}
			);
		}
	);
}


function openSelectedModule(
	button,
	selectedCard
) {

	if (
		!button ||
		button.disabled
	) {
		return;
	}

	const targetUrl =
		button.dataset.target;

	const moduleName =
		button.dataset.moduleName;

	if (
		!targetUrl ||
		!moduleName
	) {
		return;
	}

	disableAllModuleButtons();
	saveSelectedModule(moduleName);
	animateSelectedCard(selectedCard);
	showModuleTransition(
		moduleName,
		targetUrl
	);
}


function saveSelectedModule(moduleName) {

	localStorage.setItem(
		"activeModule",
		moduleName
	);

	localStorage.setItem(
		"saasMode",
		moduleName === "SAAS"
			? "true"
			: "false"
	);
}


function animateSelectedCard(selectedCard) {

	document
		.querySelectorAll(".module-card")
		.forEach(
			function(card) {

				if (card === selectedCard) {

					card.classList.add(
						"module-selected"
					);

				} else {

					card.classList.add(
						"module-unselected"
					);
				}
			}
		);
}


function showModuleTransition(
	moduleName,
	targetUrl
) {

	const overlay =
		document.getElementById(
			"moduleTransitionOverlay"
		);

	const title =
		document.getElementById(
			"transitionTitle"
		);

	const message =
		document.getElementById(
			"transitionMessage"
		);

	const icon =
		document.getElementById(
			"transitionModuleIcon"
		);

	if (!overlay) {

		continueToSelectedModule(
			moduleName,
			targetUrl
		);

		return;
	}

	if (moduleName === "SAAS") {

		overlay.classList.add(
			"saas-transition"
		);

		if (title) {
			title.textContent =
				"Opening Healthcare SaaS";
		}

		if (message) {
			message.textContent =
				"Preparing your secure private workspace...";
		}

		if (icon) {
			icon.innerHTML =
				'<i class="bi bi-building-gear"></i>';
		}

	} else {

		overlay.classList.remove(
			"saas-transition"
		);

		if (title) {
			title.textContent =
				"Opening Main Platform";
		}

		if (message) {
			message.textContent =
				"Connecting you to the MediRevolution healthcare ecosystem...";
		}

		if (icon) {
			icon.innerHTML =
				'<i class="bi bi-globe2"></i>';
		}
	}

	window.requestAnimationFrame(
		function() {
			overlay.classList.add(
				"active"
			);
		}
	);

	window.setTimeout(
		function() {

			continueToSelectedModule(
				moduleName,
				targetUrl
			);

		},
		1600
	);
}


function continueToSelectedModule(
	moduleName,
	targetUrl
) {

	if (moduleName === "SAAS") {

		const tenantId =
			localStorage.getItem(
				"tenantId"
			);

		window.location.href =
			tenantId
				? "/saas/dashboard"
				: "/saas/workspaces";

		return;
	}

	window.location.href =
		targetUrl || "/dashboard";
}


function disableAllModuleButtons() {

	document
		.querySelectorAll(
			".module-enter-button"
		)
		.forEach(
			function(button) {
				button.disabled = true;
			}
		);
}


function initializeLogout() {

	const logoutButton =
		document.getElementById(
			"logoutButton"
		);

	if (!logoutButton) {
		return;
	}

	logoutButton.addEventListener(
		"click",
		performLogout
	);
}


function performLogout() {

	const rememberedEmail =
		localStorage.getItem(
			"rememberedEmail"
		);

	const rememberedPassword =
		localStorage.getItem(
			"rememberedPassword"
		);

	localStorage.clear();
	sessionStorage.clear();

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

	window.location.replace("/");
}


function initializePremiumCardInteraction() {

	const cardsContainer =
		document.querySelector(
			".module-cards-container"
		);

	const cards =
		document.querySelectorAll(
			".module-card"
		);

	if (!cardsContainer || !cards.length) {
		return;
	}

	cards.forEach(
		function(card) {

			card.addEventListener(
				"pointermove",
				function(event) {

					const bounds =
						card.getBoundingClientRect();

					const x =
						((event.clientX - bounds.left) /
							bounds.width) * 100;

					const y =
						((event.clientY - bounds.top) /
							bounds.height) * 100;

					card.style.setProperty(
						"--spot-x",
						x + "%"
					);

					card.style.setProperty(
						"--spot-y",
						y + "%"
					);
				}
			);

			card.addEventListener(
				"pointerenter",
				function() {

					card.classList.add(
						"card-hovered"
					);

					cardsContainer.classList.add(
						"card-focus-active"
					);
				}
			);

			card.addEventListener(
				"pointerleave",
				function() {

					card.classList.remove(
						"card-hovered"
					);

					cardsContainer.classList.remove(
						"card-focus-active"
					);

					card.style.setProperty(
						"--spot-x",
						"20%"
					);

					card.style.setProperty(
						"--spot-y",
						"10%"
					);
				}
			);

			card.addEventListener(
				"focusin",
				function() {

					card.classList.add(
						"card-hovered"
					);

					cardsContainer.classList.add(
						"card-focus-active"
					);
				}
			);

			card.addEventListener(
				"focusout",
				function() {

					card.classList.remove(
						"card-hovered"
					);

					cardsContainer.classList.remove(
						"card-focus-active"
					);
				}
			);
		}
	);
}