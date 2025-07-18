import { defineConfig, loadEnv } from 'vite';
// @ts-ignore
import tailwindcss from '@tailwindcss/vite';
// @ts-ignore
import fs from 'fs';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    // Load env variables - Vite requires VITE_ prefix for client-side exposure
    const env = loadEnv(mode, process.cwd(), '');
    return {
        server: {
            host: '0.0.0.0',
            port: parseInt(env.VITE_PORT),
            https: {
                key: fs.readFileSync('../certs/key.pem'),
                cert: fs.readFileSync('../certs/cert.pem')
            },
            proxy: {
                '/game': {
                    target: env.GAME_SERVICE_PATH || 'wss://localhost:4004',
                    ws: true,
                    changeOrigin: true,
                    secure: false, // 👈 allow self-signed certs (for dev only!... or not)
                },
                '/api': {
                    target: env.BACKEND_URL || 'https://localhost:3002',
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
                '/auth': {
                    target: env.AUTH_URL || 'https://localhost:3001',
                    changeOrigin: true,
                    secure: false
                },
                '/users': {
                    target: env.PROFILE_URL || 'https://localhost:3002',
                    changeOrigin: true,
                    secure: false
                },
                '/stats-api': {
                    target: env.STATS_URL || 'https://localhost:4100',
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/stats-api/, ''),
                },
                '/go': {
                    target: env.MATCHMAKING_URL || 'https://localhost:3003',
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/go/, ''),
                },
                '/tournament-api': {
                    target: env.TOURNAMENT_URL || 'https://localhost:3004',
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/tournament-api/, ''),
                },
            }
        },
        plugins: [
            tailwindcss(),
        ],
        assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
        build: {
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html')
                },
                output: {
                    assetFileNames: 'assets/[name].[ext]',
                    manualChunks: undefined,
                },
            },
        },
    };
});