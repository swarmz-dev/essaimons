<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import AdminLanguageForm from '#lib/partials/admin/language/AdminLanguageForm.svelte';
    import { Breadcrumb } from '#lib/components/ui/breadcrumb';
</script>

<Title title={m['admin.language.new.title']()} />

<Breadcrumb items={[{ title: m['admin.title'](), href: '/admin' }, { title: m['admin.language.title'](), href: '/admin/language' }, { title: m['admin.language.new.title']() }]} />

<AdminLanguageForm />
