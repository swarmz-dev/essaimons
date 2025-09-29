import type { FullConfig } from '@playwright/test';
import { stopMockServer, USE_REAL_BACKEND } from './mockServer';

async function globalTeardown(_config: FullConfig): Promise<void> {
    if (!USE_REAL_BACKEND) {
        await stopMockServer();
    }
}

export default globalTeardown;
