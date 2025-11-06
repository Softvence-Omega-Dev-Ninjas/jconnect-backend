#!/usr/bin/env bash
set -euo pipefail
# ----------------------------
# 📘 extractor.sh
# Extracts metadata like package name and version
# ----------------------------

source "${SCRIPT_DIR}/utils/logger.sh"

extract_metadata() {
    log_info "Extracting package metadata..."

    if [[ -f "package.json" ]]; then
        PACKAGE_NAME=$(node -p "require('./package.json').name")
        PACKAGE_VERSION=$(node -p "require('./package.json').version")
        log_success "Extracted package: ${PACKAGE_NAME} (v${PACKAGE_VERSION})"
    else
        log_error "package.json not found! Are you in a NestJS project?"
        exit 1
    fi

    export PACKAGE_NAME
    export PACKAGE_VERSION
}
