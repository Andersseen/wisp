#!/bin/bash
set -e

echo "Installing Wisp..."

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo "Docker is required"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required"; exit 1; }

# Clone repo if not present
if [ ! -d "wisp" ]; then
  git clone https://github.com/your-org/wisp.git
fi

cd wisp

# Generate session secret if not set
if [ -z "$SESSION_SECRET" ]; then
  export SESSION_SECRET=$(openssl rand -hex 32)
  echo "SESSION_SECRET=$SESSION_SECRET" > .env
fi

# Build and start
docker-compose -f infra/docker/prod.yml up -d --build

echo "Wisp is running on port 80"
