import env from '#start/env';
import { defineConfig, services } from '@adonisjs/ally';

const allyConfig = defineConfig({
    discord: services.discord({
        clientId: env.get('DISCORD_CLIENT_ID'),
        clientSecret: env.get('DISCORD_CLIENT_SECRET'),
        callbackUrl: `${env.get('API_URI')}/api/auth/discord/callback`,
    }),
    github: services.github({
        clientId: env.get('GITHUB_CLIENT_ID'),
        clientSecret: env.get('GITHUB_CLIENT_SECRET'),
        callbackUrl: `${env.get('API_URI')}/api/auth/github/callback`,
    }),
    google: services.google({
        clientId: env.get('GOOGLE_CLIENT_ID'),
        clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
        callbackUrl: `${env.get('API_URI')}/api/auth/google/callback`,
    }),
});

export default allyConfig;

declare module '@adonisjs/ally/types' {
    interface SocialProviders extends InferSocialProviders<typeof allyConfig> {}
}
