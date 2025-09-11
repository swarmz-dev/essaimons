import { showToast } from '#lib/services/toastService';
import { navigate } from '#lib/stores/locationStore';
import type { PageDataError } from '../../app';
import { m } from '#lib/paraglide/messages';

interface WrappedFetchOptions extends Omit<RequestInit, 'body'> {
    body?: Record<string, any> | FormData;
}

export const wrappedFetch = async (
    input: RequestInfo,
    options: WrappedFetchOptions = {},
    onSuccess?: (data: any) => void | Promise<void>,
    onError?: (data: any) => void | Promise<void>
): Promise<any | undefined> => {
    const fetchOptions: RequestInit = {
        ...options,
        body: undefined,
        headers: options.headers ? { ...options.headers } : {},
    };

    if (options.body instanceof FormData) {
        fetchOptions.body = options.body;
    } else if (options.body && typeof options.body === 'object') {
        fetchOptions.body = JSON.stringify(options.body);
    }

    const response: Response = await fetch(input, fetchOptions);

    if (response.status === 401) {
        try {
            await fetch(new URL('/logout'), { method: 'POST' });
        } catch (error: any) {
            console.error(error);
        }
        await navigate('/login');
    }

    try {
        if (!response.ok) {
            throw response;
        }

        const data: any = await response.json();

        if (data.message) {
            showToast(data.message, data.isSuccess ? 'success' : 'error');
        }

        if (data.isSuccess) {
            await onSuccess?.(data);
        } else {
            await onError?.(data);
        }

        return data;
    } catch (error: any) {
        return undefined;
    }
};

export const extractFormErrors = (data: any): PageDataError[] => {
    const errors: PageDataError[] = [];

    // Adonis validator
    if (data?.errors) {
        for (const error of data.errors) {
            errors.push({
                type: 'error',
                message: error.message,
            });
        }
    }

    // Adonis error
    if (data?.error) {
        errors.push({
            type: 'error',
            message: data.error,
        });
    }

    if (!errors.length) {
        errors.push({
            type: 'error',
            message: data?.error ?? m['common.error.default-message'](),
        });
    }

    return errors;
};

export const extractFormData = (formData: FormData): Record<string, any> => {
    const data: Record<string, any> = {};

    formData.forEach((value: FormDataEntryValue, key: string): void => {
        if (value instanceof File) {
            if (value.size === 0 && value.name === '') {
                return;
            }

            data[key] = {
                name: value.name,
                type: value.type,
                size: value.size,
            };
        } else {
            const str: string = value.toString().trim();

            if (str === 'true') {
                data[key] = true;
            } else if (str === 'false') {
                data[key] = false;
            } else if (!isNaN(Number(str)) && str !== '') {
                data[key] = Number(str);
            } else {
                data[key] = str;
            }
        }
    });

    return data;
};
