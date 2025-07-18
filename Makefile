NAME=ft_transcendence

AUTH_PATH=./backend/services/auth-service
CHAT_PATH=./backend/services/chat-service
GAME_PATH=./backend/services/game-service
USER_PATH=./backend/services/user-service
MATCH_PATH=./backend/services/matchmaking-service
MATCHMAKING_PATH=./backend/services/matchmaking-service
TOURNAMENT_PATH=./backend/services/tournament-service
STATS_PATH=./backend/services/stats-service

FRONTEND_PATH=./frontend

LOCAL_IP := $(shell ipconfig getifaddr en0 2>/dev/null || ip route get 1.1.1.1 | awk '{print $$7}' | head -1)

stop-watch:
	pkill -f nodemon || true && \
	pkill -f "node src/server.js" || true && \
	pkill -f "npm start" || true && \
	pkill -f "yarn dev" || true

# Default: запуск локально auth
.PHONY: dev
dev: auth user matchmaking game stats tournament frontend

.PHONY: ip
ip:
	@echo $(LOCAL_IP)

.PHONY: url
url:
	@echo "https://$(LOCAL_IP):5173"

# AUTH SERVICE
.PHONY: auth
auth: prisma-auth
	cd $(AUTH_PATH) && npm install -y --force
	cd $(AUTH_PATH) && npm start &

.PHONY: prisma-auth
prisma-auth:
	cd $(AUTH_PATH) && npx -y prisma migrate dev --name init
	cd $(AUTH_PATH) && npx -y prisma generate

# USER SERVICE
.PHONY: user
user: prisma-user
	cd $(USER_PATH) && npm install -y --force
	cd $(USER_PATH) && npm start &

.PHONY: prisma-user
prisma-user:
	cd $(USER_PATH) && npx -y prisma migrate dev --name init
	cd $(USER_PATH) && npx -y prisma generate

# GAME SERVICE
.PHONY: game
game:
	cd $(GAME_PATH) && npm install -y --force
	cd $(GAME_PATH) && node src/server.js &

# MATCHMAKING SERVICE
.PHONY: matchmaking
matchmaking:
	cd $(MATCHMAKING_PATH) && npm install -y --force
	cd $(MATCHMAKING_PATH) && node src/server.js &

# TOURNAMENT SERVICE
.PHONY: tournament
tournament: prisma-tournament
	cd $(TOURNAMENT_PATH) && npm install -y --force
	cd $(TOURNAMENT_PATH) && npm start &

.PHONY: prisma-tournament
prisma-tournament:
	cd $(TOURNAMENT_PATH) && npx -y prisma migrate dev --name init
	cd $(TOURNAMENT_PATH) && npx -y prisma generate

# STATS SERVICE
.PHONY: stats
stats:
	cd $(STATS_PATH) && npm install -y --force
	cd $(STATS_PATH) && node src/server.js &

# FRONTEND
.PHONY: frontend
frontend:
	cd $(FRONTEND_PATH) && yarn install
	cd $(FRONTEND_PATH) && VITE_LOCAL_IP=$(LOCAL_IP) yarn dev &

.PHONY: studio
studio:
	cd $(AUTH_PATH) && npx prisma studio

# Docker targets
.PHONY: all alld up down ps clean fclean re docker db-init docker-clean clean-cache clean-node_modules

all:
	LOCAL_IP=$(LOCAL_IP) docker-compose up --build

alld:
	LOCAL_IP=$(LOCAL_IP) docker-compose up --build -d

# Просто docker-compose up без пересборки
up:
	docker-compose up

down:
	docker-compose down

ps:
	docker-compose ps

clean-cache:
	docker builder prune -af

clean-node_modules:
	find ./backend/services -name "node_modules" -type d -prune -exec rm -rf '{}' +
	find ./frontend -name "node_modules" -type d -prune -exec rm -rf '{}' +

clean-db:
	find ./backend/services -name "*.db" -type d -prune -exec rm -rf '{}' +

clean-user-db:
	rm ./backend/services/user-service/prisma/data/profile.db
	rm ./backend/services/auth-service/prisma/data/auth.db

clean:
	docker-compose down -v

fclean: clean docker-clean
	docker system prune -af --volumes

fclean-node: clean docker-clean clean-node_modules
	docker system prune -af --volumes

re: fclean all

downup: down all

# Prisma init через Docker
db-init:
	cd $(AUTH_PATH) && npx prisma migrate dev --name init && npx prisma generate

docker-clean:
	@docker stop $(docker ps -qa) 2>/dev/null || echo "No container to stop"
	@docker rm $(docker ps -qa) 2>/dev/null || echo "No container to rm"
	@docker rmi $(docker images -qa) 2>/dev/null || echo "No image to rm"
	@docker volume rm $(docker volume ls -q) 2>/dev/null || echo "No volume to rm"
	@docker network rm $(docker network ls -q) 2>/dev/null || echo "No network to rm"

# .PHONY: check-env
# check-env:
# 	@test -f .env || (echo ".env file is missing!" && exit 1)
