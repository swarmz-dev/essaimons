import type { FullConfig } from '@playwright/test';
import { startMockServer, USE_REAL_BACKEND } from './mockServer';

async function globalSetup(_config: FullConfig): Promise<void> {
    if (!USE_REAL_BACKEND) {
        await startMockServer();
    }
}

export default globalSetup;
