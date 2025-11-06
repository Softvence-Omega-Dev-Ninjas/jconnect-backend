#!/usr/bin/env bash
set -euo pipefail
# ----------------------------
# 📘 prerequires.sh
# Check prerequisites
# ----------------------------

source "${SCRIPT_DIR}/utils/logger.sh"

prerequirements(){
    log_info "Checking prerequisites..."

    command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed!"; exit 1; }
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed!"; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { log_error "Docker Compose is required but not installed!"; exit 1; }

    log_success "All prerequisites found!"
}

