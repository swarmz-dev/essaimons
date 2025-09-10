interface ImportMetaEnv {
    readonly PUBLIC_PORT: number; // injected by Docker
    readonly PUBLIC_FRONT_URI: string; // injected by Docker
    readonly PUBLIC_API_BASE_URI: string; // injected by Docker
    readonly PUBLIC_API_REAL_URI: string; // injected by Docker
    readonly PUBLIC_GITHUB_REPOSITORY: string; // injected by Docker
    readonly PUBLIC_TWITTER_HANDLE: string;
    readonly PUBLIC_DEFAULT_IMAGE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
