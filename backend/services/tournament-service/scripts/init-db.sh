#!/bin/bash
# scripts/init-db.sh

npx prisma migrate dev --name init

npx prisma generate

echo "Database initialized successfully!"
