<script lang="ts">
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { m } from '#lib/paraglide/messages';
    import FormBackground from '#components/background/FormBackground.svelte';
    import { Button } from '#lib/components/ui/button';
    import { SendHorizontal } from '@lucide/svelte';
    import { Card, CardHeader, CardContent, CardFooter } from '#lib/components/ui/card/index';
    import { page } from '$app/state';
    import type { FormError, PageDataError } from '../app';
    import { showToast } from '#lib/services/toastService';
    import { cn } from '#lib/utils';
    import type { Snippet } from 'svelte';

    type Props = {
        children: Snippet;
        header?: Snippet;
        links?: Snippet;
        footer?: Snippet;
        submitContent?: Snippet;
        onError?: (data?: any) => void;
        onBeforeSubmit?: (formData: FormData) => void;
        isValid?: boolean;
        submittable?: boolean;
        hasBackground?: boolean;
        class?: string;
    };

    let { children, header, links, footer, onError, onBeforeSubmit, isValid = false, submittable = true, hasBackground = true, submitContent, class: className }: Props = $props();

    let isLoading: boolean = $state(false);
    let isSendButtonDisabled: boolean = $state(false);

    const handleFormError = (formError?: FormError): void => {
        if (!formError?.errors?.length) {
            return;
        }

        formError.errors.forEach((error: PageDataError) => {
            showToast(error.message, error.type);
        });

        if (formError.meta?.details) {
            console.error('Form submission details:', formError.meta.details);
        }

        onError?.(formError);
    };

    const submitHandler: SubmitFunction<Record<string, any>, Record<string, any>> = async ({ formData }) => {
        isLoading = true;

        // Call the custom handler to modify formData before submission
        if (onBeforeSubmit) {
            onBeforeSubmit(formData);
        }

        return async ({ result, update }) => {
            isLoading = false;
            if (result.type === 'failure') {
                await update({ reset: false });
                handleFormError(result.data as FormError | undefined);
            } else {
                await update();
            }
        };
    };

    $effect((): void => {
        isSendButtonDisabled = isLoading || !isValid;
    });

    $effect((): void => {
        if (!page.data.formError) {
            return;
        }

        handleFormError(page.data.formError);
        page.data.formError = undefined;
    });
</script>

{#if hasBackground}
    <FormBackground />
{/if}

<div class:mt-20={hasBackground} class={cn('relative flex items-center justify-center px-4', className)}>
    <Card class="w-full max-w-xl md:max-w-2xl">
        <form use:enhance={submitHandler} method="POST" enctype="multipart/form-data" class="flex flex-col gap-6">
            <CardHeader>
                {@render header?.()}
            </CardHeader>
            <CardContent>
                <div class="flex flex-col gap-6">
                    {@render children?.()}
                </div>
                {@render links?.()}
            </CardContent>

            {#if submittable}
                <CardFooter class="flex justify-center pt-2">
                    <Button type="submit" disabled={isSendButtonDisabled} loading={isLoading} size="lg" class="w-full max-w-xs sm:max-w-sm">
                        {#if submitContent}
                            {@render submitContent?.()}
                        {:else}
                            <p class="text-lg">{m['common.submit']()}</p>
                            <SendHorizontal class="size-5" />
                        {/if}
                    </Button>
                </CardFooter>
            {/if}
            {@render footer?.()}
        </form>
    </Card>
</div>
