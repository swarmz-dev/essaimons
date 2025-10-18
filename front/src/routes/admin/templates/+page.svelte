<script lang="ts">
    import { onMount } from 'svelte';
    import { Title } from '#lib/components/ui/title';
    import { Button } from '#lib/components/ui/button';
    import { Card, CardContent } from '#lib/components/ui/card';
    import Tabs, { type TabItem } from '#lib/components/ui/tabs/Tabs.svelte';
    import { m } from '#lib/paraglide/messages';
    import { Mail, Edit, Save, X } from '@lucide/svelte';
    import { showToast } from '#lib/services/toastService';
    import { PUBLIC_API_REAL_URI } from '$env/static/public';

    interface EmailTemplate {
        id: string;
        key: string;
        name: string;
        description: string | null;
        subjects: Record<string, string>;
        htmlContents: Record<string, string>;
        textContents: Record<string, string>;
        isActive: boolean;
    }

    let templates = $state<EmailTemplate[]>([]);
    let loading = $state(true);
    let editingId = $state<string | null>(null);
    let editForm = $state<Partial<EmailTemplate>>({});
    let activeLanguage = $state<string>('en');

    const languageTabs: TabItem[] = [
        { id: 'en', label: 'English' },
        { id: 'fr', label: 'Français' },
    ];

    onMount(async () => {
        await loadTemplates();
    });

    function getCookie(name: string): string | null {
        if (typeof window === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    }

    async function loadTemplates() {
        try {
            const token = getCookie('client_token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${PUBLIC_API_REAL_URI}/api/admin/email-templates`, {
                credentials: 'include',
                headers,
            });
            const data = await response.json();
            templates = data.data.templates;
        } catch (error) {
            showToast('Failed to load email templates', 'error');
        } finally {
            loading = false;
        }
    }

    function startEdit(template: EmailTemplate) {
        editingId = template.id;
        editForm = JSON.parse(JSON.stringify(template)); // Deep copy
        // Ensure objects exist
        editForm.subjects = editForm.subjects || {};
        editForm.htmlContents = editForm.htmlContents || {};
        editForm.textContents = editForm.textContents || {};
        activeLanguage = 'en';
    }

    function cancelEdit() {
        editingId = null;
        editForm = {};
        activeLanguage = 'en';
    }

    function handleLanguageChange(lang: string) {
        activeLanguage = lang;
    }

    async function saveTemplate() {
        if (!editingId) return;

        try {
            const token = getCookie('client_token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${PUBLIC_API_REAL_URI}/api/admin/email-templates/${editingId}`, {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify(editForm),
            });

            if (!response.ok) throw new Error('Failed to save');

            await loadTemplates();
            showToast('Template saved successfully', 'success');
            cancelEdit();
        } catch (error) {
            showToast('Failed to save template', 'error');
        }
    }
</script>

<Title title={m['admin.email_templates.title']()} hasBackground />

<div class="space-y-6">
    <p class="text-sm text-muted-foreground">
        {m['admin.email_templates.description']()}
    </p>

    {#if loading}
        <p>Loading...</p>
    {:else}
        {#each templates as template (template.id)}
            <Card class="bg-white/80 shadow-lg dark:bg-slate-950/70">
                <CardContent class="p-6">
                    {#if editingId === template.id}
                        <!-- Edit Mode -->
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-semibold">{m['admin.email_templates.editing']()}: {template.name}</h3>
                                <div class="flex gap-2">
                                    <Button size="sm" variant="outline" onclick={cancelEdit}>
                                        <X class="mr-2 size-4" />
                                        {m['common.cancel']()}
                                    </Button>
                                    <Button size="sm" onclick={saveTemplate}>
                                        <Save class="mr-2 size-4" />
                                        {m['common.save']()}
                                    </Button>
                                </div>
                            </div>

                            <!-- Language Tabs -->
                            <Tabs items={languageTabs} bind:value={activeLanguage} ariaLabel="Select language for template editing" onchange={handleLanguageChange} />

                            <div class="space-y-4">
                                <div>
                                    <label class="text-sm font-medium">
                                        {m['admin.email_templates.subject']()} ({activeLanguage.toUpperCase()})
                                    </label>
                                    <input type="text" bind:value={editForm.subjects![activeLanguage]} class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                                </div>

                                <div>
                                    <label class="text-sm font-medium">
                                        {m['admin.email_templates.html_content']()} ({activeLanguage.toUpperCase()})
                                    </label>
                                    <textarea
                                        bind:value={editForm.htmlContents![activeLanguage]}
                                        rows="15"
                                        class="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                                    ></textarea>
                                    <p class="mt-1 text-xs text-muted-foreground">
                                        {m['admin.email_templates.variables_help']()}
                                    </p>
                                </div>

                                <div>
                                    <label class="text-sm font-medium">
                                        {m['admin.email_templates.text_content']()} ({activeLanguage.toUpperCase()})
                                    </label>
                                    <textarea
                                        bind:value={editForm.textContents![activeLanguage]}
                                        rows="8"
                                        class="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    {:else}
                        <!-- View Mode -->
                        <div class="space-y-4">
                            <div class="flex items-start justify-between">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <Mail class="size-5 text-primary" />
                                        <h3 class="text-lg font-semibold">{template.name}</h3>
                                    </div>
                                    {#if template.description}
                                        <p class="mt-1 text-sm text-muted-foreground">{template.description}</p>
                                    {/if}
                                    <p class="mt-2 text-xs text-muted-foreground">
                                        {m['admin.email_templates.key']()}:
                                        <code class="rounded bg-muted px-1 py-0.5">{template.key}</code>
                                    </p>
                                </div>
                                <Button size="sm" variant="outline" onclick={() => startEdit(template)}>
                                    <Edit class="mr-2 size-4" />
                                    {m['common.edit']()}
                                </Button>
                            </div>

                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div class="rounded-lg bg-muted/30 p-4">
                                    <p class="text-sm font-medium">English {m['admin.email_templates.subject']()}:</p>
                                    <p class="mt-1 text-sm text-muted-foreground">{template.subjects.en}</p>
                                </div>
                                <div class="rounded-lg bg-muted/30 p-4">
                                    <p class="text-sm font-medium">Français {m['admin.email_templates.subject']()}:</p>
                                    <p class="mt-1 text-sm text-muted-foreground">{template.subjects.fr}</p>
                                </div>
                            </div>
                        </div>
                    {/if}
                </CardContent>
            </Card>
        {/each}
    {/if}
</div>
