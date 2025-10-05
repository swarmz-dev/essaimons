import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type ViteDevServer } from 'vite';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import type { Plugin } from 'vite';

dotenv.config({ path: './.env' });

const largeBodyPlugin = (): Plugin => ({
    name: 'vite:large-body',
    configureServer(server: ViteDevServer): void {
        const limit = '50mb';
        server.middlewares.use(bodyParser.json({ limit }));
        server.middlewares.use(bodyParser.urlencoded({ limit, extended: true }));
    },
});

export default defineConfig({
    server: {
        host: true,
        port: Number(process.env.PORT),
        allowedHosts: ['localhost', 'app.essaimons.fr'],
        fs: {
            allow: ['.', '../back/app/types'],
        },
    },
    preview: {
        host: true,
        port: Number(process.env.PORT),
    },
    plugins: [
        tailwindcss(),
        sveltekit(),
        largeBodyPlugin(),
        paraglideVitePlugin({
            project: './project.inlang',
            outdir: './src/lib/paraglide',
        }),
    ],
    resolve: {
        alias: {
            'backend/.adonisjs/api': '../back/.adonisjs/api',
        },
    },
    test: {
        projects: [
            {
                extends: './vite.config.ts',
                plugins: [svelteTesting()],
                test: {
                    name: 'client',
                    environment: 'jsdom',
                    clearMocks: true,
                    include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
                    exclude: ['src/lib/server/**'],
                    setupFiles: ['./vitest-setup-client.ts'],
                },
            },
            {
                extends: './vite.config.ts',
                test: {
                    name: 'server',
                    environment: 'node',
                    include: ['src/**/*.{test,spec}.{js,ts}'],
                    exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
                },
            },
        ],
    },
});
