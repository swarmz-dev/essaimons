import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import * as path from 'node:path';

const config = {
    preprocess: vitePreprocess(),
    kit: {
        env: {
            publicPrefix: 'PUBLIC_',
            privatePrefix: 'PRIVATE_',
        },
        adapter: adapter(),
        alias: {
            '#menu': './src/menu',
            '#components': './src/components',
            '#icons': './src/icons',
            '#lib': './src/lib',
            'backend/types': path.resolve('back/app/types/index.ts'),
        },
    },
};

export default config;
