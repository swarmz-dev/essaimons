import { HealthChecks, DiskSpaceCheck, MemoryHeapCheck } from '@adonisjs/core/health';

export const healthChecks: HealthChecks = new HealthChecks().register([new DiskSpaceCheck(), new MemoryHeapCheck()]);
