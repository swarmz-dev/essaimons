import { PUBLIC_API_BASE_URI } from '$env/static/public';
import axios, { type AxiosInstance } from 'axios';
import type { LanguageCode } from '#lib/stores/languageStore';

export const getClient = (token?: string, language?: LanguageCode): AxiosInstance => {
    return axios.create({
        baseURL: PUBLIC_API_BASE_URI,
        headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            'Accept-Language': language ?? 'en-US',
        },
    });
};
