#!/usr/bin/env bash
set -euo pipefail


create_env(){
cat > .env.production <<EOF
# ======= Auto-generated - Don't touch ======== #
DOCKER_USERNAME=$DOCKER_USERNAME
PACKAGE_NAME=$PACKAGE_NAME
PACKAGE_VERSION=$PACKAGE_VERSION
EMAIL=$EMAIL
IMAGE_TAG=$DOCKER_USERNAME/$PACKAGE_NAME:$PACKAGE_VERSION
SE_DOCKER_PASSWORD=$SE_DOCKER_PASSWORD
SE_GIT_TOKEN="SE_GIT_TOKEN"
VPS_HOST="$VPS_HOST"
VPS_USER="$VPS_USER"
VPS_HOST_IP="$VPS_HOST"
CADDY_CONTAINER_NAME="caddy_container"
# ======= Don't touch ======== #

# ======= Application Configuration Start from here... ======== #
POSTGRES_USER=softvence_postgres_user
POSTGRES_PASSWORD=softvence_postgres_password
POSTGRES_DB=softvence_postgres_db

DATABASE_URL="postgresql://postgres:postgres@db:5432/mydb?connection_limit=10&pool_timeout=30&pgbouncer=true"

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL="redis://redis:6379"

SALT_ROUND=10
PORT=$PORT

# JWT Configuration
ACCESS_TOKEN_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)
ACCESS_TOKEN_EXPIREIN='30d'
REFRESH_TOKEN_EXPIREIN='30d'

# Email Configuration (update with your SMTP details)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS="your-app-password"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMPT_FROM=$PACKAGE_NAME

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PHONE=+1234567890
ADMIN_PASSWORD=$(openssl rand -base64 16)

# Client URLs
CLIENT_URL=http://localhost:3000
SERVER_URL=${SERVER_URL:-http://localhost:$PORT}

# Add your additional environment variables here
# STRIPE_SECRET_KEY=sk_test_
# TWILIO_ACCOUNT_SID=here..
# TWILIO_AUTH_TOKEN=here..
EOF
}
