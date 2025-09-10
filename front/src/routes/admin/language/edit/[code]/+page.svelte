<script lang="ts">
    import { page } from '$app/state';
    import AdminLanguageForm from '#lib/partials/admin/language/AdminLanguageForm.svelte';
    import { Title } from '#lib/components/ui/title';
    import { Breadcrumb } from '$lib/components/ui/breadcrumb';
    import { m } from '#lib/paraglide/messages';
</script>

<Title title={page.data.language.name} />

<Breadcrumb items={[{ title: m['admin.title'](), href: '/admin' }, { title: m['admin.language.title'](), href: '/admin/language' }, { title: page.data.language.name }]} />

<AdminLanguageForm language={page.data.language} />
