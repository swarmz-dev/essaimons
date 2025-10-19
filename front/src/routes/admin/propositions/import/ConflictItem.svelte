<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { Input } from '#lib/components/ui/input';
    import { m } from '#lib/paraglide/messages';
    import type { ImportConflict, ConflictResolution, ResolutionOption } from 'backend/types';

    interface Props {
        conflict: ImportConflict;
        conflictIndex: number;
        onResolve: (conflictIndex: number, resolution: ConflictResolution) => void;
    }

    let { conflict, conflictIndex, onResolve }: Props = $props();

    let selectedStrategy = $state<string | null>(null);
    let selectedOption = $state<string | null>(null);
    let createData = $state<Record<string, any>>({});
    let fieldResolutions = $state<Array<{ field: string; action: string }>>([]);
    let isResolved = $state(false);

    const handleResolve = () => {
        if (!selectedStrategy) {
            return;
        }

        const resolution: ConflictResolution = {
            conflictIndex,
            strategy: selectedStrategy as any,
            mappedId: selectedOption ?? undefined,
            createData: Object.keys(createData).length > 0 ? createData : undefined,
            fieldResolutions: fieldResolutions.length > 0 ? fieldResolutions : undefined,
        };

        onResolve(conflictIndex, resolution);
        isResolved = true;
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'ERROR':
                return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
            case 'WARNING':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
            default:
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
        }
    };

    const getConflictTypeLabel = (type: string) => {
        return m[`admin.propositions.import.conflict.type.${type.toLowerCase()}`]?.() ?? type;
    };

    const findResolutionOption = (strategy: string): ResolutionOption | undefined => {
        return conflict.resolutions.find((r) => r.strategy === strategy);
    };

    $effect(() => {
        // Initialize field resolutions for merge strategy
        if (selectedStrategy === 'MERGE') {
            const option = findResolutionOption('MERGE');
            if (option?.preview?.changes) {
                fieldResolutions = option.preview.changes.map((change) => ({
                    field: change.field,
                    action: 'KEEP_INCOMING',
                }));
            }
        }
    });
</script>

<div class="rounded-lg border {isResolved ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-muted'}">
    <div class="p-4 space-y-4">
        <!-- Header -->
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center gap-2">
                    <span class="rounded-full px-2 py-1 text-xs font-medium {getSeverityColor(conflict.severity)}">
                        {conflict.severity}
                    </span>
                    <h4 class="font-medium">{getConflictTypeLabel(conflict.type)}</h4>
                </div>
                {#if conflict.message}
                    <p class="mt-1 text-sm text-muted-foreground">{conflict.message}</p>
                {/if}
                <div class="mt-2 rounded bg-muted p-2 text-sm">
                    <pre class="overflow-x-auto">{JSON.stringify(conflict.reference, null, 2)}</pre>
                </div>
            </div>
            {#if isResolved}
                <span class="text-green-600 dark:text-green-400">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </span>
            {/if}
        </div>

        <!-- Resolution Options -->
        {#if !isResolved}
            <div class="space-y-4">
                <div>
                    <label class="text-sm font-medium">{m['admin.propositions.import.conflict.resolution']()}</label>
                    <div class="mt-2 space-y-2">
                        {#each conflict.resolutions as resolutionOption}
                            <label class="flex items-start space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                                <input type="radio" name="strategy-{conflictIndex}" value={resolutionOption.strategy} bind:group={selectedStrategy} class="mt-1" />
                                <div class="flex-1">
                                    <p class="font-medium">{resolutionOption.label}</p>

                                    <!-- Options for MAP_EXISTING -->
                                    {#if selectedStrategy === resolutionOption.strategy && resolutionOption.strategy === 'MAP_EXISTING' && resolutionOption.options}
                                        <div class="mt-2">
                                            <select
                                                bind:value={selectedOption}
                                                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                <option value={null}>{m['admin.propositions.import.conflict.select_option']()}</option>
                                                {#each resolutionOption.options as option}
                                                    <option value={option.id}>{option.label}</option>
                                                {/each}
                                            </select>
                                        </div>
                                    {/if}

                                    <!-- Fields for CREATE_NEW -->
                                    {#if selectedStrategy === resolutionOption.strategy && resolutionOption.strategy === 'CREATE_NEW' && resolutionOption.requiresInput && resolutionOption.fields}
                                        <div class="mt-2 space-y-2">
                                            {#each resolutionOption.fields as field}
                                                <Input
                                                    type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                                                    placeholder={m[`common.${field}`]?.() ?? field}
                                                    bind:value={createData[field]}
                                                />
                                            {/each}
                                        </div>
                                    {/if}

                                    <!-- Field resolutions for MERGE -->
                                    {#if selectedStrategy === resolutionOption.strategy && resolutionOption.strategy === 'MERGE' && resolutionOption.preview?.changes}
                                        <div class="mt-2 space-y-2">
                                            <p class="text-sm font-medium">{m['admin.propositions.import.conflict.merge_fields']()}</p>
                                            {#each resolutionOption.preview.changes as change, idx}
                                                <div class="rounded-lg border p-2 text-sm">
                                                    <p class="font-medium">{change.field}</p>
                                                    <div class="mt-1 grid grid-cols-2 gap-2">
                                                        <div>
                                                            <p class="text-xs text-muted-foreground">{m['admin.propositions.import.conflict.current']()}</p>
                                                            <p class="truncate">{JSON.stringify(change.current)}</p>
                                                        </div>
                                                        <div>
                                                            <p class="text-xs text-muted-foreground">{m['admin.propositions.import.conflict.incoming']()}</p>
                                                            <p class="truncate">{JSON.stringify(change.incoming)}</p>
                                                        </div>
                                                    </div>
                                                    <div class="mt-2">
                                                        <select
                                                            bind:value={fieldResolutions[idx].action}
                                                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                        >
                                                            <option value="KEEP_INCOMING">{m['admin.propositions.import.conflict.keep_incoming']()}</option>
                                                            <option value="KEEP_CURRENT">{m['admin.propositions.import.conflict.keep_current']()}</option>
                                                            <option value="MERGE_BOTH">{m['admin.propositions.import.conflict.merge_both']()}</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            </label>
                        {/each}
                    </div>
                </div>

                <Button onclick={handleResolve} disabled={!selectedStrategy} size="sm">
                    {m['admin.propositions.import.conflict.apply']()}
                </Button>
            </div>
        {/if}
    </div>
</div>
