<script lang="ts">
    import { enhance } from '$app/forms';
    import Icon from '#components/Icon.svelte';
    import { m } from '#lib/paraglide/messages';
    import FormBackground from '#components/background/FormBackground.svelte';
    import { Button } from '#lib/components/ui/button';
    import { SendHorizontal } from '@lucide/svelte';
    import { Card, CardHeader, CardContent, CardFooter } from '#lib/components/ui/card/index';
    import { page } from '$app/state';
    import type { PageDataError } from '../app';
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
        isValid?: boolean;
        submittable?: boolean;
        hasBackground?: boolean;
        class?: string;
    };

    let { children, header, links, footer, onError, isValid = false, submittable = true, hasBackground = true, submitContent, class: className }: Props = $props();

    let isLoading: boolean = $state(false);
    let isSendButtonDisabled: boolean = $state(false);

    $effect((): void => {
        isSendButtonDisabled = isLoading || !isValid;
    });

    $effect((): void => {
        if (!page.data.formError) {
            return;
        }
        page.data.formError?.errors.forEach((error: PageDataError) => {
            showToast(error.message, error.type);
        });
        page.data.formError = undefined;
        onError?.();
    });
</script>

{#if hasBackground}
    <FormBackground />
{/if}

<div class:mt-20={hasBackground} class={cn('flex items-center justify-center', className)}>
    <Card class="w-10/12 sm:w-lg">
        <form use:enhance method="POST" enctype="multipart/form-data" class="z-10 flex flex-col gap-3">
            <CardHeader>
                {@render header?.()}
            </CardHeader>
            <CardContent>
                <div class="flex flex-col gap-8">
                    {@render children?.()}
                </div>
                {@render links?.()}
            </CardContent>

            {#if submittable}
                <CardFooter class="flex justify-center">
                    <Button type="submit" disabled={isSendButtonDisabled} size="lg" class="w-md">
                        {#if isLoading}
                            <Icon name="spinner" size={40} />
                        {:else if submitContent}
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
