#!/usr/bin/env bash
set -euo pipefail
# ----------------------------
# 📘 collect-env-key.sh
# Collect environment variables from .env.production
# ----------------------------

source "${SCRIPT_DIR}/utils/logger.sh.sh"

collect_env_key() {
    log_info "Collecting environment variables..."
    ENV_KEYS=()

    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        if [[ "$line" =~ ^[A-Z_][A-Z0-9_]*=(.*)$ ]] && ENV_KEYS+=("${BASH_REMATCH[1]}")
    done < "$ENV_FILE"

    log_success "Collected ${#ENV_KEYS[@]} environment variables"
    export ENV_KEYS
}
