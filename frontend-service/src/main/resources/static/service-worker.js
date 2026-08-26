"use strict";

/* ==========================================================
   MediRevolution PWA Service Worker
   Development + Production Safe
========================================================== */

/*
 * IMPORTANT:
 * Every meaningful service-worker/static-cache change should
 * bump this version.
 */
const CACHE_NAME = "medirevolution-cache-v4";

const OFFLINE_URL = "/offline.html";

/*
 * Only truly static bootstrap assets are pre-cached.
 *
 * Do NOT put /saas pages or dynamic JS here.
 * SaaS/application resources should be fetched from network.
 */
const STATIC_ASSETS = [
	"/",
	"/register",
	"/dashboard",
	OFFLINE_URL,

	"/css/medirevolution.css",

	"/js/auth.js",
	"/js/dashboard.js",
	"/js/common-dashboard.js",

	"/images/logo.png",
	"/images/icon-192.png",
	"/images/icon-512.png",

	"/manifest.json"
];


/* ==========================================================
   URL HELPERS
========================================================== */

function isNeverCacheRequest(request) {

	if (!request) {
		return true;
	}

	if (request.method !== "GET") {
		return true;
	}

	const url = new URL(
		request.url,
		self.location.origin
	);

	const path = url.pathname;

	/*
	 * Dynamic/application endpoints.
	 */
	const neverCachePrefixes = [
		"/api/",
		"/auth/",
		"/saas/",
		"/users/",
		"/medicines/",
		"/orders/",
		"/billing/",
		"/notifications/"
	];

	return neverCachePrefixes.some(
		prefix => path.startsWith(prefix)
	);
}


/* ==========================================================
   STATIC RESOURCE CHECK
========================================================== */

function isStaticAssetRequest(request) {

	if (!request) {
		return false;
	}

	if (request.method !== "GET") {
		return false;
	}

	const url = new URL(
		request.url,
		self.location.origin
	);

	const path =
		url.pathname.toLowerCase();

	/*
	 * Explicit static extensions.
	 */
	const staticExtensions = [
		".js",
		".css",
		".png",
		".jpg",
		".jpeg",
		".webp",
		".gif",
		".svg",
		".ico",
		".woff",
		".woff2",
		".ttf",
		".json"
	];

	return staticExtensions.some(
		extension =>
			path.endsWith(extension)
	);
}


/* ==========================================================
   INSTALL
========================================================== */

self.addEventListener(
	"install",
	event => {

		event.waitUntil(

			caches
				.open(CACHE_NAME)
				.then(async cache => {

					/*
					 * Do not make installation fail because
					 * one optional static resource failed.
					 */
					for (
						const asset of STATIC_ASSETS
					) {

						try {

							await cache.add(
								asset
							);

						} catch (error) {

							console.warn(
								"Unable to precache:",
								asset,
								error
							);

						}

					}

				})

		);

		/*
		 * Activate new SW immediately.
		 */
		self.skipWaiting();
	}
);


/* ==========================================================
   ACTIVATE
========================================================== */

self.addEventListener(
	"activate",
	event => {

		event.waitUntil(

			caches
				.keys()
				.then(cacheNames => {

					return Promise.all(

						cacheNames
							.filter(
								cacheName =>
									cacheName !== CACHE_NAME
							)
							.map(
								cacheName =>
									caches.delete(
										cacheName
									)
							)

					);

				})
				.then(() => {

					/*
					 * Immediately take control of existing
					 * clients/tabs.
					 */
					return self.clients.claim();

				})

		);
	}
);


/* ==========================================================
   FETCH
========================================================== */

self.addEventListener(
	"fetch",
	event => {

		const request =
			event.request;

		/*
		 * Ignore non-GET requests.
		 */
		if (
			!request ||
			request.method !== "GET"
		) {
			return;
		}

		/*
		 * Cross-origin requests should not be intercepted.
		 */
		const url =
			new URL(
				request.url,
				self.location.origin
			);

		if (
			url.origin !==
			self.location.origin
		) {
			return;
		}


		/* ======================================================
		   NEVER CACHE DYNAMIC / SAAS REQUESTS
		====================================================== */

		if (
			isNeverCacheRequest(
				request
			)
		) {
			return;
		}


		/* ======================================================
		   PAGE REQUESTS
		   Network first, cache fallback
		====================================================== */

		if (
			request.mode === "navigate"
		) {

			event.respondWith(

				fetch(request)
					.then(response => {

						/*
						 * We deliberately do not cache
						 * application pages here.
						 *
						 * This prevents stale Thymeleaf/HTML
						 * pages from blocking updated JS refs.
						 */
						return response;

					})
					.catch(() => {

						return caches.match(
							OFFLINE_URL
						);

					})

			);

			return;
		}


		/* ======================================================
		   STATIC JS / CSS / IMAGES
		   NETWORK FIRST
		====================================================== */

		if (
			isStaticAssetRequest(
				request
			)
		) {

			event.respondWith(

				fetch(request)
					.then(response => {

						/*
						 * Only cache successful same-origin
						 * basic responses.
						 */
						if (
							response &&
							response.status === 200 &&
							response.type === "basic"
						) {

							const responseClone =
								response.clone();

							event.waitUntil(

								caches
									.open(CACHE_NAME)
									.then(cache => {

										return cache.put(
											request,
											responseClone
										);

									})

							);

						}

						return response;

					})
					.catch(() => {

						/*
						 * Network unavailable:
						 * use previously cached static resource.
						 */
						return caches.match(
							request
						);

					})

			);

			return;
		}


		/* ======================================================
		   OTHER STATIC REQUESTS
		   Cache first
		====================================================== */

		event.respondWith(

			caches
				.match(request)
				.then(cachedResponse => {

					if (cachedResponse) {

						return cachedResponse;
					}

					return fetch(request)

						.then(response => {

							if (
								response &&
								response.status === 200 &&
								response.type === "basic"
							) {

								const responseClone =
									response.clone();

								event.waitUntil(

									caches
										.open(CACHE_NAME)
										.then(cache => {

											return cache.put(
												request,
												responseClone
											);

										})

								);

							}

							return response;

						});

				})
				.catch(() => {

					return caches.match(
						OFFLINE_URL
					);

				})

		);

	}
);