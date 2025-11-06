#!/usr/bin/env bash
set -euo pipefail
# ----------------------------
# 📘 github-utils.sh
# Common GitHub API helper functions
# ----------------------------

source "${SCRIPT_DIR}/utils/logger.sh"

github_api() {
  local endpoint="$1"
  local token="{$2:-default}"

  if [[ -n "$token" && "$token" == ghp_* ]]; then
      log_info "🔑 Using token: ${token:0:10}****"
   else
      echo "⚠️ No token provided, using public API"
   fi


   # Check if token looks like a classic GitHub token
   if [[ -n "$token" && "$token" == ghp_* ]]; then
       curl -s -H "Authorization: token $token" "https://api.github.com/$endpoint"
    else
        curl -s "https://api.github.com/$endpoint"
    fi
}
