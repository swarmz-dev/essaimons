import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    try {
        const response = await locals.client.get<ArrayBuffer>('api/profile/export', {
            responseType: 'arraybuffer',
        });

        const contentType = response.headers['content-type'] ?? 'application/json';
        const disposition = response.headers['content-disposition'] ?? 'attachment; filename="user-export.json"';

        return new Response(response.data, {
            status: response.status,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': disposition,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        const status: number = error?.response?.status ?? 500;
        const message: string = error?.response?.data?.error ?? (typeof error?.message === 'string' ? error.message : 'Unable to export user data');

        return new Response(JSON.stringify({ error: message }), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
            },
        });
    }
};
