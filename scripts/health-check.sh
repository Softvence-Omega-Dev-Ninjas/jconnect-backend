#!/usr/bin/env bash
set -euo pipefail

# ================================
# Health Check Script
# ================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${RESET} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${RESET} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${RESET} $*"; }
log_error() { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# Load environment
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
else
    log_error ".env file not found!"
    exit 1
fi

PACKAGE_NAME="${PACKAGE_NAME:-app}"
HEALTH_ENDPOINT="${1:-http://localhost:${PORT}/api/health}"
MAX_RETRIES="${2:-5}"
RETRY_INTERVAL="${3:-2}"

check_health() {
    local endpoint=$1
    local max_retries=$2
    local retry_interval=$3
    local attempt=1

    log_info "Checking health endpoint: $endpoint"

    while [ $attempt -le $max_retries ]; do
        log_info "Attempt $attempt/$max_retries..."

        if response=$(curl -sf --connect-timeout 5 --max-time 10 "$endpoint" 2>&1); then
            if echo "$response" | grep -q '"status":"ok"'; then
                log_success "Health check PASSED ✓"
                log_info "Response: $response"
                return 0
            else
                log_warning "Endpoint responded but status not 'ok'"
                log_info "Response: $response"
            fi
        else
            log_warning "Health check failed (attempt $attempt/$max_retries)"
        fi

        if [ $attempt -lt $max_retries ]; then
            sleep $retry_interval
        fi
        ((attempt++))
    done

    log_error "Health check FAILED after $max_retries attempts ✗"
    return 1
}

check_docker_health() {
    log_info "Checking Docker container health..."

    local containers=("${PACKAGE_NAME}_live" "${PACKAGE_NAME}_candidate")

    for container in "${containers[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")

            case $health_status in
                healthy)
                    log_success "$container: HEALTHY ✓"
                    ;;
                unhealthy)
                    log_error "$container: UNHEALTHY ✗"
                    log_info "Last 20 log lines:"
                    docker logs --tail=20 "$container"
                    ;;
                starting)
                    log_warning "$container: STARTING ⏳"
                    ;;
                no-healthcheck)
                    log_warning "$container: NO HEALTHCHECK CONFIGURED ⚠"
                    ;;
                *)
                    log_info "$container: $health_status"
                    ;;
            esac
        else
            log_info "$container: NOT RUNNING"
        fi
    done
}

# Main execution
log_info "==================================="
log_info "Health Check Report"
log_info "==================================="
echo ""

check_docker_health
echo ""

if check_health "$HEALTH_ENDPOINT" "$MAX_RETRIES" "$RETRY_INTERVAL"; then
    exit 0
else
    exit 1
fi
