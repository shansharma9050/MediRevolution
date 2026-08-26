"use strict";

/* ==========================================================
   MediRevolution PWA
========================================================== */

let deferredPrompt = null;

console.log(
    "🔥 MediRevolution PWA JS loaded"
);


/* ==========================================================
   INSTALL PROMPT
========================================================== */

window.addEventListener(
    "beforeinstallprompt",
    event => {

        /*
         * Prevent browser from automatically showing
         * the install prompt.
         */
        event.preventDefault();

        deferredPrompt = event;

        const installBtn =
            document.getElementById(
                "installAppBtn"
            );

        if (installBtn) {

            installBtn.style.display =
                "inline-block";
        }
    }
);


/* ==========================================================
   INSTALL APP
========================================================== */

async function installMediRevolutionApp() {

    if (!deferredPrompt) {

        alert(
            "Install option is not available right now. " +
            "Use browser menu: Add to Home Screen."
        );

        return;
    }

    try {

        await deferredPrompt.prompt();

        const choice =
            await deferredPrompt.userChoice;

        if (
            choice &&
            choice.outcome === "accepted"
        ) {

            console.log(
                "✅ MediRevolution install accepted"
            );

        } else {

            console.log(
                "ℹ️ MediRevolution install dismissed"
            );
        }

    } catch (error) {

        console.error(
            "PWA install prompt failed:",
            error
        );

    } finally {

        deferredPrompt = null;

        const installBtn =
            document.getElementById(
                "installAppBtn"
            );

        if (installBtn) {

            installBtn.style.display =
                "none";
        }
    }
}


/* ==========================================================
   SERVICE WORKER REGISTRATION
========================================================== */

async function registerMediRevolutionServiceWorker() {

    if (
        !("serviceWorker" in navigator)
    ) {

        console.warn(
            "Service Worker is not supported by this browser."
        );

        return;
    }

    try {

        const registration =
            await navigator.serviceWorker.register(
                "/service-worker.js",
                {
                    updateViaCache: "none"
                }
            );

        console.log(
            "✅ Service Worker registered:",
            registration.scope
        );


        /* ==================================================
           CHECK FOR UPDATED SERVICE WORKER
        ================================================== */

        try {

            await registration.update();

            console.log(
                "✅ Service Worker update check completed"
            );

        } catch (updateError) {

            console.warn(
                "Service Worker update check failed:",
                updateError
            );
        }


        /* ==================================================
           INSTALLING WORKER
        ================================================== */

        if (registration.installing) {

            monitorServiceWorker(
                registration.installing
            );
        }


        registration.addEventListener(
            "updatefound",
            () => {

                const newWorker =
                    registration.installing;

                if (newWorker) {

                    console.log(
                        "🔄 New Service Worker found"
                    );

                    monitorServiceWorker(
                        newWorker
                    );
                }
            }
        );

    } catch (error) {

        console.error(
            "❌ Service Worker registration failed:",
            error
        );
    }
}


/* ==========================================================
   SERVICE WORKER STATE MONITOR
========================================================== */

function monitorServiceWorker(
    worker
) {

    if (!worker) {
        return;
    }

    worker.addEventListener(
        "statechange",
        () => {

            console.log(
                "Service Worker state:",
                worker.state
            );

            if (
                worker.state === "installed"
            ) {

                if (
                    navigator.serviceWorker.controller
                ) {

                    console.log(
                        "🔄 New Service Worker installed. " +
                        "Waiting to activate..."
                    );

                } else {

                    console.log(
                        "✅ Service Worker installed for first use."
                    );
                }
            }

            if (
                worker.state === "activated"
            ) {

                console.log(
                    "✅ New Service Worker activated."
                );
            }
        }
    );
}


/* ==========================================================
   SERVICE WORKER CONTROLLER CHANGE
========================================================== */

navigator.serviceWorker?.addEventListener(
    "controllerchange",
    () => {

        console.log(
            "🔄 New Service Worker now controls this page."
        );

        /*
         * Do NOT automatically reload here.
         *
         * Automatic reload can create reload loops
         * during development.
         */
    }
);


/* ==========================================================
   REGISTER AFTER PAGE LOAD
========================================================== */

window.addEventListener(
    "load",
    () => {

        registerMediRevolutionServiceWorker();

    }
);


/* ==========================================================
   PWA INSTALLED
========================================================== */

window.addEventListener(
    "appinstalled",
    () => {

        console.log(
            "✅ MediRevolution PWA installed"
        );

        deferredPrompt = null;

        const installBtn =
            document.getElementById(
                "installAppBtn"
            );

        if (installBtn) {

            installBtn.style.display =
                "none";
        }
    }
);