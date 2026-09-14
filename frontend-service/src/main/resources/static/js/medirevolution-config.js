(function () {

    function resolveApiBase() {

        const host =
            window.location.hostname;

        /*
         * =====================================================
         * LOCAL DEVELOPMENT
         * =====================================================
         */
        if (
            host === "localhost" ||
            host === "127.0.0.1"
        ) {
            return "http://localhost:8080";
        }

        /*
         * =====================================================
         * SERVER / EC2
         * =====================================================
         *
         * Frontend:
         * http://<server-ip>:8089
         *
         * API Gateway:
         * http://<server-ip>:8090
         */
        if (
            window.location.protocol === "http:"
        ) {
            return (
                "http://" +
                host +
                ":8090"
            );
        }

        /*
         * =====================================================
         * FUTURE HTTPS / DOMAIN
         * =====================================================
         *
         * Once reverse proxy/domain is configured,
         * API can be served from same origin.
         */
        return window.location.origin;
    }


    window.MR_CONFIG =
        window.MR_CONFIG || {};

    window.MR_CONFIG.API_BASE =
        resolveApiBase();


    window.getMediRevolutionApiBase =
        function () {

            return (
                window.MR_CONFIG.API_BASE
            );
        };


    console.info(
        "MediRevolution API:",
        window.MR_CONFIG.API_BASE
    );

})();