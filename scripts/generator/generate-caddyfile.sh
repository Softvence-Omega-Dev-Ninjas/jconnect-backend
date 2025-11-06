#!/usr/bin/env bash
set -euo pipefail

generate_caddyfile() {
    local DOMAIN="$1"
    local SERVICE_NAME="${2:-app}"

    cat > Caddyfile <<EOF
$DOMAIN {
    reverse_proxy ${SERVICE_NAME}:${PORT} {
        transport http {
            dial_timeout 5s
            response_header_timeout 30s
            read_timeout 60s
            write_timeout 60s
        }
    }

    header {
        # CORS headers
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With, Accept, Origin"
        Access-Control-Allow-Credentials true
        Access-Control-Max-Age 3600

        # Security headers
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin

        # Remove server identification
        -Server
        -X-Powered-By
    }
}

:2019 {
    metrics /metrics
}
EOF
}
