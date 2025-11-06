#!/usr/bin/env bash
set -euo pipefail


# Make scripts executable
if [[ -d "scripts" ]]; then
    log_info "Making scripts executable..."
    chmod +x scripts/*.sh
    log_success "Scripts are now executable"
fi

# Create directories
log_info "Creating necessary directories..."
mkdir -p backups
mkdir -p logs
log_success "Directories created"

