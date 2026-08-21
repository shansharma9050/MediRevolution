const CACHE_NAME = "medirevolution-cache-v2";

const STATIC_ASSETS = [
	"/",
	"/register",
	"/dashboard",
	"/offline.html",

	"/css/medirevolution.css",
	"/js/auth.js",
	"/js/dashboard.js",
	"/js/common-dashboard.js",

	"/images/logo.png",
	"/images/icon-192.png",
	"/images/icon-512.png",

	"/manifest.json"
];

self.addEventListener("install", event => {

	event.waitUntil(
		caches.open(CACHE_NAME)
			.then(cache => cache.addAll(STATIC_ASSETS))
	);

	self.skipWaiting();
});


self.addEventListener("activate", event => {

	event.waitUntil(
		caches.keys().then(keys => {

			return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))) })
	);

	self.clients.claim();
});


self.addEventListener("fetch", event => {

	const request = event.request;

	if (request.method !== "GET") {
		return;
	}

	const url = new URL(request.url);


	/*
	 * =========================================================
	 * NEVER CACHE API / DYNAMIC APPLICATION REQUESTS
	 * =========================================================
	 */

	if (
		url.pathname.startsWith("/api/") ||
		url.pathname.startsWith("/auth/") ||
		url.pathname.startsWith("/saas/") ||
		url.pathname.startsWith("/users/") ||
		url.pathname.startsWith("/medicines/") ||
		url.pathname.startsWith("/orders/") ||
		url.pathname.startsWith("/billing/") ||
		url.pathname.startsWith("/notifications/")
	) {
		return;
	}


	/*
	 * =========================================================
	 * STATIC ASSETS
	 * =========================================================
	 */

	event.respondWith(

		caches.match(request)
			.then(cachedResponse => {

				if (cachedResponse) {
					return cachedResponse;
				}

				return fetch(request)
					.then(response => {

						/*
						 * Only cache successful responses.
						 */
						if (
							response &&
							response.status === 200 &&
							response.type === "basic"
						) {

							const responseClone = response.clone();

							caches.open(CACHE_NAME)
								.then(cache => {
									cache.put(request, responseClone);
								});
						}

						return response;
					});

			})
			.catch(() => {

				return caches.match("/offline.html");

			})

	);

});