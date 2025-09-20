<script lang="ts">
    import { browser } from '$app/environment';
    import { marked } from 'marked';
    import { Bold, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Quote } from '@lucide/svelte';
    import { Button } from '#lib/components/ui/button';
    import { Textarea } from '#lib/components/ui/textarea';
    import { FieldLabel } from '#lib/components/forms';

    type Props = {
        name: string;
        label: string;
        value?: string;
        placeholder?: string;
        required?: boolean;
        max?: number;
        info?: string;
        rows?: number;
        class?: string;
    };

    let { name, label, value = $bindable(''), placeholder, required = false, max = 1500, info, rows = 10, class: className }: Props = $props();

    let textareaRef: HTMLTextAreaElement | null = $state(null);
    let previewHtml = $state('');

    const currentLength: number = $derived(typeof value === 'string' ? value.length : 0);

    $effect(() => {
        if (!browser) {
            return;
        }
        previewHtml = sanitizeMarkdown(value);
    });

    $effect(() => {
        if (max && typeof value === 'string' && value.length > max) {
            value = value.slice(0, max);
        }
    });

    const insertFormatting = (prefix: string, suffix = '') => {
        if (!textareaRef) {
            return;
        }

        const start = textareaRef.selectionStart ?? value.length;
        const end = textareaRef.selectionEnd ?? value.length;
        const before = value.slice(0, start);
        const selection = value.slice(start, end);
        const after = value.slice(end);
        const selectedContent = selection || '';

        value = `${before}${prefix}${selectedContent}${suffix}${after}`;

        queueMicrotask(() => {
            if (!textareaRef) {
                return;
            }
            const cursor = start + prefix.length + selectedContent.length;
            textareaRef.setSelectionRange(cursor, cursor);
            textareaRef.focus();
        });
    };

    const insertHeading = () => {
        if (!textareaRef) {
            return;
        }

        const start = textareaRef.selectionStart ?? 0;
        const end = textareaRef.selectionEnd ?? start;
        const before = value.slice(0, start);
        const selection = value.slice(start, end);
        const after = value.slice(end);
        const lineStart = before.lastIndexOf('\n') + 1;
        const prefix = before.slice(lineStart, start).trimStart().startsWith('##') ? '' : '## ';

        value = `${before.slice(0, lineStart)}${prefix}${before.slice(lineStart, start)}${selection}${after}`;

        queueMicrotask(() => {
            if (!textareaRef) {
                return;
            }
            const cursor = start + prefix.length;
            textareaRef.setSelectionRange(cursor, cursor);
            textareaRef.focus();
        });
    };

    const insertLink = () => {
        if (!textareaRef) {
            return;
        }

        const start = textareaRef.selectionStart ?? value.length;
        const end = textareaRef.selectionEnd ?? value.length;
        const before = value.slice(0, start);
        const selection = value.slice(start, end) || 'texte';
        const after = value.slice(end);

        value = `${before}[${selection}](https://)`;

        queueMicrotask(() => {
            if (!textareaRef) {
                return;
            }
            const cursorStart = before.length + selection.length + 3;
            const cursorEnd = cursorStart + 8;
            textareaRef.setSelectionRange(cursorStart, cursorEnd);
            textareaRef.focus();
        });
    };

    const sanitizeMarkdown = (markdown: string): string => {
        const rawHtml = marked.parse(markdown, { breaks: true });

        if (!browser) {
            return typeof rawHtml === 'string' ? rawHtml : '';
        }

        const template = document.createElement('template');
        template.innerHTML = typeof rawHtml === 'string' ? rawHtml : '';

        const allowedTags = new Set(['a', 'p', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'br']);
        const allowedAttributes: Record<string, string[]> = {
            a: ['href', 'title', 'target', 'rel'],
        };

        const sanitizeNode = (node: Node): void => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                const tag = element.tagName.toLowerCase();

                if (!allowedTags.has(tag)) {
                    const textNode = document.createTextNode(element.textContent ?? '');
                    element.replaceWith(textNode);
                    return;
                }

                for (const attribute of [...element.attributes]) {
                    const isAllowed = allowedAttributes[tag]?.includes(attribute.name);
                    if (!isAllowed) {
                        element.removeAttribute(attribute.name);
                        continue;
                    }

                    if (attribute.name === 'href') {
                        if (!/^https?:\/\//i.test(attribute.value) && !/^mailto:/i.test(attribute.value)) {
                            element.removeAttribute(attribute.name);
                        } else {
                            element.setAttribute('rel', 'noopener noreferrer');
                            element.setAttribute('target', '_blank');
                        }
                    }
                }
            }

            for (const child of [...node.childNodes]) {
                sanitizeNode(child);
            }
        };

        sanitizeNode(template.content);
        return template.innerHTML;
    };

    const toolbarButtonClass =
        'h-9 w-9 rounded-xl border border-transparent bg-white/70 text-foreground/80 shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-slate-900/70';
</script>

<FieldLabel forId={name} {label} {required} {info} class={className}>
    <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
            <Button type="button" size="icon" variant="ghost" class={toolbarButtonClass} onclick={() => insertFormatting('**', '**')} aria-label="Mettre en gras">
                <Bold class="size-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" class={toolbarButtonClass} onclick={() => insertFormatting('*', '*')} aria-label="Mettre en italique">
                <Italic class="size-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" class={toolbarButtonClass} onclick={insertHeading} aria-label="Ajouter un titre">
                <Heading2 class="size-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" class={toolbarButtonClass} onclick={() => insertFormatting('> ', '')} aria-label="Ajouter une citation">
                <Quote class="size-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" class={toolbarButtonClass} onclick={() => insertFormatting('- ', '')} aria-label="Ajouter une liste">
                <List class="size-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" class={toolbarButtonClass} onclick={() => insertFormatting('1. ', '')} aria-label="Ajouter une liste numérotée">
                <ListOrdered class="size-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" class={toolbarButtonClass} onclick={insertLink} aria-label="Ajouter un lien">
                <LinkIcon class="size-4" />
            </Button>
            <p class="ml-auto text-xs text-muted-foreground">{currentLength} / {max}</p>
        </div>
        <Textarea {name} bind:value {rows} {placeholder} {max} bind:ref={textareaRef} counter={false} {required} />
        <div class="rounded-2xl border border-white/40 bg-white/80 p-4 text-sm leading-relaxed text-foreground shadow-inner backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/70">
            {#if browser}
                {@html previewHtml}
            {:else}
                <p class="text-muted-foreground text-sm">{value}</p>
            {/if}
        </div>
    </div>
</FieldLabel>
