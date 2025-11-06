#!/usr/bin/env bash
set -euo pipefail

source "${SCRIPT_DIR}/utils/logger.sh"
source "${SCRIPT_DIR}/plugins/github-utils.sh"

contribruits_json() {
  local username="$1"

  log_info "Persing contributors: $username"

  # Fetch contributor info from GitHub API
  local contributor_data
  contributor_data=$(github_api "users/$username" "$SE_GIT_TOKEN")

  local name bio
  name=$(echo "$contributor_data" | grep -o '"name": *"[^"]*"' | head -1 | sed 's/"name": "//; s/"$//')
  bio=$(echo "$contributor_data" | grep -o '"bio": *"[^"]*"' | head -1 | sed 's/"bio": "//; s/"$//')
  avatar=$(echo "$contributor_data" | grep -o '"avatar_url": *"[^"]*"' | sed 's/"avatar_url": "//; s/"$//')
  url=$(echo "$contributor_data" | grep -o '"url": *"[^"]*"' | sed 's/"url": "//; s/"$//')


  if [[ -n "$name" && -n "$bio" ]]; then
    members_json+="          { name: \"$name\", role: \"$bio\", avatar: \"$avatar\", url: \"$url\" },\n"

    log_success "Contributors informations extracted"
  else
    log_error "⚠️ Skipping contributor $username (missing data)"
  fi
}
