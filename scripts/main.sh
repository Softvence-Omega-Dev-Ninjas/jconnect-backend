#!/usr/bin/env bash
set -euo pipefail

# Get the absolute path of the current script (main.sh)
export SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "$SCRIPT_DIR"

source "${SCRIPT_DIR}/utils/logger.sh"


echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════╗
║   NestJS Zero-Downtime Deployment Setup      ║
║   🚀 Initializing your project...            ║
╚══════════════════════════════════════════════╝
EOF
echo -e "${RESET}"

# Check prerequisites
source "${SCRIPT_DIR}/checks/prerequires.sh"
prerequirements

# Check if package.json exists
if [[ ! -f "package.json" ]]; then
    log_error "package.json not found! Are you in a NestJS project?"
    exit 1
fi

# Extract metadata
source "${SCRIPT_DIR}/utils/extract-metadata.sh"
extract_metadata


# Collect user input - this function will export too many thing like
# DOCKER_USERNAME SE_DOCKER_PASSWORD EMAIL VPS_HOST VPS_USER VPS_SSH_PRIVATE_KEY SE_GIT_TOKEN PORT DOMAIN
source "${SCRIPT_DIR}/core/stdio.sh"
take_input

# Generate .env.production
log_info "Creating .env.production..."
source "${SCRIPT_DIR}/generator/generate-env.sh"
create_env
log_success "✅ Successfully generated: .env.production"

# # extract all github information (works fine as we expect)
# source "${SCRIPT_DIR}/utils/extract-repository.sh"
# extract_github_repo_info

# # Build team JSON dynamically
# if [[ -n "$contributors" ]]; then
#     source "${SCRIPT_DIR}/parsers/contributor-parser.sh"

#     # Iterate line by line
#     while IFS= read -r contributor; do
#         contribruits_json "$contributor"
#     done <<< "$contributors"
# fi

# # Convert escaped newlines into actual ones
# members_json=$(echo -e "$members_json")
# export members_json

# # Now generate health check controller
# export members_json
# source "${SCRIPT_DIR}/generator/generate-health-controller.sh"

if [[ -n "$DOMAIN" ]]; then
    log_info "Creating Caddyfile for domain: $DOMAIN"
    source "${SCRIPT_DIR}/generator/generate-caddyfile.sh"
    generate_caddyfile "$DOMAIN"
    log_success "Created Caddyfile"
fi


# Add to .gitignore
log_info "Updating .gitignore..."
cat >> .gitignore <<EOF

# Deployment files
.env.production
.env
*.pem
*.key
*.secret
deploy_key*
backups/
logs/
prisma/generator/
EOF
log_success ".gitignore updated"

# Generate GitHub Actions
log_info "Generating GitHub Actions & workflows..."
source "${SCRIPT_DIR}/generator/generate-ci.sh"
log_success "GitHub Actions generated"

# Generate Dockerfile
read -p "Is Dockerfile setup required? (y/n, default: y): " IS_DOCKER
IS_DOCKER="${IS_DOCKER:-y}"
if [[ "$IS_DOCKER" == "y" || "$IS_DOCKER" == "Y" ]]; then
    log_info "Generate Dockerfile"
    GENERATE_DOCKERFILE="scripts/generate-dockerfile.sh"

    if [[ -f $GENERATE_DOCKERFILE ]]; then
        log_info "Generating Dockerfile..."
        bash ./$GENERATE_DOCKERFILE
        log_success "✅ Successfully generated: Dockerfile"
    else
        log_warning "$GENERATE_DOCKERFILE not found. Please Copy it from the template."
    fi

    # Asking for generating .dockerignore file
    read -p "Do you want to generate .dockerignore file? (y/n, default: y): " IS_GENERATE_DOCKER_IGNORE
    IS_GENERATE_DOCKER_IGNORE="${IS_GENERATE_DOCKER_IGNORE:-y}"
    if [[ "$IS_GENERATE_DOCKER_IGNORE" == "y" || "${IS_GENERATE_DOCKER_IGNORE}" == "Y" ]]; then
        log_info "Generating/updating .dockerignore file"
        GENERATE_DOCKER_IGNORE="scripts/generate-dockerignore.sh"
        if [[ -f $GENERATE_DOCKER_IGNORE ]]; then
            log_info "Generating .dockerignore file"
            bash ./$GENERATE_DOCKER_IGNORE
        else
            log_warning "$GENERATE_DOCKER_IGNORE not found. Please Copy it from the template."
        fi
    fi

else
    log_warning "Docker setup not required. Skipping Dockerfile generation."
fi

# Generate docker-compose.yaml file
read -p "Is docker-compose.yaml setup required? (y/n, default: y): " IS_DOCKER_COMPOSE
IS_DOCKER_COMPOSE="${IS_DOCKER_COMPOSE:-y}"
if [[ "$IS_DOCKER_COMPOSE" == "y" || "$IS_DOCKER_COMPOSE" == "Y" ]]; then
    log_info "Generate docker-compose file"
    GENERATE_DOCKER_COMPSOE="scripts/generate-dockerfile.sh"

    if [[ -f $GENERATE_DOCKER_COMPSOE ]]; then
        log_info "Generating docker-compose..."
        bash ./$GENERATE_DOCKER_COMPSOE
        log_success "✅ Successfully generated: $GENERATE_DOCKER_COMPSOE"
    else
        log_warning "$GENERATE_DOCKER_COMPSOE not found. Please Copy it from the template."
    fi
else
    log_warning "Docker compose setup not required. Skipping docker-compsoe generation."
fi

# Create health check endpoint reminder with members_json
export members_json
log_success "✅ Successfully generated: src/health.controller.ts"
