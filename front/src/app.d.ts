// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
export type PageDataError = {
    type: 'success' | 'error';
    message: string;
};

export type FormError = {
    data: Record<string, any>;
    errors: PageDataError[];
};

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            client: AxiosInstance;
        }
        interface PageData {
            flash?: PageDataError;
        }
        // interface PageState {}
        // interface Platform {}
    }
}

export {};
