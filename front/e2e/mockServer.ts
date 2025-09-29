import { createServer, request, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { URL } from 'url';

export const USE_REAL_BACKEND = process.env.PLAYWRIGHT_USE_REAL_BACKEND === 'true';
const MOCK_API_PORT = Number.parseInt(process.env.PLAYWRIGHT_MOCK_API_PORT ?? '3337', 10);

let localServer: Server | null = null;
let serverStarted = false;

const json = (res: ServerResponse, status: number, payload: unknown): void => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
};

const MOCK_ORGANIZATION = {
    fallbackLocale: 'fr',
    locales: [{ code: 'fr', label: 'Français', isDefault: true }],
    name: { fr: 'Essaimons (mock)' },
    description: { fr: 'Instance Playwright mockée' },
    sourceCodeUrl: { fr: 'https://git.example/mock' },
    copyright: { fr: 'CC-BY-SA' },
    logo: null,
    propositionDefaults: {
        clarificationOffsetDays: 7,
        improvementOffsetDays: 15,
        voteOffsetDays: 7,
        mandateOffsetDays: 15,
        evaluationOffsetDays: 30,
    },
    permissions: {
        perStatus: {
            draft: {
                initiator: {
                    edit_proposition: true,
                    publish: true,
                    manage_files: true,
                },
            },
            clarify: {
                initiator: {
                    edit_proposition: true,
                    manage_comments: true,
                },
                contributor: {
                    comment_clarification: true,
                },
            },
            amend: {
                initiator: {
                    edit_proposition: true,
                    manage_events: true,
                    manage_comments: true,
                },
                contributor: {
                    comment_amendment: true,
                },
            },
            vote: {
                initiator: {
                    configure_vote: true,
                    manage_comments: true,
                },
                contributor: {
                    participate_vote: true,
                },
            },
            mandate: {
                initiator: {
                    manage_mandates: true,
                    manage_comments: true,
                },
                contributor: {
                    participate_vote: true,
                    comment_mandate: true,
                },
                mandated: {
                    candidate: true,
                    upload_deliverable: true,
                },
            },
            evaluate: {
                initiator: {
                    manage_deliverables: true,
                    manage_comments: true,
                },
                mandated: {
                    upload_deliverable: true,
                    comment_evaluation: true,
                },
                contributor: {
                    evaluate_deliverable: true,
                    comment_evaluation: true,
                },
            },
        },
    },
    permissionCatalog: {
        perStatus: {},
    },
    workflowAutomation: {
        nonConformityThreshold: 60,
        evaluationAutoShiftDays: 14,
        revocationAutoTriggerDelayDays: 30,
        deliverableNamingPattern: 'DELIV-{proposition}-{date}',
    },
};

const MOCK_CATEGORIES = [
    { id: '1', name: 'Démocratie liquide' },
    { id: '2', name: 'Mobilisation citoyenne' },
];

const MOCK_USERS = [
    { id: 'user-1', username: 'playwright-user' },
    { id: 'user-2', username: 'citoyen.test' },
];

const MOCK_PROPOSITIONS = [
    {
        id: 'prop-1',
        title: 'Proposition mock',
        summary: 'Résumé mocké',
        categories: [MOCK_CATEGORIES[0]],
        status: 'clarify',
        visibility: 'public',
        statusStartedAt: new Date().toISOString(),
        clarificationDeadline: '2030-01-10',
        improvementDeadline: '2030-01-20',
        voteDeadline: '2030-02-01',
        mandateDeadline: '2030-03-01',
        evaluationDeadline: '2030-04-01',
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creator: { id: 'user-1', username: 'playwright-user' },
        visual: null,
    },
];

const handlePostAuth = (req: IncomingMessage, res: ServerResponse): void => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
        const now = new Date().toISOString();
        json(res, 200, {
            message: 'Connexion réussie (mock)',
            user: {
                id: 'mock-user',
                username: 'playwright-user',
                email: 'mock@example.com',
                role: 'user',
                enabled: true,
                acceptedTermsAndConditions: true,
                profilePicture: null,
                updatedAt: now,
                createdAt: now,
            },
            token: {
                token: 'mock-token',
            },
        });
    });
};

const handleRequest = (req: IncomingMessage, res: ServerResponse): void => {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${MOCK_API_PORT}`);
    const { pathname } = url;

    if (method === 'GET' && pathname === '/__mock__/ping') {
        json(res, 200, { ok: true });
        return;
    }

    if (method === 'GET' && pathname === '/api/settings/organization') {
        json(res, 200, { settings: MOCK_ORGANIZATION });
        return;
    }

    if (method === 'GET' && pathname === '/api/propositions/bootstrap') {
        json(res, 200, {
            categories: MOCK_CATEGORIES,
            propositions: MOCK_PROPOSITIONS.map((item) => ({ id: item.id, title: item.title })),
            users: MOCK_USERS,
        });
        return;
    }

    if (method === 'GET' && pathname === '/api/propositions') {
        json(res, 200, {
            propositions: MOCK_PROPOSITIONS,
            firstPage: 1,
            lastPage: 1,
            currentPage: 1,
            limit: 12,
            total: MOCK_PROPOSITIONS.length,
        });
        return;
    }

    if (method === 'GET' && pathname === '/api') {
        json(res, 200, { isSessionTokenValid: true });
        return;
    }

    if (method === 'POST' && pathname === '/api/auth') {
        handlePostAuth(req, res);
        return;
    }

    if (method === 'POST' && pathname === '/api/propositions') {
        req.resume();
        req.once('end', () => {
            json(res, 201, {
                message: 'Proposition créée avec succès (mock)',
                proposition: {
                    id: `mock-${Date.now()}`,
                    title: 'Proposition mock',
                },
            });
        });
        return;
    }

    json(res, 404, { message: 'Not found (mock API)' });
};

export async function acquireMockServer(): Promise<() => Promise<void>> {
    if (USE_REAL_BACKEND) {
        return async () => {};
    }

    await startMockServer();

    return async () => {};
}

const isServerRunning = async (): Promise<boolean> => {
    return await new Promise<boolean>((resolve) => {
        const req = request(
            {
                hostname: '127.0.0.1',
                port: MOCK_API_PORT,
                path: '/__mock__/ping',
                method: 'GET',
                timeout: 500,
            },
            (res) => {
                resolve(res.statusCode === 200);
            }
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.end();
    });
};

export async function startMockServer(): Promise<void> {
    if (USE_REAL_BACKEND || serverStarted) {
        return;
    }

    if (await isServerRunning()) {
        serverStarted = true;
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const server = createServer(handleRequest);
        server.once('listening', () => {
            console.log(`[mock-api] listening on port ${MOCK_API_PORT}`);
            localServer = server;
            serverStarted = true;
            resolve();
        });
        server.once('error', async (error) => {
            if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
                server.removeAllListeners();
                server.close();
                if (await isServerRunning()) {
                    serverStarted = true;
                    resolve();
                    return;
                }
            }
            reject(error);
        });
        server.listen(MOCK_API_PORT, '0.0.0.0');
    });
}

export async function stopMockServer(): Promise<void> {
    if (!localServer) {
        return;
    }
    await new Promise<void>((resolve, reject) => {
        localServer?.close((error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
    localServer = null;
    serverStarted = false;
}
