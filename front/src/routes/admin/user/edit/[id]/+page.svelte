<script lang="ts">
    import { page } from '$app/state';
    import { Title } from '#lib/components/ui/title';
    import { Breadcrumb } from '$lib/components/ui/breadcrumb';
    import { m } from '#lib/paraglide/messages';
    import AdminUserForm from '#lib/partials/admin/user/AdminUserForm.svelte';
</script>

<Title title={page.data.user.username} />

<Breadcrumb items={[{ title: m['admin.title'](), href: '/admin' }, { title: m['admin.user.title'](), href: '/admin/user' }, { title: page.data.user.username }]} />

<AdminUserForm user={page.data.user} />
