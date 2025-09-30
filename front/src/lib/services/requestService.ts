import { showToast } from '#lib/services/toastService';
import { navigate } from '#lib/stores/locationStore';
import type { PageDataError } from '../../app';
import { m } from '#lib/paraglide/messages';
import { browser } from '$app/environment';
import { PUBLIC_API_BASE_URI } from '$env/static/public';

const API_BASE_URL = browser ? `${PUBLIC_API_BASE_URI}/api` : '';

interface WrappedFetchOptions extends Omit<RequestInit, 'body'> {
    body?: Record<string, any> | FormData;
}

// Helper to get cookie value
function getCookie(name: string): string | null {
    if (!browser) return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

export const wrappedFetch = async (
    input: RequestInfo,
    options: WrappedFetchOptions = {},
    onSuccess?: (data: any) => void | Promise<void>,
    onError?: (data: any) => void | Promise<void>
): Promise<any | undefined> => {
    const headers = new Headers(options.headers ?? {});
    const fetchOptions: RequestInit = {
        ...options,
        body: undefined,
        headers,
        credentials: options.credentials ?? 'include',
    };

    // Add Authorization header with token from cookie
    if (browser) {
        const token = getCookie('token');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }

    if (options.body instanceof FormData) {
        fetchOptions.body = options.body;
    } else if (options.body && typeof options.body === 'object') {
        fetchOptions.body = JSON.stringify(options.body);
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
    }

    // Prepend API_BASE_URL for client-side requests
    const url = typeof input === 'string' && browser && !input.startsWith('http') ? `${API_BASE_URL}${input}` : input;

    console.log('wrappedFetch: Sending request to', url);
    const response: Response = await fetch(url, fetchOptions);
    console.log('wrappedFetch: Received response', response.status, response.statusText);

    if (response.status === 401) {
        try {
            await fetch('/logout', { method: 'POST', credentials: 'include' });
        } catch (error: any) {
            console.error(error);
        }
        await navigate('/login');
    }

    try {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Request failed:', response.status, errorData);
            await onError?.(errorData);
            return { isSuccess: false, ...errorData };
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
        console.error('Request error:', error);
        return { isSuccess: false, error: error?.message || 'Unknown error' };
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
