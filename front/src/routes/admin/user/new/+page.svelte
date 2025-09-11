<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import { Breadcrumb } from '#lib/components/ui/breadcrumb';
    import AdminUserForm from '#lib/partials/admin/user/AdminUserForm.svelte';
</script>

<Title title={m['admin.user.new.title']()} />

<Breadcrumb items={[{ title: m['admin.title'](), href: '/admin' }, { title: m['admin.user.title'](), href: '/admin/user' }, { title: m['admin.user.new.title']() }]} />

<AdminUserForm />
