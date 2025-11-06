#!/usr/bin/env bash
set -euo pipefail

status_checker(){
    local status=$1

    case "$status" in
        401)
            log_error "❌ GitHub authentication failed! Check your token."
            ;;
        404)
            log_error "❌ Repository or endpoint not found."
            ;;
        *)
            log_error "❌ GitHub API returned status: $status"
            ;;
    esac
}