import type { PaginatedPropositions, SerializedPropositionCategory, PropositionStatusEnum } from 'backend/types';
import type { PageServerLoad } from './$types';

type PropositionsListResponse = PaginatedPropositions & {
    filters: {
        categories: SerializedPropositionCategory[];
        statuses: PropositionStatusEnum[];
    };
};

type ActiveFilters = {
    query: string;
    categories: string[];
    statuses: string[];
    view: 'card' | 'table';
    limit: number;
    page: number;
};

const parseIdentifierArray = (values: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const trimmed = value?.toString().trim();
        if (!trimmed || seen.has(trimmed)) {
            continue;
        }
        seen.add(trimmed);
        result.push(trimmed);
    }

    return result;
};

export const load: PageServerLoad = async ({ url, locals }) => {
    const rawQuery: string = url.searchParams.get('query') ?? '';
    const query: string = rawQuery.trim();

    const rawPage: number = Number(url.searchParams.get('page') ?? '1');
    const rawLimit: number = Number(url.searchParams.get('limit') ?? '12');
    const sanitizedPage: number = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const sanitizedLimit: number = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 12;

    const viewParam: string | null = url.searchParams.get('view');
    const view: 'card' | 'table' = viewParam === 'table' ? 'table' : 'card';

    const categoryParams: string[] = url.searchParams.getAll('categories');
    const categoryIds: string[] = parseIdentifierArray(categoryParams);
    const statusParams: string[] = url.searchParams.getAll('statuses');
    const statusFilters: string[] = parseIdentifierArray(statusParams);

    const params: Record<string, string | number | string[]> = {
        page: sanitizedPage,
        limit: sanitizedLimit,
    };

    if (query.length) {
        params.search = query;
    }

    if (categoryIds.length) {
        params.categories = categoryIds.join(',');
    }

    if (statusFilters.length) {
        params.statuses = statusFilters;
    }

    const buildActiveFilters = (response?: PropositionsListResponse): ActiveFilters => ({
        query,
        categories: [...categoryIds],
        statuses: [...statusFilters],
        view,
        limit: response?.limit ?? sanitizedLimit,
        page: response?.currentPage ?? sanitizedPage,
    });

    try {
        const { data } = await locals.client.get<PropositionsListResponse>('api/propositions', { params });

        return {
            ...data,
            activeFilters: buildActiveFilters(data),
        };
    } catch (error: any) {
        console.error('Failed to load propositions list', error?.response?.data ?? error);

        return {
            propositions: [],
            firstPage: 1,
            lastPage: 1,
            limit: sanitizedLimit,
            total: 0,
            currentPage: 1,
            filters: {
                categories: [],
                statuses: Object.values(PropositionStatusEnum),
            },
            activeFilters: buildActiveFilters(),
        } satisfies PropositionsListResponse & { activeFilters: ActiveFilters };
    }
};
