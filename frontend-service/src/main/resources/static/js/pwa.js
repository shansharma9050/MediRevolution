let deferredPrompt = null;

console.log("PWA JS loaded");

window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;

    const installBtn = document.getElementById("installAppBtn");

    if (installBtn) {
        installBtn.style.display = "inline-block";
    }
});

async function installMediRevolutionApp() {
    if (!deferredPrompt) {
        alert("Install option is not available right now. Use browser menu: Add to Home Screen.");
        return;
    }

    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
        console.log("MediRevolution installed");
    }

    deferredPrompt = null;

    const installBtn = document.getElementById("installAppBtn");

    if (installBtn) {
        installBtn.style.display = "none";
    }
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then(registration => {
                console.log("Service Worker registered:", registration.scope);
            })
            .catch(error => {
                console.log("Service Worker registration failed:", error);
            });
    });
}

window.addEventListener("appinstalled", () => {
    console.log("MediRevolution PWA installed");
});