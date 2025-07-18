#!/bin/sh
set -e

echo "⚙️ Creating .env files..."

# Frontend
mkdir -p ./frontend
cat <<EOF > ./frontend/.env
FRONTEND_PORT=5173
AUTH_BACKEND_PORT=3001
VITE_PORT=5173
VITE_GAMEENGINE_PORT=4004

AUTH_BACKEND_URL=https://auth-service:3001
BACKEND_URL=https://user-service:3002
PROFILE_URL=https://user-service:3002
STATS_URL=https://stats-service:4100
TOURNAMENT_URL=https://tournament-service:3004
MATCHMAKING_URL=https://matchmaking-service:3003
AUTH_URL=https://auth-service:3001
GAME_SERVICE_PATH=wss://game-service:4004
EOF
echo "✅ Created frontend/.env"

# Auth Service
mkdir -p ./backend/services/auth-service
cat <<EOF > ./backend/services/auth-service/.env
DATABASE_URL=file:./data/auth.db
JWT_SECRET=supersecret
PORT=3001
NODE_ENV=development
USER_SERVICE_URL=https://user-service:3002
DATABASE_PATH=/app/prisma/data/auth.db
EMAIL_ADDR=""
EMAIL_PASSWD=""
EOF
echo "✅ Created backend/services/auth-service/.env"

# Game Service
mkdir -p ./backend/services/game-service
cat <<EOF > ./backend/services/game-service/.env
SERVICE_PORT=4004
TOURNAMENT_URL=https://tournament-service:3004/match-result
STATS_URL=https://stats-service:4100/match-result
MATCHMAKING_URL=https://matchmaking-service:3003/match-result
JWT_SECRET=supersecret
USE_VAULT=false
EOF
echo "✅ Created backend/services/game-service/.env"

# Matchmaking Service
mkdir -p ./backend/services/matchmaking-service
cat <<EOF > ./backend/services/matchmaking-service/.env
JWT_SECRET=supersecret
USER_PROFILE_SERVICE_URL=https://user-service:3002
GAME_ENGINE_URL=https://game-service:4004
EOF
echo "✅ Created backend/services/matchmaking-service/.env"

# Stats Service
mkdir -p ./backend/services/stats-service
cat <<EOF > ./backend/services/stats-service/.env
SERVICE_PORT=4100
USER_SERVICE_URL=https://user-service:3002
EOF
echo "✅ Created backend/services/stats-service/.env"

# Tournament Service
mkdir -p ./backend/services/tournament-service
cat <<EOF > ./backend/services/tournament-service/.env
DATABASE_URL=file:./data/tournament.db
JWT_SECRET=supersecret
PORT=3004
NODE_ENV=development
USER_PROFILE_SERVICE_URL=https://user-service:3002
GAME_ENGINE_SERVICE_URL=https://game-service:4004
STATS_SERVICE_URL=https://stats-service:4100
EOF
echo "✅ Created backend/services/tournament-service/.env"

# User Service
mkdir -p ./backend/services/user-service
cat <<EOF > ./backend/services/user-service/.env
DATABASE_URL=file:./data/profile.db
JWT_SECRET=supersecret
USE_VAULT=false
PORT=3002
NODE_ENV=development
AUTH_SERVICE_URL=https://auth-service:3001
DATABASE_PATH=/app/prisma/data/profile.db
EOF
echo "✅ Created backend/services/user-service/.env"

echo "🎉 All .env files created successfully!"