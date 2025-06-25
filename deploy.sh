#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# === CONFIG ===
REPO_URL="https://github.com/VolttechAfrica/flexdeskv2.git"
APP_DIR="/home/ubuntu/flexdeskBackend"
ENV_BASE64="${1:-}"

# === Logging Helper ===
log() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"
}

# === Start ===
log "🚀 Starting Flexdesk deployment..."

# Validate input
if [[ -z "$ENV_BASE64" ]]; then
  log "❌ Error: No base64 environment content provided."
  exit 1
fi

# Ensure working directory
cd /home/ubuntu

# Clone repo if missing
if [[ ! -d "$APP_DIR" ]]; then
  log "📁 Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# Reset and update repo
log "🔄 Resetting and pulling latest code..."
git reset --hard
git clean -fd
git pull origin master

# Decode and write .env
log "🔐 Writing environment variables to .env"
echo "$ENV_BASE64" | base64 -d > .env

# Install dependencies and build
log "📦 Installing dependencies..."
npm ci --legacy-peer-deps

log "🏗️ Building application..."
npm run build

# Start Datadog agent (if applicable)
if [[ -f "docker-compose.yaml" ]]; then
  log "🐳 Starting Docker services (e.g., Datadog)..."
  sudo docker-compose up -d
else
  log "⚠️ Warning: docker-compose.yaml not found, skipping Docker services."
fi

# Ensure PM2 is installed
if ! command -v pm2 &> /dev/null; then
  log "📥 Installing PM2 globally..."
  npm install -g pm2
fi

# Start or restart the app using PM2
log "🚦 Starting app with PM2..."
npm run restart || npm run start

log "✅ Deployment complete!"
