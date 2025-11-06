#!/usr/bin/env bash
set -eo pipefail

# -------------------------
# Config
# -------------------------
ENV_FILE=".env.production"
ACTIONS_DIR=".github/actions"
CI_YAML=".github/workflows/ci.yaml"
CD_YAML=".github/workflows/cd.yaml"

# Static values
DOCKER_USERNAME="softvence"
EMAIL="softvenceomega@gmail.com"

# Colors for output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
RESET="\033[0m"

err()   { echo -e "${RED}❌ $*${RESET}" >&2; }
info()  { echo -e "${BLUE}ℹ️  $*${RESET}"; }
ok()    { echo -e "${GREEN}✅ $*${RESET}"; }

# -------------------------
# Sanity checks
# -------------------------
[[ -f "$ENV_FILE" ]] || { err "$ENV_FILE not found!"; exit 1; }
command -v node >/dev/null 2>&1 || { err "Node required!"; exit 1; }

# -------------------------
# Read package.json
# -------------------------
PACKAGE_NAME="$(node -e "try{const p=require('./package.json'); console.log(p.name||'empty_name')}catch(e){console.log('empty_name')}" 2>/dev/null || echo "empty_name")"
PACKAGE_VERSION="$(node -e "try{const p=require('./package.json'); console.log(p.version||'0.0.1')}catch(e){console.log('0.0.1')}" 2>/dev/null || echo "0.0.1")"
IMAGE_TAG="${DOCKER_USERNAME}/${PACKAGE_NAME}:${PACKAGE_VERSION}"

info "Package: $PACKAGE_NAME, Version: $PACKAGE_VERSION, Image: $IMAGE_TAG"

# -------------------------
# Update .env.production
# -------------------------
TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && { echo "$line" >> "$TMP_ENV"; continue; }
  if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    val="${BASH_REMATCH[2]}"
    case "$key" in
      DOCKER_USERNAME) echo "$key=$DOCKER_USERNAME" >> "$TMP_ENV" ;;
      PACKAGE_NAME)    echo "$key=$PACKAGE_NAME" >> "$TMP_ENV" ;;
      PACKAGE_VERSION) echo "$key=$PACKAGE_VERSION" >> "$TMP_ENV" ;;
      EMAIL)           echo "$key=$EMAIL" >> "$TMP_ENV" ;;
      IMAGE_TAG)       echo "$key=$IMAGE_TAG" >> "$TMP_ENV" ;;
      MAIL_PASS)       val="${val%\"}"; val="${val#\"}"; echo "$key=\"$val\"" >> "$TMP_ENV" ;;
      *)               echo "$line" >> "$TMP_ENV" ;;
    esac
  else
    echo "$line" >> "$TMP_ENV"
  fi
done < "$ENV_FILE"

mv "$TMP_ENV" "$ENV_FILE"
ok "Updated dynamic values in $ENV_FILE"

# -------------------------
# Collect ENV_KEYS
# -------------------------
ENV_KEYS=()
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]] && ENV_KEYS+=("${BASH_REMATCH[1]}")
done < "$ENV_FILE"

# -------------------------
# Generate composite actions
# -------------------------
generate_action() {
  local ACTION_NAME="$1"
  local ACTION_FILE="$ACTIONS_DIR/$ACTION_NAME/action.yaml"
  local INPUTS=("${!2}")
  local RUNS="$3"

  info "Generating $ACTION_FILE ..."
  mkdir -p "$(dirname "$ACTION_FILE")"

  cat > "$ACTION_FILE" <<EOF
name: "$ACTION_NAME"
description: "$ACTION_NAME composite action"
inputs:
EOF

  for key in "${INPUTS[@]}"; do
    cat >> "$ACTION_FILE" <<EOF
  $key:
    description: "$key from .env.production"
    required: true
EOF
  done

  cat >> "$ACTION_FILE" <<EOF
runs:
  using: "composite"
  steps:
$RUNS
EOF
  ok "Generated $ACTION_FILE"
}

# 1️⃣ setup-and-load-env
RUNS_SETUP_LOAD_ENV="    - name: Generate .env
      shell: bash
      run: |
        ENV_FILE=\"\$GITHUB_WORKSPACE/.env\"
        {"
for key in "${ENV_KEYS[@]}"; do
  RUNS_SETUP_LOAD_ENV+="
          echo \"$key=\${{ inputs.$key }}\""
done
RUNS_SETUP_LOAD_ENV+="
        } > \"\$ENV_FILE\"
        if [[ -n \"\${{ inputs.VPS_SSH_PRIVATE_KEY }}\" ]]; then
          echo \"\${{ inputs.VPS_SSH_PRIVATE_KEY }}\" > \"\$GITHUB_WORKSPACE/deploy_key.pem\"
          chmod 600 \"\$GITHUB_WORKSPACE/deploy_key.pem\"
          echo \"VPS_SSH_PRIVATE_KEY_FILE=\$GITHUB_WORKSPACE/deploy_key.pem\" >> \"\$ENV_FILE\"
        fi"

generate_action "setup-and-load-env" ENV_KEYS[@] "$RUNS_SETUP_LOAD_ENV"

# 2️⃣ docker-login
DOCKER_INPUTS=(DOCKER_USERNAME SE_DOCKER_PASSWORD)
RUNS_DOCKER_LOGIN="    - name: Log in to Docker
      shell: bash
      run: |
        echo \"\${{ inputs.SE_DOCKER_PASSWORD }}\" | docker login -u \"\${{ inputs.DOCKER_USERNAME }}\" --password-stdin
        echo '✅ Docker login successful'"

generate_action "docker-login" DOCKER_INPUTS[@] "$RUNS_DOCKER_LOGIN"

# 3️⃣ setup-ssh
SSH_INPUTS=(VPS_USER VPS_HOST VPS_SSH_PRIVATE_KEY)
RUNS_SETUP_SSH="    - name: Setup SSH
      shell: bash
      run: |
        mkdir -p ~/.ssh && chmod 700 ~/.ssh
        echo \"\${{ inputs.VPS_SSH_PRIVATE_KEY }}\" | tr -d '\r' > ~/.ssh/deploy_key
        chmod 600 ~/.ssh/deploy_key
        ssh-keyscan -H \${{ inputs.VPS_HOST }} >> ~/.ssh/known_hosts
        chmod 644 ~/.ssh/known_hosts
        cat > ~/.ssh/config <<EOF
        Host deploy-server
          HostName \${{ inputs.VPS_HOST }}
          User \${{ inputs.VPS_USER }}
          IdentityFile ~/.ssh/deploy_key
          StrictHostKeyChecking no
        EOF
        chmod 600 ~/.ssh/config
    - name: Test SSH
      shell: bash
      run: ssh deploy-server \"echo '🎉 SSH Connected!'\""

generate_action "setup-ssh" SSH_INPUTS[@] "$RUNS_SETUP_SSH"

# 4️⃣ verify-env
VERIFY_INPUTS=(PACKAGE_NAME PACKAGE_VERSION IMAGE_TAG)
RUNS_VERIFY_ENV="    - name: Verify environment
      shell: bash
      run: |
        echo \"Package: \${{ inputs.PACKAGE_NAME }}\"
        echo \"Version: \${{ inputs.PACKAGE_VERSION }}\"
        echo \"Image: \${{ inputs.IMAGE_TAG }}\"
        echo '✅ Environment variables accessible'"

generate_action "verify-env" VERIFY_INPUTS[@] "$RUNS_VERIFY_ENV"
# -------------------------
# Helper for exporting variables
# -------------------------
generate_ex_vars() {
  local KEYS=("$@")
  for key in "${KEYS[@]}"; do
    printf '          export %s="${{secrets.%s}}"\n' "$key" "$key"
  done
}
# -------------------------
# Helper for workflow inputs
# -------------------------
generate_workflow_inputs() {
  local FILE="$1"
  shift
  local KEYS=("$@")
  for key in "${KEYS[@]}"; do
    printf '          %s: ${{ secrets.%s }}\n' "$key" "$key" >> "$FILE"
  done
}

# -------------------------
# Generate CI workflow
# -------------------------
info "Generating $CI_YAML ..."
mkdir -p "$(dirname "$CI_YAML")"
cat > "$CI_YAML" <<'EOF'
name: CI Pipeline
on:
  push:
    branches:
      - dev
      - development
      - main
  pull_request:
    branches:
      - dev
      - development
      - main
jobs:
  lint-test:
    runs-on: ubuntu-latest
    if: (github.ref == 'refs/heads/main') && (github.ref != 'refs/heads/dev') && (github.ref != 'refs/heads/development')

    steps:
      - uses: actions/checkout@v4
      - name: Setup env
        uses: ./.github/actions/setup-and-load-env
        with:
EOF
generate_workflow_inputs "$CI_YAML" "${ENV_KEYS[@]}"
cat >> "$CI_YAML" <<'EOF'
      - uses: ./.github/actions/verify-env
        with:
          PACKAGE_NAME: ${{ secrets.PACKAGE_NAME }}
          PACKAGE_VERSION: ${{ secrets.PACKAGE_VERSION }}
          IMAGE_TAG: ${{ secrets.IMAGE_TAG }}
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/cache@v3
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-
      - run: pnpm install
      - run: pnpm ci:fix
      - run: pnpm prisma:generate
      - run: pnpm build
      - if: always()
        run: rm -f "${{ github.workspace }}/.env"
  build-and-push:
    needs: lint-test
    runs-on: ubuntu-latest
    if: (github.ref == 'refs/heads/main') && (github.ref != 'refs/heads/dev') && (github.ref != 'refs/heads/development')
    steps:
      - uses: actions/checkout@v4
      - name: Setup env
        uses: ./.github/actions/setup-and-load-env
        with:
EOF
generate_workflow_inputs "$CI_YAML" "${ENV_KEYS[@]}"
cat >> "$CI_YAML" <<'EOF'
      - uses: ./.github/actions/verify-env
        with:
          PACKAGE_NAME: ${{ secrets.PACKAGE_NAME }}
          PACKAGE_VERSION: ${{ secrets.PACKAGE_VERSION }}
          IMAGE_TAG: ${{ secrets.IMAGE_TAG }}
      - uses: ./.github/actions/docker-login
        with:
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          SE_DOCKER_PASSWORD: ${{ secrets.SE_DOCKER_PASSWORD }}
      - run: docker compose --profile prod build --no-cache
      - run: docker compose --profile prod push
      - if: always()
        run: rm -f "${{ github.workspace }}/.env"
EOF
ok "Generated $CI_YAML"

# -------------------------
# Generate CD workflow
# -------------------------
info "Generating $CD_YAML ..."
mkdir -p "$(dirname "$CD_YAML")"
cat > "$CD_YAML" <<'EOF'
name: CD Pipeline
on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types:
      - completed
jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.head_branch == 'main' }}
    steps:
      - uses: actions/checkout@v4
      - name: Setup env
        uses: ./.github/actions/setup-and-load-env
        with:
EOF
generate_workflow_inputs "$CD_YAML" "${ENV_KEYS[@]}"
cat >> "$CD_YAML" <<'EOF'
      - uses: ./.github/actions/verify-env
        with:
          PACKAGE_NAME: ${{ secrets.PACKAGE_NAME }}
          PACKAGE_VERSION: ${{ secrets.PACKAGE_VERSION }}
          IMAGE_TAG: ${{ secrets.IMAGE_TAG }}
      - uses: ./.github/actions/setup-ssh
        with:
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_PRIVATE_KEY }}
      - name: Copy Files to Server
        run: |
          echo "Creating directories..."
          ssh deploy-server "mkdir -p ~/${{ secrets.PACKAGE_NAME }}/scripts"
          echo "Copying files..."
          scp docker-compose.yaml deploy-server:~/${{ secrets.PACKAGE_NAME }}/
          scp .env deploy-server:~/${{ secrets.PACKAGE_NAME }}/
          scp Dockerfile deploy-server:~/${{ secrets.PACKAGE_NAME }}/
          scp Caddyfile deploy-server:~/${{ secrets.PACKAGE_NAME }}/
          scp -r scripts deploy-server:~/${{ secrets.PACKAGE_NAME }}/
          echo "✅ Files copied successfully"
      - name: Fix permissions on server
        run: ssh deploy-server "chmod -R +x ~/${{ secrets.PACKAGE_NAME }}/scripts/*.sh"
      - name: Prepare OS
        run: |
          ssh deploy-server bash << 'VERIFY_EOF'

          # Update packages
          sudo apt update && sudo apt upgrade -y

          # Install Docker
          sudo apt install -y docker.io

          # Enable Docker service
          sudo systemctl start docker
          sudo systemctl enable docker

          # Add ubuntu user to docker group (so no sudo needed)
          sudo usermod -aG docker $USER
          newgrp docker

          # Verify
          docker --version

          # Install Docker Compose (latest)
          sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
          sudo chmod +x /usr/local/bin/docker-compose
          docker-compose --version

          VERIFY_EOF
      - name: Deploy Application 🚀
        run: |
          ssh deploy-server bash << 'DEPLOY_EOF'

          set -euo pipefail

          cd ~/${{secrets.PACKAGE_NAME}}

          # Install Docker Compose if needed
          if [ ! -f ~/.docker/cli-plugins/docker-compose ]; then
            echo "Installing Docker Compose..."
            mkdir -p ~/.docker/cli-plugins/
            curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
            chmod +x ~/.docker/cli-plugins/docker-compose
          fi

          # Login to Docker Hub
          echo "${{secrets.SE_DOCKER_PASSWORD}}" | docker login -u "${{secrets.DOCKER_USERNAME}}" --password-stdin

          # Explicitly export required variables
EOF
# Hardcode export statements for each key in ENV_KEYS
for key in "${ENV_KEYS[@]}"; do
  echo "          export $key=\"\${{secrets.$key}}\"" >> "$CD_YAML"
done
cat >> "$CD_YAML" <<'EOF'

          # Run the deployment script
          echo "Starting zero-downtime deployment..."
          ./scripts/deploy.sh --version "$PACKAGE_VERSION"

          docker logout
          docker image prune -f

          DEPLOY_EOF

      - name: Verify Deployment
        run: |
          ssh deploy-server bash << 'VERIFY_EOF'
            cd ~/${{ secrets.PACKAGE_NAME }}
            echo "=== Running deployment status check ==="
            ./scripts/deploy.sh status
            echo "=== Testing endpoint directly ==="
            if curl -f -s --connect-timeout 5 --max-time 10 "http://${{ secrets.VPS_HOST_IP }}:${{ secrets.PORT }}/" | grep -q '"status":"ok"'; then
              echo "🎉 Endpoint health check passed! Service is responding with status: ok"
            else
              echo "❌ Endpoint health check failed!"
              exit 1
            fi
            echo "Deployment verified successfully!"
          VERIFY_EOF
      - name: Cleanup
        if: always()
        run: |
          rm -rf ~/.ssh/deploy_key* ~/.ssh/config
          rm -f .env
EOF
ok "Generated $CD_YAML"

# -------------------------
# Optional: Upload non-sensitive secrets via gh
# -------------------------
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  info "Uploading non-sensitive secrets..."
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      value="${value%\"}"; value="${value#\"}"
      echo -e "${GREEN}✨ Setting secret:${RESET} ${BLUE}${key}${RESET}"
      gh secret set "$key" --body "$value" >/dev/null 2>&1 || echo -e "${RED}❌ Failed to set $key${RESET}"
    fi
  done < "$ENV_FILE"
else
  echo -e "${YELLOW}⚠️  Skipping secrets upload (gh CLI missing or not authenticated)${RESET}"
fi

ok "🎉 All setup complete. Review the generated actions and workflows."
echo -e "${GREEN}Files created:${RESET}"
echo " - $ACTIONS_DIR/setup-and-load-env/action.yaml"
echo " - $ACTIONS_DIR/docker-login/action.yaml"
echo " - $ACTIONS_DIR/setup-ssh/action.yaml"
echo " - $ACTIONS_DIR/verify-env/action.yaml"
echo " - $CI_YAML"
echo " - $CD_YAML"