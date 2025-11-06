#!/usr/bin/env bash
set -euo pipefail

# ----------------------------
# 📘 stdio.sh
# Takes input from user
# ----------------------------
# if [[ "${__FILE_SOURCED:-}" == "1" ]]; then
#   return 0
# fi
# __FILE_SOURCED=1

source "${SCRIPT_DIR}/utils/logger.sh"

take_input() {
    echo ""
    log_info "Please provide the following information:"
    echo ""

    read -p "Docker Hub Username: " DOCKER_USERNAME
    read -p "Docker access token (default: empty_string): " SE_DOCKER_PASSWORD
    SE_DOCKER_PASSWORD=${SE_DOCKER_PASSWORD:-empty_string}
    read -p "Email: " EMAIL
    read -p "VPS IP Address: " VPS_HOST
    read -p "VPS User (default: root): " VPS_USER
    VPS_USER=${VPS_USER:-root}
    read -p "VPS Private key (default: empty_string): " VPS_SSH_PRIVATE_KEY
    VPS_SSH_PRIVATE_KEY=${VPS_SSH_PRIVATE_KEY:-empty_string}
    read -p "Github access token (default: empty_string): " SE_GIT_TOKEN
    SE_GIT_TOKEN=${SE_GIT_TOKEN:-}
    read -p "Application Port (default: 5000): " PORT
    PORT=${PORT:-5000}
    read -p "Domain (optional, press Enter to skip): " DOMAIN

    echo ""
    log_warning "You'll need to set these secrets manually later:"
    [[ -n "$SE_GIT_TOKEN" ]] && echo "  - GitHub Token (SE_GIT_TOKEN)"
    [[ -n "$SE_DOCKER_PASSWORD" ]] && echo "  - Docker Hub Token (SE_DOCKER_PASSWORD)"
    [[ -n "$VPS_SSH_PRIVATE_KEY" ]] && echo "  - VPS SSH Private Key (VPS_SSH_PRIVATE_KEY)"
    echo ""

    # Export all values for other scripts
    export DOCKER_USERNAME SE_DOCKER_PASSWORD EMAIL VPS_HOST VPS_USER VPS_SSH_PRIVATE_KEY SE_GIT_TOKEN PORT DOMAIN
}

