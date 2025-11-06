#!/usr/bin/env bash
set -euo pipefail

source "${SCRIPT_DIR}/utils/logger.sh"

extract_github_repo_info() {
    # ==== Extract github repository information ==== #
    if [[ -f ".env.production" ]]; then
        # Export all key=value pairs to environment
        export $(grep -v '^#' .env.production | xargs)
    else
        log_warning "⚠️  .env.production not found, skipping token load."
    fi

    #  Detect GitHub repo info from local git config
    REPO_URL=$(git config --get remote.origin.url || true)
    if [[ -z "$REPO_URL" ]]; then
        log_error "❌ Error: No GitHub remote.origin.url found in git config."
    fi

    # Normalize repo URL (handle SSH and HTTPS formats)
    if [[ "$REPO_URL" =~ ^git@github\.com:(.*)\.git$ ]]; then
        GITHUB_PATH="${BASH_REMATCH[1]}"
    elif [[ "$REPO_URL" =~ ^https://github\.com/(.*)\.git$ ]]; then
        GITHUB_PATH="${BASH_REMATCH[1]}"
    else
        log_error "❌ Unsupported GitHub URL format: $REPO_URL"
    fi

    # Extract github owner and github repo
    GITHUB_OWNER=$(echo "$GITHUB_PATH" | cut -d'/' -f1)
    GITHUB_REPO=$(echo "$GITHUB_PATH" | cut -d'/' -f2)
    log_success "📦 Repository detected: $GITHUB_OWNER/$GITHUB_REPO"

    # Check GitHub Token
    if [[ -z "$SE_GIT_TOKEN" ]]; then
        log_warning "⚠️  SE_GIT_TOKEN not found in .env.production — using unauthenticated API (rate-limited)."
    else
        log_info "🔑 Using GitHub token from .env.production"
    fi

    log_info "🔍 Fetching contributors from GitHub..."
    source "${SCRIPT_DIR}/plugins/github-utils.sh"
    response=$(github_api "repos/$GITHUB_OWNER/$GITHUB_REPO/contributors" "$SE_GIT_TOKEN")

    # Check if 'status' exists in response
    if echo "$response" | grep -q '"status"'; then
        # Extract status number
        api_status=$(echo "$response" | grep -o '"status": *"[^"]*"' | sed 's/"status": *"//;s/"//')
        # Conditional handling based on status
        source "${SCRIPT_DIR}/utils/status-checker.sh";
        status_checker "$api_status"

    else
        # No status → API call succeeded
        log_info "✅ GitHub API call succeeded."

        # Extract all login values
        contributors=$(echo "$response" \
        | grep -o '"login": *"[^"]*"' \
        | sed 's/"login": *"//;s/"//')

        # if contributors not found then display error message
        if [[ -z "$contributors" ]]; then
            log_error "❌ No contributors found for $GITHUB_OWNER/$GITHUB_REPO"
        fi
    fi
    
    # export all value from here...
    export REPO_URL
    export GITHUB_PATH
    export GITHUB_OWNER
    export GITHUB_REPO
    export contributors
}
