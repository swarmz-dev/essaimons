<script lang="ts">
    import { navigate } from '#lib/stores/locationStore';
    import { clearProfile } from '#lib/stores/profileStore';
    import { m } from '#lib/paraglide/messages';
    import { Title } from '#lib/components/ui/title';
    import {
        AlertDialog,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
        AlertDialogAction,
    } from '#lib/components/ui/alert-dialog';
    import Meta from '#components/Meta.svelte';
    import { wrappedFetch } from '#lib/services/requestService';

    const handleConfirm = async (): Promise<void> => {
        await wrappedFetch(
            '/logout',
            {
                method: 'POST',
            },
            () => {
                clearProfile();
                navigate('/login');
            },
            () => navigate('/login')
        );
    };

    const handleClose = (): void => {
        navigate('/');
    };
</script>

<Meta title={m['logout.meta.title']()} description={m['logout.meta.description']()} keywords={m['logout.meta.keywords']().split(', ')} pathname="/logout" />

<Title title={m['logout.title']()} />

<AlertDialog open={true} onOpenChange={handleClose}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>{m['logout.modal.title']()}</AlertDialogTitle>
            <AlertDialogDescription>{m['logout.modal.text']()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>{m['common.cancel']()}</AlertDialogCancel>
            <AlertDialogAction onclick={handleConfirm}>{m['common.continue']()}</AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
