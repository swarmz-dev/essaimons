<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { FieldLabel } from '#lib/components/forms';
    import { Button } from '#lib/components/ui/button';
    import { cn } from '#lib/utils';
    import type { Snippet } from 'svelte';

    import 'quill/dist/quill.snow.css';

    type Props = {
        name: string;
        label: string;
        value?: string;
        placeholder?: string;
        required?: boolean;
        max?: number;
        info?: string;
        class?: string;
    };

    let { name, label, value = $bindable(''), placeholder, required = false, max, info, class: className }: Props = $props();

    let editorContainer: HTMLDivElement | null = null;
    let quillInstance: any;
    let isReady = $state(false);
    let lastValue = '';

    const getPlainTextLength = (html: string): number => {
        if (!html) {
            return 0;
        }
        const template = document.createElement('template');
        template.innerHTML = html;
        return (template.content.textContent ?? '').trim().length;
    };

    const initializeQuill = async () => {
        const QuillModule = await import('quill');
        const Quill = QuillModule.default;

        if (!editorContainer) {
            return;
        }

        quillInstance = new Quill(editorContainer, {
            theme: 'snow',
            placeholder,
            modules: {
                toolbar: [['bold', 'italic', 'underline'], [{ header: [1, 2, 3, false] }], [{ list: 'ordered' }, { list: 'bullet' }], ['blockquote', 'code-block'], ['link'], ['clean']],
            },
        });

        const initialValue = value && value.trim().length ? value : '<p><br></p>';
        quillInstance.clipboard.dangerouslyPasteHTML(initialValue, 'silent');
        value = initialValue;
        lastValue = initialValue;

        quillInstance.on('text-change', () => {
            const html = quillInstance.root.innerHTML;
            if (max && getPlainTextLength(html) > max) {
                quillInstance.clipboard.dangerouslyPasteHTML(lastValue, 'silent');
                return;
            }
            lastValue = html;
            value = html;
        });

        isReady = true;
    };

    onMount(() => {
        initializeQuill();
        return () => {
            quillInstance = null;
        };
    });

    onDestroy(() => {
        quillInstance = null;
    });

    const plainTextLength: number = $derived(getPlainTextLength(value));
</script>

<FieldLabel forId={name} {label} {required} {info} class={className}>
    <input type="hidden" {name} {value} />
    <textarea name={`${name}-source`} bind:value class="sr-only absolute -left-[9999px] h-0 w-0 opacity-0" tabindex={-1} aria-hidden="true" {required}></textarea>

    <div class="rounded-2xl border border-white/60 bg-white/95 p-4 shadow-md backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/80" data-editor={name}>
        <div class="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{isReady ? 'Éditeur HTML actif' : 'Chargement de l’éditeur...'}</span>
            <span>
                {plainTextLength}{#if max}
                    / {max}{/if}
            </span>
        </div>
        <div class="min-h-[220px] rounded-xl border border-white/45 bg-white text-sm text-foreground dark:border-slate-800/70 dark:bg-slate-900/90">
            <div bind:this={editorContainer}></div>
        </div>
    </div>
</FieldLabel>
