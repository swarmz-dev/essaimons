<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { FieldLabel } from '#lib/components/forms';
    import { Button } from '#lib/components/ui/button';
    import { cn } from '#lib/utils';
    import type { Snippet } from 'svelte';
    import { m } from '#lib/paraglide/messages';

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
    let showHtmlSource = $state(false);
    let htmlSource = $state('');
    let htmlTextarea: HTMLTextAreaElement | null = null;

    const getPlainTextLength = (html: string): number => {
        if (!html) {
            return 0;
        }
        const template = document.createElement('template');
        template.innerHTML = html;
        return (template.content.textContent ?? '').trim().length;
    };

    const getHtmlLength = (html: string): number => {
        if (!html) {
            return 0;
        }
        return html.trim().length;
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

        // Add tooltips to toolbar buttons
        const toolbar = editorContainer.previousElementSibling;
        if (toolbar && toolbar.classList.contains('ql-toolbar')) {
            const tooltips: Record<string, string> = {
                '.ql-bold': m['common.rich-text-editor.tooltips.bold'](),
                '.ql-italic': m['common.rich-text-editor.tooltips.italic'](),
                '.ql-underline': m['common.rich-text-editor.tooltips.underline'](),
                '.ql-header': m['common.rich-text-editor.tooltips.header'](),
                '.ql-list[value="ordered"]': m['common.rich-text-editor.tooltips.list-ordered'](),
                '.ql-list[value="bullet"]': m['common.rich-text-editor.tooltips.list-bullet'](),
                '.ql-blockquote': m['common.rich-text-editor.tooltips.blockquote'](),
                '.ql-code-block': m['common.rich-text-editor.tooltips.code-block'](),
                '.ql-link': m['common.rich-text-editor.tooltips.link'](),
                '.ql-clean': m['common.rich-text-editor.tooltips.clean'](),
            };

            Object.entries(tooltips).forEach(([selector, title]) => {
                const element = toolbar.querySelector(selector);
                if (element) {
                    element.setAttribute('title', title);
                }
            });
        }

        const initialValue = value && value.trim().length > 0 && value !== '<p><br></p>' ? value : '<p><br></p>';
        quillInstance.clipboard.dangerouslyPasteHTML(initialValue, 'silent');
        if (!value || value.trim().length === 0) {
            value = initialValue;
        }
        lastValue = value;

        quillInstance.on('text-change', () => {
            const html = quillInstance.root.innerHTML;
            // Validate based on HTML length (matching backend validation)
            if (max && getHtmlLength(html) > max) {
                quillInstance.clipboard.dangerouslyPasteHTML(lastValue, 'silent');
                return;
            }
            lastValue = html;
            value = html;
        });

        // Handle paste without formatting (Ctrl+Shift+V or Cmd+Shift+V)
        quillInstance.root.addEventListener('paste', (e: ClipboardEvent) => {
            if (e.shiftKey) {
                e.preventDefault();
                const text = e.clipboardData?.getData('text/plain');
                if (text) {
                    const selection = quillInstance.getSelection();
                    if (selection) {
                        quillInstance.insertText(selection.index, text, 'user');
                        quillInstance.setSelection(selection.index + text.length);
                    }
                }
            }
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
    const htmlLength: number = $derived(getHtmlLength(value));
    const isNearLimit: boolean = $derived(max ? htmlLength / max > 0.9 : false);
    const isOverLimit: boolean = $derived(max ? htmlLength > max : false);

    const toggleHtmlSource = () => {
        if (!showHtmlSource) {
            // Switching to HTML view
            htmlSource = value;
            showHtmlSource = true;
            // Focus on textarea after it's rendered
            setTimeout(() => {
                htmlTextarea?.focus();
            }, 0);
        } else {
            // Switching back to visual editor
            // Check if HTML exceeds limit before applying
            if (max && getHtmlLength(htmlSource) > max) {
                // Revert to last valid value
                htmlSource = value;
            } else {
                value = htmlSource;
                lastValue = htmlSource;
            }
            showHtmlSource = false;

            // Update the Quill editor content
            if (quillInstance) {
                setTimeout(() => {
                    quillInstance.clipboard.dangerouslyPasteHTML(value, 'silent');
                }, 0);
            }
        }
    };
</script>

<FieldLabel forId={name} {label} {required} {info} class={className}>
    <input type="hidden" {name} {value} />
    <textarea name={`${name}-source`} bind:value class="sr-only absolute -left-[9999px] h-0 w-0 opacity-0" tabindex={-1} aria-hidden="true" {required}></textarea>

    <div class="rounded-2xl border border-white/60 bg-white/95 p-4 shadow-md backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/80" data-editor={name}>
        <div class="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <div class="flex items-center gap-3">
                <span>{isReady ? m['common.rich-text-editor.active-label']() : m['common.rich-text-editor.loading-label']()}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-auto px-2 py-1 text-xs"
                    onclick={toggleHtmlSource}
                    title={showHtmlSource ? m['common.rich-text-editor.toggle-visual']() : m['common.rich-text-editor.toggle-html']()}
                >
                    {showHtmlSource ? '👁️ Visuel' : '</> HTML'}
                </Button>
                <span class="text-xs text-amber-600 dark:text-amber-400">
                    💡 {m['common.rich-text-editor.paste-hint']()}
                </span>
            </div>
            <span class:text-amber-600={isNearLimit && !isOverLimit} class:text-red-600={isOverLimit} class="font-medium transition-colors">
                {htmlLength}{#if max}
                    / {max}{/if}
                {#if plainTextLength !== htmlLength}
                    <span class="ml-1 text-muted-foreground">({plainTextLength} texte)</span>
                {/if}
            </span>
        </div>
        <div class="min-h-[220px] rounded-xl border border-white/45 bg-white text-sm text-foreground dark:border-slate-800/70 dark:bg-slate-900/90" class:hidden={showHtmlSource}>
            <div bind:this={editorContainer}></div>
        </div>
        {#if showHtmlSource}
            <textarea
                bind:this={htmlTextarea}
                bind:value={htmlSource}
                class="min-h-[220px] w-full rounded-xl border border-white/45 bg-white p-3 font-mono text-sm text-foreground dark:border-slate-800/70 dark:bg-slate-900/90"
                placeholder="Code HTML..."
            ></textarea>
        {/if}
    </div>
</FieldLabel>
