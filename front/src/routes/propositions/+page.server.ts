import type { PaginatedPropositions, SerializedPropositionCategory } from 'backend/types';
import type { PageServerLoad } from './$types';

type PropositionsListResponse = PaginatedPropositions & {
    filters: {
        categories: SerializedPropositionCategory[];
    };
};

type ActiveFilters = {
    search: string;
    categories: string[];
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
    const rawSearch: string = url.searchParams.get('search') ?? '';
    const search: string = rawSearch.trim();

    const rawPage: number = Number(url.searchParams.get('page') ?? '1');
    const rawLimit: number = Number(url.searchParams.get('limit') ?? '12');
    const sanitizedPage: number = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const sanitizedLimit: number = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 12;

    const viewParam = url.searchParams.get('view');
    const view: 'card' | 'table' = viewParam === 'table' ? 'table' : 'card';

    const categoryParams: string[] = url.searchParams.getAll('categories');
    const categoryIds: string[] = parseIdentifierArray(categoryParams);

    const params: Record<string, string | number> = {
        page: sanitizedPage,
        limit: sanitizedLimit,
    };

    if (search.length) {
        params.search = search;
    }

    if (categoryIds.length) {
        params.categories = categoryIds.join(',');
    }

    const buildActiveFilters = (response?: PropositionsListResponse): ActiveFilters => ({
        search,
        categories: [...categoryIds],
        view,
        limit: response?.limit ?? sanitizedLimit,
        page: response?.currentPage ?? sanitizedPage,
    });

    try {
        const response = await locals.client.get<PropositionsListResponse>('api/propositions', { params });
        const data = response.data;

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
            },
            activeFilters: buildActiveFilters(),
        } satisfies PropositionsListResponse & { activeFilters: ActiveFilters };
    }
};
