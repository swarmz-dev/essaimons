<script lang="ts">
    import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#lib/components/ui/dialog';
    import { Button } from '#lib/components/ui/button';
    import { Textarea } from '#lib/components/ui/textarea';
    import { m } from '#lib/paraglide/messages';
    import { wrappedFetch } from '#lib/services/requestService';
    import { showToast } from '#lib/services/toastService';
    import { ContentReportReasonEnum, ContentTypeEnum } from 'backend/types';
    import { Loader2 } from '@lucide/svelte';

    let {
        open = $bindable(false),
        contentType,
        contentId,
        contentDescription = '',
    }: {
        open?: boolean;
        contentType: ContentTypeEnum;
        contentId: string;
        contentDescription?: string;
    } = $props();

    let selectedReason = $state<ContentReportReasonEnum>(ContentReportReasonEnum.SPAM);
    let description = $state('');
    let isSubmitting = $state(false);

    const reasons = [
        { value: ContentReportReasonEnum.SPAM, label: m['report.reason-spam']() },
        { value: ContentReportReasonEnum.HARASSMENT, label: m['report.reason-harassment']() },
        { value: ContentReportReasonEnum.INAPPROPRIATE, label: m['report.reason-inappropriate']() },
        { value: ContentReportReasonEnum.OTHER, label: m['report.reason-other']() },
    ];

    async function handleSubmit() {
        isSubmitting = true;

        try {
            const result = await wrappedFetch('/reports', {
                method: 'POST',
                body: {
                    contentType,
                    contentId,
                    reason: selectedReason,
                    description: description.trim() || undefined,
                },
            });

            if (result.isSuccess) {
                // Show success toast
                showToast(m['report.success-description'](), 'success');
            } else {
                let errorMessage = m['report.error-default']();

                if (result.errors && Array.isArray(result.errors)) {
                    errorMessage = result.errors.map((e: any) => e.message).join(', ');
                } else if (result.error && typeof result.error === 'string') {
                    errorMessage = result.error;
                }

                showToast(errorMessage, 'error');
            }

            // Close modal in both success and error cases
            open = false;
        } catch (error) {
            showToast(m['report.error-default'](), 'error');
        } finally {
            isSubmitting = false;
        }
    }

    function resetForm() {
        selectedReason = ContentReportReasonEnum.SPAM;
        description = '';
    }

    $effect(() => {
        // Reset form when dialog closes
        if (!open) {
            resetForm();
        }
    });
</script>

<Dialog bind:open>
    <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
            <DialogTitle>{m['report.dialog-title']()}</DialogTitle>
            <DialogDescription>
                {m['report.dialog-description']()}
                {#if contentDescription}
                    <span class="mt-2 block text-sm italic">{contentDescription}</span>
                {/if}
            </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
            <div class="space-y-3">
                <p class="text-sm font-medium text-foreground">{m['report.reason-label']()}</p>
                <div class="space-y-2">
                    {#each reasons as reason}
                        <label
                            class="relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 hover:bg-muted/50 transition-colors {selectedReason ===
                            reason.value
                                ? 'ring-2 ring-primary'
                                : ''}"
                        >
                            <input type="radio" name="report-reason" value={reason.value} bind:group={selectedReason} class="sr-only" />
                            <div class="flex size-4 items-center justify-center rounded-full border-2 {selectedReason === reason.value ? 'border-primary' : 'border-border'}">
                                {#if selectedReason === reason.value}
                                    <div class="size-2 rounded-full bg-primary"></div>
                                {/if}
                            </div>
                            <span class="text-sm font-normal text-foreground">
                                {reason.label}
                            </span>
                        </label>
                    {/each}
                </div>
            </div>

            <div class="space-y-2">
                <label for="description" class="text-sm font-medium text-foreground">{m['report.description-label']()}</label>
                <Textarea id="description" bind:value={description} placeholder={m['report.description-placeholder']()} rows={4} disabled={isSubmitting} />
                <p class="text-xs text-muted-foreground">{m['report.description-hint']()}</p>
            </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onclick={() => (open = false)} disabled={isSubmitting}>
                {m['common.cancel']()}
            </Button>
            <Button onclick={handleSubmit} disabled={isSubmitting}>
                {#if isSubmitting}
                    <Loader2 class="mr-2 size-4 animate-spin" />
                {/if}
                {m['report.submit']()}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
