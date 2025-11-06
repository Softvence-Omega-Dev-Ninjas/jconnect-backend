#!/usr/bin/env bash
set -euo pipefail
# ----------------------------
# 📘 setup-env.sh
# Setup environment variables for the project
# ----------------------------

source "${SCRIPT_DIR}/utils/logger.sh"
source "${SCRIPT_DIR}/utils/collect-env-key.sh"

setup_env() {
    log_info "Setting up environment variables..."
    local ACTIONS_DIR="$1"
    shift
    local ENV_KEYS=("${!1}")
    local FILE=".github/actions/setup-env/action.yaml"

  log_info "Generating $FILE ..."

  mkdir -p "$(dirname "$FILE")"

  cat > "$FILE" <<EOF
name: setup-and-load-env
description: Load and prepare environment variables
inputs:
EOF

  for key in "${ENV_KEYS[@]}"; do
    echo "  $key:" >> "$FILE"
    echo "    description: \"$key from .env.production\"" >> "$FILE"
    echo "    required: true" >> "$FILE"
  done

  cat >> "$FILE" <<'EOF'
runs:
  using: "composite"
  steps:
    - name: Generate .env file
      shell: bash
      run: |
        ENV_FILE="$GITHUB_WORKSPACE/.env"
        {
EOF

  for key in "${ENV_KEYS[@]}"; do
    echo "          echo \"$key=\${{ inputs.$key }}\"" >> "$FILE"
  done

  cat >> "$FILE" <<'EOF'
        } > "$ENV_FILE"
        echo "✅ .env file generated successfully"
EOF

  log_success "Generated: $FILE"
}


