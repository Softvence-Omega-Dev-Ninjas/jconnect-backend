#!/usr/bin/env bash
set -euo pipefail

# ================================
# Zero-Downtime Deployment Script
# ================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${RESET} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${RESET} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${RESET} $*"; }
log_error() { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# Load environment variables
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
else
    log_error ".env file not found!"
    exit 1
fi

# Required variables
PACKAGE_NAME="${PACKAGE_NAME:-app}"
VERSION="${1:-latest}"
LIVE_CONTAINER="${PACKAGE_NAME}_live"
CANDIDATE_CONTAINER="${PACKAGE_NAME}_candidate"
IMAGE="${DOCKER_USERNAME}/${PACKAGE_NAME}:${VERSION}"
HEALTH_ENDPOINT="http://localhost:${PORT}/api/health"
MAX_HEALTH_CHECKS=30
HEALTH_CHECK_INTERVAL=2

# ================================
# Helper Functions
# ================================

check_container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${1}$"
}

check_container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${1}$"
}

wait_for_healthy() {
    local container=$1
    local max_attempts=$2
    local attempt=1

    log_info "Waiting for $container to become healthy..."

    while [ $attempt -le "$max_attempts" ]; do
        if docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null | grep -q "healthy"; then
            log_success "$container is healthy!"
            return 0
        fi

        log_info "Health check attempt $attempt/$max_attempts..."
        sleep $HEALTH_CHECK_INTERVAL
        ((attempt++))
    done

    log_error "$container failed to become healthy after $max_attempts attempts"
    return 1
}

cleanup_old_images() {
    log_info "Cleaning up old images..."
    docker image prune -f --filter "label=app=${PACKAGE_NAME}" || true
    log_success "Old images cleaned up"
}

rollback() {
    log_error "Deployment failed! Rolling back..."

    # Stop and remove candidate
    if check_container_exists "$CANDIDATE_CONTAINER"; then
        docker stop "$CANDIDATE_CONTAINER" 2>/dev/null || true
        docker rm "$CANDIDATE_CONTAINER" 2>/dev/null || true
    fi

    # Ensure live container is running
    if check_container_exists "$LIVE_CONTAINER"; then
        if ! check_container_running "$LIVE_CONTAINER"; then
            log_warning "Live container not running. Starting it..."
            docker start "$LIVE_CONTAINER" || log_error "Failed to start live container!"
        fi
    fi

    log_error "Rollback completed. Live service maintained."
    exit 1
}

# ================================
# Deployment Functions
# ================================

deploy_new_version() {
    log_info "Starting zero-downtime deployment for version: $VERSION"

    # Pull the new image
    log_info "Pulling new image: $IMAGE"
    if ! docker pull "$IMAGE"; then
        log_error "Failed to pull image: $IMAGE"
        exit 1
    fi
    log_success "Image pulled successfully"

    # Remove existing candidate if it exists
    if check_container_exists "$CANDIDATE_CONTAINER"; then
        log_info "Removing existing candidate container..."
        docker stop "$CANDIDATE_CONTAINER" 2>/dev/null || true
        docker rm "$CANDIDATE_CONTAINER" 2>/dev/null || true
    fi

    # Start candidate container
    log_info "Starting candidate container..."
    if ! docker compose --profile prod up -d app_candidate; then
        log_error "Failed to start candidate container"
        rollback
    fi

    # Wait for candidate to be healthy
    log_info "Performing health checks on candidate..."
    if ! wait_for_healthy "$CANDIDATE_CONTAINER" "$MAX_HEALTH_CHECKS"; then
        log_error "Candidate container health check failed"
        docker logs --tail=50 "$CANDIDATE_CONTAINER"
        rollback
    fi

    # Update Caddy to point to candidate (blue-green switch)
    log_info "Switching traffic to candidate container..."

    # Create temporary Caddyfile pointing to candidate
    if [[ -f Caddyfile ]]; then
        cp Caddyfile Caddyfile.backup
        sed -i "s/app_live:${PORT}/app_candidate:${PORT}/g" Caddyfile

        # Reload Caddy configuration
        docker exec caddy_server caddy reload --config /etc/caddy/Caddyfile || {
            log_error "Failed to reload Caddy configuration"
            mv Caddyfile.backup Caddyfile
            rollback
        }

        log_success "Traffic switched to candidate"
        sleep 2  # Brief pause to ensure traffic is flowing
    fi

    # Stop old live container
    if check_container_running "$LIVE_CONTAINER"; then
        log_info "Stopping old live container..."
        docker stop "$LIVE_CONTAINER"
        log_success "Old live container stopped"
    fi

    # Remove old live container
    if check_container_exists "$LIVE_CONTAINER"; then
        log_info "Removing old live container..."
        docker rm "$LIVE_CONTAINER"
    fi

    # Promote candidate to live
    log_info "Promoting candidate to live..."
    docker rename "$CANDIDATE_CONTAINER" "$LIVE_CONTAINER"

    # Update Caddyfile back to app_live
    if [[ -f Caddyfile ]]; then
        mv Caddyfile.backup Caddyfile
        docker exec caddy_server caddy reload --config /etc/caddy/Caddyfile
        log_success "Caddyfile restored to point to live container"
    fi

    # Update docker-compose to ensure live is the new version
    docker compose --profile prod up -d app_live

    # Cleanup
    cleanup_old_images

    log_success "==================================="
    log_success "🎉 Deployment completed successfully!"
    log_success "Version: $VERSION"
    log_success "==================================="
}

show_status() {
    echo ""
    log_info "==================================="
    log_info "Deployment Status"
    log_info "==================================="

    if check_container_running "$LIVE_CONTAINER"; then
        log_success "Live Container: RUNNING"
        docker inspect --format='{{.State.Health.Status}}' "$LIVE_CONTAINER" 2>/dev/null | \
            sed "s/^/  Health: /" || echo "  Health: unknown"
    else
        log_warning "Live Container: NOT RUNNING"
    fi

    if check_container_running "$CANDIDATE_CONTAINER"; then
        log_info "Candidate Container: RUNNING"
        docker inspect --format='{{.State.Health.Status}}' "$CANDIDATE_CONTAINER" 2>/dev/null | \
            sed "s/^/  Health: /" || echo "  Health: unknown"
    else
        log_info "Candidate Container: NOT RUNNING"
    fi

    echo ""
    log_info "Running Containers:"
    docker ps --filter "name=${PACKAGE_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo ""
    log_info "Recent Images:"
    docker images "${DOCKER_USERNAME}/${PACKAGE_NAME}" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
}

show_logs() {
    local container="${1:-$LIVE_CONTAINER}"
    local lines="${2:-100}"

    if check_container_exists "$container"; then
        log_info "Showing last $lines lines of logs for $container:"
        docker logs --tail="$lines" --follow "$container"
    else
        log_error "Container $container does not exist"
        exit 1
    fi
}

# ================================
# Main Script
# ================================

case "${1:-deploy}" in
    deploy|--version)
        if [[ "${1}" == "--version" ]]; then
            VERSION="${2:-latest}"
        fi
        deploy_new_version
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-$LIVE_CONTAINER}" "${3:-100}"
        ;;
    rollback)
        log_warning "Manual rollback initiated"
        rollback
        ;;
    cleanup)
        cleanup_old_images
        ;;
    *)
        echo "Usage: $0 {deploy|--version <version>|status|logs [container] [lines]|rollback|cleanup}"
        echo ""
        echo "Commands:"
        echo "  deploy              - Deploy latest version with zero downtime"
        echo "  --version <version> - Deploy specific version"
        echo "  status              - Show deployment status"
        echo "  logs [container]    - Show container logs (default: live)"
        echo "  rollback            - Rollback to previous state"
        echo "  cleanup             - Clean up old Docker images"
        exit 1
        ;;
esac
