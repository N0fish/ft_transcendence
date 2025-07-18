#!/bin/bash
echo "Creating debug container..."
docker run --rm -it --entrypoint sh ft_transcendence_matchmaking-service -c "
echo '--- Directory structure ---'
find / -name 'server.js' 2>/dev/null
echo
echo '--- Current directory ---'
pwd
ls -la
echo
echo '--- Content of /app ---'
ls -la /app
echo
echo '--- Content of /app/src (if exists) ---'
ls -la /app/src 2>/dev/null || echo 'Directory does not exist'
echo
echo '--- Package.json content ---'
cat /app/package.json
echo
echo '--- Node modules ---'
ls -la /app/node_modules | head -n 20
"
